import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { X, Pause, Stop, Loader2, CheckCircle, AlertCircle, Clock, Square } from "lucide-react";

interface CircularProgress {
  slug: string;
  title: string;
  status: "pending" | "uploading" | "ingesting" | "generating" | "complete" | "error";
  progress: number;
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

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [running]);

  const fmt = (s: number) => `${Math.floor(s/60)}m ${s%60}s`;

  const updateCirc = (idx: number, patch: Partial<CircularProgress>) => {
    setCirculars(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));
  };

  const runDemo = async () => {
    setRunning(true);
    setCurrentIndex(0);
    setElapsed(0);
    setCirculars(CIRCULARS.map(c => ({ ...c, status: "pending", progress: 0, stepTimes: {} })));

    for (let i = 0; i < CIRCULARS.length; i++) {
      if (!running) break;
      setCurrentIndex(i);
      
      const circ = CIRCULARS[i];
      updateCirc(i, { status: "uploading", progress: 10 });

      const t0 = Date.now();
      let regId: string | null = null;
      try {
        const regs = await api.get<any[]>(`/regulations/`);
        regId = regs.find(r => 
          r.source_pdf_url?.includes(circ.pdf) || 
          r.title?.toLowerCase().includes(circ.slug.replace("-2026", ""))
        )?.id ?? null;
      } catch {}
      
      const t1 = Date.now();
      updateCirc(i, { stepTimes: { upload: (t1-t0)/1000 } });
      
      if (!regId) {
        updateCirc(i, { status: "error", error: "Regulation not found. Run seed first." });
        continue;
      }

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

      updateCirc(i, { status: "generating", progress: 70 });
      try {
        const t4 = Date.now();
        await api.post(`/regulations/${regId}/generate?demo=true`);
        const t5 = Date.now();
        updateCirc(i, { stepTimes: { ...circulars[i].stepTimes, generate: (t5-t4)/1000 } });
      } catch (e: any) {
        updateCirc(i, { status: "error", error: `Generate failed: ${e.message}` });
        continue;
      }

      updateCirc(i, { status: "complete", progress: 100, regId });
      
      if (i === 0) {
        window.dispatchEvent(new CustomEvent("navigate-to-regulation", { detail: { regId } }));
      }
      
      await new Promise(r => setTimeout(r, 500));
    }
    setRunning(false);
  };

  useEffect(() => {
    if (open) runDemo();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-orange-500">🎬</span> BoM Circulars Demo
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded" disabled={running}>
            <X className="w-5 h-5" />
          </button>
        </div>

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

              <div className="h-2 bg-slate-200 rounded overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    circ.status === "error" ? "bg-red-500" : 
                    circ.status === "complete" ? "bg-green-500" : "bg-orange-500"
                  }`}
                  style={{ width: `${circ.progress}%` }}
                />
              </div>

              <div className="flex gap-4 mt-2 text-xs flex-wrap">
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
                <Square className="w-4 h-4 mr-1" /> Stop
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}