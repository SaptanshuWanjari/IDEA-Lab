import manifest from "../data/bank-demo.json"

export interface BankDemoPolicy {
  id: string
  file: string
  linked_regulation: string
  owner_dept: string
  version: string
  title: string
  excerpt: string
}

const policies: BankDemoPolicy[] =
  (manifest as { policies: BankDemoPolicy[] }).policies ?? []

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Distinctive prefix of a regulation slug (drops trailing year segment, e.g. `-2026`). */
function slugCore(slug: string): string {
  return slug.replace(/-\d{4}$/, "")
}

function matchesPolicy(policy: BankDemoPolicy, candidate: string): boolean {
  const c = slugify(candidate)
  if (!c) return false
  const linked = slugify(policy.linked_regulation)
  const pid = slugify(policy.id)
  // Exact slug match either direction
  if (c === linked || c.includes(linked) || linked.includes(c)) return true
  // Core match ignoring year suffix ("kyc-aml" matches "rbi-kyc-aml-directions-2026")
  const core = slugCore(linked)
  if (core && (c.includes(core) || core.includes(c))) return true
  // Token-subset match: every token of the linked slug must prefix-match a
  // token of the candidate ("cyber-controls" matches "rbi-cyber-security-controls-2026",
  // "op-resilience" matches "rbi-operational-resilience-framework-2026")
  const linkedTokens = core.split("-").filter((t) => t.length >= 2)
  const candTokens = c.split("-")
  if (
    linkedTokens.length > 0 &&
    linkedTokens.every((lt) =>
      candTokens.some((ct) => ct.startsWith(lt) || lt.startsWith(ct)),
    )
  )
    return true
  // Id-prefix match (policy id or linked slug prefix of the regulation id)
  if (c.startsWith(pid.slice(0, 8)) || pid.startsWith(c.slice(0, 8)))
    return true
  if (c.startsWith(linked.slice(0, 8)) || linked.startsWith(c.slice(0, 8)))
    return true
  return false
}

/**
 * Return manifest policies linked to a regulation, matching by regulation
 * id, id prefix, or title slug (e.g. "RBI KYC/AML Directions 2026" matches
 * linked_regulation "kyc-aml-2026").
 */
export function getPoliciesForReg(
  regIdOrSlug: string,
  regTitle?: string,
): BankDemoPolicy[] {
  const candidates = [regIdOrSlug, regTitle ?? ""].filter(Boolean)
  return policies.filter((p) => candidates.some((c) => matchesPolicy(p, c)))
}

export function getAllPolicies(): BankDemoPolicy[] {
  return policies
}
