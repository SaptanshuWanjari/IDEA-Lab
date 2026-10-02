import { test, expect } from '@playwright/test';

/**
 * Single-bank pilot workflow (Task 11).
 *
 * Key journey: evidence submission does NOT show Completed until a
 * different approver accepts; source-first review UI (quote/page,
 * obligation fields, extraction quality, reviewer rationale); plan
 * diff + supersession confirmation; explicit review states.
 *
 * Runs against mocked API responses — no backend required. The
 * data-testid selectors asserted here do not exist in the pre-Task-11
 * UI, so this spec FAILS against the old UI and PASSES after it.
 */
if (process.env.SKIP_E2E === '1') test.skip(true, 'SKIP_E2E=1');

const APP = 'http://localhost:8443';
const API = 'http://localhost:8000';

const reviewer = { id: 'u-reviewer', email: 'reviewer@example.com', role: 'compliance_officer' };
const reg = {
  id: 'reg-1', title: 'Test RBI Circular', source_pdf_url: '', status: 'Active',
  summary: 'Test summary', created_at: new Date().toISOString(),
};
const map = {
  id: 'map-1', regulation_id: 'reg-1', owner_department_id: null,
  description: 'File quarterly compliance return', deadline: null, status: 'In Progress',
  approval_state: 'Review', confidence: 0.82, reasoning: 'Derived from clause C-1',
  source_clauses: ['C-1'], evidence_required: ['Board-approved return'], estimated_days: 5,
  created_at: new Date().toISOString(),
};
const obligation = {
  id: 'ob-1', regulation_version_id: 'reg-1', clause_id: 'C-1',
  quote: 'The bank shall file the return within 30 days of quarter end.',
  page: 4, obligation_text: 'File quarterly return within 30 days',
  deadline_kind: 'days', deadline_value: 30, deadline_unit: 'days',
  deadline_anchor: 'quarter end', owner_hint: 'Compliance',
  status: 'DRAFT', reviewer_rationale: null,
};
const sim = {
  median_completion_days: 10, p90_completion_days: 20, optimistic_completion_days: 5,
  pessimistic_completion_days: 30, iterations: 100, bottleneck_department: 'Compliance',
  bottleneck_frequency_pct: 40, department_workloads: { Compliance: 5 },
};

async function mockPilotApi(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    // Route UploadModal file picking through the Electron path with a fake file.
    (window as unknown as { electronAPI: unknown }).electronAPI = {
      openFileDialog: async () => ({ filePath: '/tmp/evidence.pdf', fileName: 'evidence.pdf' }),
      readFile: async () => new ArrayBuffer(16),
    };
  });
  await page.route(`${API}/auth/logout`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route(`${API}/auth/me`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reviewer) }));
  await page.route(`${API}/regulations/`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([reg]) }));
  await page.route(`${API}/regulations/reg-1`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reg) }));
  await page.route(`${API}/regulations/reg-1/obligations`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([obligation]) }));
  await page.route(`${API}/regulations/reg-1/simulate`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sim) }));
  await page.route(`${API}/regulations/reg-1/graph`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ nodes: [], edges: [], critical_path: [], topological_order: [] }) }));
  await page.route(`${API}/maps/?regulation_id=reg-1`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([map]) }));
  await page.route(`${API}/maps/`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([map]) }));
  await page.route(`${API}/maps/map-1`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(map) }));
  await page.route(`${API}/regulations/reg-1/obligations/ob-1/review`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ obligation: { ...obligation, status: 'APPROVED' } }) }));
  await page.route(`${API}/maps/map-1/complete`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ evidence_id: 'ev-1' }) }));
  await page.route(`${API}/maps/evidence/ev-1/approve`, r =>
    r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ id: 'as-1', evidence_id: 'ev-1', map_id: 'map-1', decision: 'APPROVED', assessor_id: 'u-reviewer', submitter_id: 'u-maker', rationale: null, bank_id: null, legal_entity_id: null, created_at: new Date().toISOString() }),
    }));
  await page.route(`${API}/maps/plans/plan-new/diff*`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ previous_id: 'plan-old', candidate_id: 'plan-new', added: ['ob-1'], removed: [], unchanged: [] }) }));
  await page.route(`${API}/maps/plans/plan-new/approve`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'plan-new', regulation_version_id: 'reg-1', version_number: 2, status: 'APPROVED', bank_id: null, legal_entity_id: null, created_by: 'u-maker', approved_by: 'u-reviewer', rationale: null, owner_department_id: null, due_date_basis: null }) }));
}

test.describe('pilot review workflow', () => {
  test('evidence submit shows awaiting approval, never Completed until approver accepts', async ({ page }) => {
    await mockPilotApi(page);
    await page.goto(APP);
    await expect(page.locator('text=Digital Compliance Twin').first()).toBeVisible({ timeout: 20000 });

    // Link uploads to map-1 via the MAP's own Upload Evidence entry point
    // (sidebar navigation clears the selection, so go through map-review).
    await page.locator('button[title="MAP Tasks"]').click();
    await page.locator('text=File quarterly compliance return').first().click();
    await page.getByRole('button', { name: 'Upload Evidence' }).click();
    await expect(page.locator('text=Uploading evidence for MAP')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Upload Evidence' }).click();
    await page.locator('text=Click to pick a file').click();
    await page.locator('text=Submit Evidence').click();

    // Submit lands in "awaiting approval" — never a green Completed badge.
    await expect(page.locator('[data-testid="upload-awaiting-approval"]')).toBeVisible({ timeout: 10000 });
    // Close the modal via the × button.
    await page.locator('button:has-text("×")').first().click();

    const item = page.locator('[data-testid="session-upload"]');
    await expect(item).toBeVisible();
    await expect(item.locator('[data-testid="evidence-state"]')).toHaveAttribute('data-state', 'file-submitted');
    await expect(page.locator('[data-testid="evidence-state"][data-state="completed"]')).toHaveCount(0);
    await expect(item.locator('[data-testid="no-premature-completion"]')).toBeVisible();

    // A different approver approves → state becomes approved, still not completed.
    await item.locator('[data-testid="approve-evidence"]').click();
    await expect(item.locator('[data-testid="evidence-state"]')).toHaveAttribute('data-state', 'approved', { timeout: 10000 });
    await expect(page.locator('[data-testid="evidence-state"][data-state="completed"]')).toHaveCount(0);
  });

  test('obligation review shows source citation and approves with rationale', async ({ page }) => {
    await mockPilotApi(page);
    await page.goto(APP);
    await expect(page.locator('text=Digital Compliance Twin').first()).toBeVisible({ timeout: 20000 });

    await page.locator('button[title="Regulations"]').click();
    await page.locator('text=Test RBI Circular').first().click();

    const card = page.locator('[data-testid="obligation-review"]');
    await expect(card).toBeVisible({ timeout: 10000 });
    await expect(card.locator('[data-testid="citation-quote"]')).toContainText('file the return within 30 days');
    await expect(card.locator('[data-testid="citation-page"]')).toContainText('p. 4');
    await card.locator('[data-testid="obligation-rationale"]').fill('Quote verified against page 4.');
    await card.locator('[data-testid="approve-obligation"]').click();
    await expect(page.locator('text=Obligation approved')).toBeVisible({ timeout: 10000 });
  });

  test('plan diff requires supersession confirmation before approval', async ({ page }) => {
    await mockPilotApi(page);
    await page.goto(APP);
    await expect(page.locator('text=Digital Compliance Twin').first()).toBeVisible({ timeout: 20000 });

    await page.locator('button[title="MAP Tasks"]').click();
    await page.locator('text=File quarterly compliance return').first().click();

    await page.locator('[data-testid="plan-candidate-input"]').fill('plan-new');
    await page.locator('[data-testid="plan-previous-input"]').fill('plan-old');
    await page.locator('[data-testid="load-plan-diff"]').click();

    const diff = page.locator('[data-testid="plan-diff"]');
    await expect(diff).toBeVisible({ timeout: 10000 });
    const approveBtn = diff.locator('[data-testid="approve-plan"]');
    await expect(approveBtn).toBeDisabled();
    await diff.locator('[data-testid="supersession-confirm"]').check();
    await expect(approveBtn).toBeEnabled();
    await approveBtn.click();
    await expect(page.locator('text=Plan approved').first()).toBeVisible({ timeout: 10000 });
  });
});
