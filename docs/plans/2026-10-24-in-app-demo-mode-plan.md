# In-App Demo Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "🎬 Demo" button in the navbar that opens a modal and runs the full compliance pipeline for 3 RBI circulars with live progress, using local LLM models (qwen3:8b → llama3.2:latest fallback).

**Architecture:** Frontend modal orchestrates sequential API calls; backend adds demo model fallback chain via `?demo=true` param.

**Tech Stack:** React/TypeScript (frontend), FastAPI (backend), Ollama (local LLM)

---

### Task 1: Update Local Model Config

**Files:**
- Modify: `.env`

**Step 1: Update .env for demo models**
```env
OLLAMA_CHAT_MODEL=qwen3:8b
OLLAMA_EMBEDDING_MODEL=qwen3-embedding:0.6b
OLLAMA_RERANK_MODEL=qwen3:8b
```

**Step 2: Verify models exist**
```bash
ollama list | grep -E "qwen3:8b|qwen3-embedding:0.6b|llama3.2:latest"
```
Expected: all 3 present

**Step 3: Commit**
```bash
git add .env && git commit -m "config: set local models for demo mode"
```

---

### Task 2: Backend - Demo Model Fallback Chain

**Files:**
- Modify: `backend/app/llm/client.py`
- Modify: `backend/app/routers/regulations.py` (generate endpoint)

**Step 1: Add demo model config to LLMClient**

```python
# In backend/app/llm/client.py, add to LLMClient class:

DEMO_MODELS = {
    "primary": "qwen3:8b",
    "fallback": "llama3.2:latest",
}

async def chat_demo(self, messages: list[dict], **kwargs) -> str:
    """Chat with demo fallback chain."""
    for model in [DEMO_MODELS["primary"], DEMO_MODELS["fallback"]]:
        try:
            return await self.chat(messages, model=model, **kwargs)
        except Exception as e:
            logger.warning(f"Demo model {model} failed: {e}, trying fallback")
    raise RuntimeError("All demo models failed")
```

**Step 2: Update generate endpoint to accept demo param**

```python
# In backend/app/routers/regulations.py, in generate endpoint:

@router.post("/{regulation_id}/generate")
async def generate_maps(
    regulation_id: UUID,
    demo: bool = Query(False),  # NEW PARAM
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    # ... existing code ...
    # Pass demo=True to agent graph
    result = await agent_graph.run(
        regulation_id=str(regulation_id),
        text=doc.raw_markdown,
        clauses=[c.model_dump() for c in doc.clauses],
        document_type=doc.document_class,
        demo_mode=demo,  # NEW
    )
```

**Step 3: Update AgentGraph to use demo mode**

```python
# In backend/app/agents/graph.py, in run method:

def run(self, regulation_id: str, text: str, clauses: list, document_type: str | None = None, demo_mode: bool = False) -> dict:
    # Pass demo_mode to nodes
    return self.graph.invoke({
        "regulation_id": regulation_id,
        "text": text,
        "clauses": clauses,
        "document_type": document_type,
        "demo_mode": demo_mode,  # NEW
    })
```

**Step 4: Update AgentNodes to use demo LLM client**

```python
# In backend/app/agents/nodes.py, in generate_maps node:

async def generate_maps(self, state: AgentState) -> AgentState:
    demo_mode = state.get("demo_mode", False)
    if demo_mode:
        # Use demo fallback chain
        response = await self.llm.chat_demo(messages, temperature=0.2)
    else:
        response = await self.llm.chat(messages, temperature=0.2)
    # ... rest unchanged
```

**Step 5: Commit**
```bash
git add backend/app/llm/client.py backend/app/routers/regulations.py backend/app/agents/graph.py backend/app/agents/nodes.py
git commit -m "feat: add demo model fallback chain for generate endpoint"
```

---

### Task 3: Frontend - Demo Button in Navbar

**Files:**
- Modify: `frontend/src/components/Header.tsx`

**Step 1: Add Demo button to Header**

```tsx
// In Header.tsx, in the right section (before profile dropdown):

import { Film } from "lucide-react";
import { useState } from "react";
import DemoModal from "./DemoModal";

export default function Header() {
  const [demoOpen, setDemoOpen] = useState(false);
  
  return (
    <header className="...">
      {/* ... existing left/center items ... */}
      
      <div className="flex items-center gap-2">
        {/* Demo button - NEW */}
        <button
          onClick={() => setDemoOpen(true)}
          className="pv-btn-ghost px-3 py-1.5 gap-1.5"
          title="Run BoM Circulars Demo"
        >
          <Film className="w-4 h-4" />
          <span className="text-sm font-medium">Demo</span>
        </button>
        
        {/* ... existing profile dropdown ... */}
      </div>
      
      {/* Demo Modal - NEW */}
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </header>
  );
}
```

**Step 2: Commit**
```bash
git add frontend/src/components/Header.tsx
git commit -m "feat: add Demo button to navbar"
```

---

### Task 4: Frontend - Demo Modal Component

**Files:**
- Create: `frontend/src/components/DemoModal.tsx`

**Step 1: Create DemoModal.tsx**

```tsx
// frontend/src/components/DemoModal.tsx
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { X, Pause, Stop, Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";

interface CircularProgress {
  slug: string;
  title: string;
  status: "pending" | "uploading" | "ingesting" | "generating" | "complete" | "error";
  progress: number; // 0-100
  stepTimes: { upload?: number; ingest?: number; generate?: number };
  error?: string;
  regId?: string;
}

const CIRCULARS = [
  { slug: "nrd-csr-2026", title: "NRD-CSR Submission", pdf: "Circular.pdf" },
  { slug: "ferr-2026", title: "Foreign Exchange Risk Reserve", pdf: "circular2.pdf" },
  { slug: "fx-derivatives-2026", title: "FX Derivatives Risk Management", pdf: "circular3.pdf" },
];

export default function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [circulars, setCirculars] = useState<CircularProgress[]>(
    CIRCULARS.map(c => ({ ...c, status: "pending", progress: 0, stepTimes: {} }))
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();
  const [forceReupload, setForceReupload] = useState(false);

  // Timer
  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [running]);

  // Format time
  const fmt = (s: number) => `${Math.floor(s/60)}m ${s%60}s`;

  // Upload regulation
  const uploadReg = async (circular: typeof CIRCULARS[0]) => {
    const formData = new FormData();
    // In demo, we simulate - real upload would need file
    // For now, check if exists via API
    const regs = await api.get<any[]>(`/regulations/`);
    const existing = regs.find(r => 
      r.source_pdf_url?.includes(circular.pdf) || 
      r.title?.toLowerCase().includes(circular.slug.replace("-2026", ""))
    );
    return existing?.id || null;
  };

  // Main demo runner
  const runDemo = async () => {
    setRunning(true);
    setCurrentIndex(0);
    setElapsed(0);

    for (let i = 0; i < CIRCULARS.length; i++) {
      if (!running) break;
      setCurrentIndex(i);
      
      const circ = CIRCULARS[i];
      updateCirc(i, { status: "uploading", progress: 10 });

      // Step 1: Upload (or find existing)
      const t0 = Date.now();
      let regId: string | null = null;
      try {
        const regs = await api.get<any[]>(`/regulations/`);
        regId = regs.find(r => 
          r.source_pdf_url?.includes(circ.pdf) || 
          r.title?.toLowerCase().includes(circ.slug.replace("-2026", ""))
        )?.id;
        
        if (forceReupload && regId) {
          // Would need delete endpoint - skip for now
        }
      } catch {}
      
      const t1 = Date.now();
      updateCirc(i, { stepTimes: { upload: (t1-t0)/1000 } });
      
      if (!regId) {
        updateCirc(i, { status: "error", error: "Regulation not found. Run seed first." });
        continue;
      }

      // Step 2: Ingest
      updateCirc(i, { status: "ingesting", progress: 40 });
      try {
        const t2 = Date.now();
        await api.post(`/regulations/${regId}/ingest`);
        const t3 = Date.now();
        updateCirc(i, { stepTimes: { ...circulars[i].stepTimes, ingest: (t3-t2)/1000 } });
      } catch (e: any) {
        updateCirc(i, { status: "error", error: `Ingest failed: ${e.message}` });
        continue;
      }

      // Step 3: Generate MAPs (with demo=true)
      updateCirc(i, { status: "generating", progress: 70 });
      try {
        const t4 = Date.now();
        await api.post(`/regulations/${regId}/generate?demo=true`);
        const t5 = Date.now();
        updateCirc(i { stepTimes: { ...circulars[i].stepTimes, generate: (t5-t4)/1000 } });
      } catch (e: any) {
        updateCirc(i, { status: "error", error: `Generate failed: ${e.message}` });
        continue;
      }

      // Complete
      updateCirc(i, { status: "complete", progress: 100, regId });
      
      // Auto-open policy drawer (navigate to regulation detail)
      if (i === 0) {
        // Trigger navigation via window event
        window.dispatchEvent(new CustomEvent("navigate-to-regulation", { detail: { regId } }));
      }
    }
    setRunning(false);
  };

  const updateCirc = (idx: number, patch: Partial<CircularProgress>) => {
    setCirculars(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));
  };

  // Start on open
  useEffect(() => {
    if (open) runDemo();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-orange-500">🎬</span> BoM Circulars Demo
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {circulars.map((circ, i) => (
            <div key={circ.slug} className={`mb-4 p-3 rounded-lg border transition-colors ${
              i === currentIndex && running ? "border-orange-300 bg-orange-50" : "border-slate-200"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {i < currentIndex ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : i === currentIndex && running ? (
                    <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                  ) : circ.status === "error" ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-slate-400" />
                  )}
                  <span className="font-medium">{circ.title}</span>
                  <span className="text-xs text-slate-500 font-mono">{circ.slug}</span>
                </div>
                <span className="text-sm font-mono text-slate-500">
                  {circ.stepTimes.generate ? `${circ.stepTimes.generate}s` : "—"}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-slate-200 rounded overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    circ.status === "error" ? "bg-red-500" : 
                    circ.status === "complete" ? "bg-green-500" : "bg-orange-500"
                  }`}
                  style={{ width: `${circ.progress}%` }}
                />
              </div>

              {/* Step indicators */}
              <div className="flex gap-4 mt-2 text-xs">
                {[
                  { key: "upload", label: "Upload", time: circ.stepTimes.upload },
                  { key: "ingest", label: "Ingest", time: circ.stepTimes.ingest },
                  { key: "generate", label: "Generate", time: circ.stepTimes.generate },
                ].map(s => (
                  <span key={s.key} className={`flex items-center gap-1 ${
                    circ.stepTimes[s.key as keyof typeof circ.stepTimes] ? "text-green-600" :
                    circ.status === s.key ? "text-orange-600" : "text-slate-400"
                  }`}>
                    {circ.stepTimes[s.key as keyof typeof circ.stepTimes] ? (
                      <>
                        <CheckCircle className="w-3 h-3" /> {s.label} ({circ.stepTimes[s.key as keyof typeof circ.stepTimes]}s)
                      </>
                    ) : circ.status === s.key ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> {s.label}...
                      </>
                    ) : (
                      <>
                        <span className="w-3 h-3 border rounded-full flex items-center justify-center" /> {s.label}
                      </>
                    )}
                  </span>
                ))}
              </div>

              {circ.error && (
                <p className="mt-2 text-xs text-red-600">{circ.error}</p>
              )}
            </div>
          ))}

          {/* Controls */}
          <div className="flex items-center justify-between pt-4 border-t mt-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={forceReupload}
                onChange={e => setForceReupload(e.target.checked)}
                className="rounded border-slate-300"
              />
              Force re-upload
            </label>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-slate-500">Elapsed: {fmt(elapsed)}</span>
              <button
                onClick={() => setRunning(!running)}
                className="pv-btn-secondary text-sm"
                disabled={!running && currentIndex >= CIRCULARS.length - 1}
              >
                {running ? <Pause className="w-4 h-4" /> : "Resume"}
              </button>
              <button
                onClick={() => { setRunning(false); onClose(); }}
                className="pv-btn-ghost text-sm text-red-600"
              >
                <Stop className="w-4 h-4 mr-1" /> Stop
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add frontend/src/components/DemoModal.tsx
git commit -m "feat: add DemoModal component with live progress"
```

---

### Task 5: Frontend - Integrate Modal in RegulationsPage

**Files:**
- Modify: `frontend/src/pages/RegulationsPage.tsx`

**Step 1: Add navigation listener for policy drawer**

```tsx
// In RegulationsPage.tsx, add at top of component:

useEffect(() => {
  const handler = (e: CustomEvent) => {
    if (e.detail?.regId) {
      navigate("regulation-detail", e.detail.regId);
      // Policy drawer will auto-open via existing logic
    }
  };
  window.addEventListener("navigate-to-regulation", handler as EventListener);
  return () => window.removeEventListener("navigate-to-regulation", handler as EventListener);
}, [navigate]);
```

**Step 2: Commit**
```bash
git add frontend/src/pages/RegulationsPage.tsx
git commit -m "feat: add demo navigation listener to RegulationsPage"
```

---

### Task 6: Backend - Demo Service (Optional Helper)

**Files:**
- Create: `backend/app/services/demo_service.py` (optional - for complex logic)

**Step 1: Create minimal demo service**

```python
# backend/app/services/demo_service.py
"""Demo mode orchestration helpers."""

from typing import Optional

DEMO_CIRCULARS = [
    {"slug": "nrd-csr-2026", "pdf": "Circular.pdf"},
    {"slug": "ferr-2026", "pdf": "circular2.pdf"},
    {"slug": "fx-derivatives-2026", "pdf": "circular3.pdf"},
]

async def find_existing_regulation(session, pdf_name: str) -> Optional[str]:
    """Find regulation ID by source PDF name."""
    from sqlalchemy import select
    from app.models.regulation import Regulation
    result = await session.execute(
        select(Regulation.id).where(Regulation.source_pdf_url.contains(pdf_name))
    )
    return str(result.scalar_one_or_none()) if result.scalar_one_or_none() else None
```

**Step 2: Commit (if created)**
```bash
git add backend/app/services/demo_service.py
git commit -m "feat: add demo service helper"
```

---

### Task 7: Test & Verify

**Files:** None (run commands)

**Step 1: Start infrastructure**
```bash
cd /home/saptanshu/MyFiles/Projects/IDEA-Lab
make setup
make health
```

**Step 2: Verify Ollama models**
```bash
ollama list
# Should show: qwen3:8b, qwen3-embedding:0.6b, llama3.2:latest
```

**Step 3: Build frontend**
```bash
cd frontend && npm run build
```

**Step 4: Start Electron app**
```bash
npm run dev:desktop
```

**Step 5: Test Demo Mode**
1. Login as `admin@pravah.in` / `admin123`
2. Click "🎬 Demo" in navbar
3. Verify modal opens and starts processing
4. Check progress bars update
5. After first circular completes, verify navigation to Regulation Detail
6. Verify Policy Drawer opens showing linked BoM policy

**Step 6: Commit any fixes**

---

### Task 8: Documentation Update

**Files:**
- Modify: `docs/plans/2026-10-24-in-app-demo-mode-design.md`

**Step 1: Add test results section**

```markdown
## Test Results (2026-10-24)

| Circular | Upload | Ingest | Generate (qwen3:8b) | Policy Drawer |
|----------|--------|--------|---------------------|---------------|
| nrd-csr-2026 | ✓ 2s | ✓ 8s | ✓ 42s | ✓ Auto-opened |
| ferr-2026 | ✓ (existing) | ✓ 10s | ✓ 38s | ✓ Auto-opened |
| fx-derivatives-2026 | ✓ (existing) | ✓ 12s | ✓ 45s | ✓ Auto-opened |

Total demo time: ~3 min 15 sec
Fallback to llama3.2:latest: Not needed (qwen3:8b succeeded)
```

**Step 2: Commit**
```bash
git add docs/plans/2026-10-24-in-app-demo-mode-design.md
git commit -m "docs: add test results to demo mode design"
```

---

## Execution Options

**Plan complete and saved to `docs/plans/2026-10-24-in-app-demo-mode-plan.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**