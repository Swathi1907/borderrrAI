import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

interface PipelineStep {
  id: string;
  label: string;
  detail: string;
  duration: number; // ms
  result: string;
  risk?: 'low' | 'medium' | 'high';
}

// ─── Data ────────────────────────────────────────────────────────────────────

const PIPELINE: PipelineStep[] = [
  { id: 'ocr', label: 'OCR Extraction', detail: 'Reading all printed & chip fields from the document', duration: 1200, result: '112 fields extracted · MRZ decoded', risk: 'low' },
  { id: 'security', label: 'Security Feature Validation', detail: 'Checking holograms, watermarks, UV patterns and microprint', duration: 1500, result: 'All 8 security markers validated', risk: 'low' },
  { id: 'tamper', label: 'Tampering Analysis', detail: 'Deep-learning scan for digital or physical manipulation', duration: 1800, result: 'No manipulation detected · Score 0.007 / 1.0', risk: 'low' },
  { id: 'chip', label: 'Chip & MRZ Integrity', detail: 'Verifying embedded RFID chip data matches printed fields', duration: 1000, result: 'Chip data matches · BAC/EAC passed', risk: 'low' },
  { id: 'face', label: 'Biometric Face Verification', detail: 'Matching live capture against chip photo using facial landmarks', duration: 2000, result: 'Biometric match · Confidence 99.1%', risk: 'low' },
  { id: 'watch', label: 'Watchlist Cross-check', detail: 'Querying INTERPOL, FRONTEX, national blacklists', duration: 1300, result: 'No matches on 14 active watchlists', risk: 'low' },
  { id: 'risk', label: 'Risk Scoring', detail: 'Aggregating signals into a unified threat score', duration: 800, result: 'Risk score 07 / 100 · CLEAR', risk: 'low' },
];

const VERDICT = {
  genuine: {
    label: 'GENUINE',
    sub: 'Document Authenticated',
    color: '#10b981',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    icon: '✓',
    description: 'All verification checks passed. No signs of forgery, tampering, or manipulation were detected. The document is issued legitimately and the biometric identity is confirmed.',
    badgeClass: 'bg-emerald-500',
  },
  forged: {
    label: 'FORGED',
    sub: 'Document Rejected — Potential Forgery',
    color: '#ef4444',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: '✕',
    description: 'Critical anomalies detected. The document exhibits signs of photo substitution and MRZ tampering. Biometric chip data does not match the printed fields. Retain traveler for manual inspection.',
    badgeClass: 'bg-red-500',
  },
};

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: 'Capture Document' },
    { n: 2, label: 'AI Analysis Pipeline' },
    { n: 3, label: 'Verification & Result' },
  ];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all border-2 ${
                current === s.n
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200'
                  : current > s.n
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              {current > s.n ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : s.n}
            </div>
            <div>
              <div className={`text-[10px] font-semibold tracking-wider uppercase ${current === s.n ? 'text-emerald-600' : current > s.n ? 'text-slate-500' : 'text-slate-300'}`}>
                Step {s.n}
              </div>
              <div className={`text-xs font-medium ${current === s.n ? 'text-slate-800' : current > s.n ? 'text-slate-500' : 'text-slate-300'}`}>
                {s.label}
              </div>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px mx-4 ${current > s.n ? 'bg-emerald-400' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Capture ──────────────────────────────────────────────────────────

function CaptureStep({ onNext }: { onNext: () => void }) {
  const [mode, setMode] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [captureIndex, setCaptureIndex] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const captureItems = [
    {
      label: 'Passport',
      shortLabel: 'Passport',
      instruction: 'Place the passport identity page flat inside the capture frame.',
      scanning: 'Reading passport',
      success: 'Passport captured successfully',
      detail: 'Identity page and MRZ are ready for analysis',
    },
    {
      label: 'Visa',
      shortLabel: 'Visa',
      instruction: 'Place the valid visa page or visa document inside the frame.',
      scanning: 'Reading visa',
      success: 'Visa captured successfully',
      detail: 'Visa details are ready for cross-validation',
    },
    {
      label: 'Valid national ID',
      shortLabel: 'National ID',
      instruction: 'Place the front of a valid national identity card inside the frame.',
      scanning: 'Reading national ID',
      success: 'National ID captured successfully',
      detail: 'Identity card fields are ready for analysis',
    },
    {
      label: 'Driving license',
      shortLabel: 'Driving license',
      instruction: 'Place the front of a valid driving license inside the capture frame.',
      scanning: 'Reading driving license',
      success: 'Driving license captured successfully',
      detail: 'License identity fields are ready for cross-validation',
    },
    {
      label: 'Live person photo',
      shortLabel: 'Live photo',
      instruction: 'Ask the traveler to face the camera and remain still.',
      scanning: 'Capturing live photo',
      success: 'Live photo captured successfully',
      detail: 'Face image is ready for biometric matching',
    },
  ];

  const activeCapture = captureItems[captureIndex];
  const isLivePhoto = captureIndex === captureItems.length - 1;

  function startScan() {
    setMode('scanning');
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); setMode('done'); return 100; }
        return p + 2;
      });
    }, 40);
  }

  function continueCapture() {
    if (captureIndex === captureItems.length - 1) {
      onNext();
      return;
    }
    setCaptureIndex((index) => index + 1);
    setMode('idle');
    setProgress(0);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <svg className="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M14 3v5h4M10 12h5M10 16h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-slate-800">Identity Evidence Capture</div>
              <div className="text-xs text-slate-500">Complete all five captures in the required order</div>
            </div>
            <span className="ml-auto text-[10px] font-semibold text-slate-400">{captureIndex + 1} of {captureItems.length}</span>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-2 mb-6 sm:grid-cols-5">
            {captureItems.map((item, index) => {
              const complete = index < captureIndex || (index === captureIndex && mode === 'done');
              const active = index === captureIndex;
              return (
                <div
                  key={item.label}
                  className={`rounded-xl border p-3 transition-colors ${
                    active
                      ? 'border-emerald-200 bg-emerald-50'
                      : complete
                        ? 'border-emerald-100 bg-white'
                        : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <div className={`mb-2 flex size-6 items-center justify-center rounded-full text-[10px] font-bold ${
                    complete
                      ? 'bg-emerald-500 text-white'
                      : active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-400'
                  }`}>
                    {complete ? (
                      <svg className="size-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="m2.5 6 2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : index + 1}
                  </div>
                  <div className={`text-[10px] font-semibold leading-tight ${active ? 'text-emerald-700' : complete ? 'text-slate-600' : 'text-slate-400'}`}>
                    {item.shortLabel}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mb-3">
            <div className="text-sm font-semibold text-slate-800">{activeCapture.label}</div>
            <div className="mt-0.5 text-xs text-slate-500">{activeCapture.instruction}</div>
          </div>

          <div
            className={`relative rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${
              mode === 'done'
                ? 'border-emerald-400 bg-emerald-50'
                : mode === 'scanning'
                ? 'border-emerald-300 bg-emerald-50/50'
                : 'border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/30'
            }`}
            style={{ height: 280 }}
          >
            {mode === 'idle' && (
              <>
                {isLivePhoto ? (
                  <div className="mb-4 flex h-32 w-40 items-center justify-center rounded-2xl border-2 border-slate-300 bg-slate-100">
                    <svg className="size-16 text-slate-400" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                      <circle cx="32" cy="23" r="11" stroke="currentColor" strokeWidth="2" />
                      <path d="M13 55c2-12 9-18 19-18s17 6 19 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-48 h-32 rounded-xl border-2 border-slate-300 relative flex items-center justify-center mb-4 bg-slate-200">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="grid grid-cols-3 gap-2 opacity-30">
                        {[...Array(6)].map((_, i) => <div key={i} className="w-8 h-1.5 bg-slate-500 rounded" />)}
                      </div>
                    </div>
                    <div className="text-slate-500 text-xs font-semibold z-10 uppercase">{activeCapture.shortLabel}</div>
                    {['top-1 left-1', 'top-1 right-1', 'bottom-1 left-1', 'bottom-1 right-1'].map(pos => (
                      <div key={pos} className={`absolute ${pos} w-3 h-3 border-emerald-400`}
                        style={{
                          borderTopWidth: pos.includes('top') ? 2 : 0,
                          borderBottomWidth: pos.includes('bottom') ? 2 : 0,
                          borderLeftWidth: pos.includes('left') ? 2 : 0,
                          borderRightWidth: pos.includes('right') ? 2 : 0,
                        }}
                      />
                    ))}
                  </div>
                )}
                <div className="text-sm font-medium text-slate-600 mb-1">{isLivePhoto ? 'Position face inside the frame' : 'Place document inside the frame'}</div>
                <div className="text-xs text-slate-400">{isLivePhoto ? 'Use a clear, front-facing live image' : 'Ensure all corners and details are visible'}</div>
              </>
            )}

            {mode === 'scanning' && (
              <div className="flex flex-col items-center w-full px-12">
                <div className="w-48 h-32 rounded-xl border-2 border-emerald-400 relative overflow-hidden mb-6 bg-navy-700">
                  <div
                    className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-lg transition-all"
                    style={{ top: `${progress}%`, boxShadow: '0 0 8px #10b981' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white/60 text-xs font-mono uppercase">{activeCapture.scanning}…</span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2">
                  <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-xs text-slate-500">{activeCapture.scanning}… {progress}%</div>
              </div>
            )}

            {mode === 'done' && (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-200">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12L10 17L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="font-semibold text-emerald-700 text-sm mb-1">{activeCapture.success}</div>
                <div className="text-xs text-slate-500">{activeCapture.detail}</div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-5">
            {mode === 'idle' && (
              <>
                <button
                  onClick={startScan}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ background: '#10b981' }}
                >
                  {isLivePhoto ? 'Open camera and capture' : `Scan ${activeCapture.shortLabel}`}
                </button>
                {!isLivePhoto && (
                  <>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex-1 py-3 rounded-xl font-semibold text-sm text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                    >
                      Upload file
                    </button>
                    <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={startScan} />
                  </>
                )}
              </>
            )}
            {mode === 'scanning' && (
              <div className="flex-1 py-3 rounded-xl text-sm text-center text-slate-500 bg-slate-50 border border-slate-200">
                Scanning in progress…
              </div>
            )}
            {mode === 'done' && (
              <>
                <button
                  onClick={continueCapture}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ background: '#10b981' }}
                >
                  {captureIndex === captureItems.length - 1 ? 'Proceed to AI Analysis →' : `Continue to ${captureItems[captureIndex + 1].shortLabel} →`}
                </button>
                <button onClick={() => { setMode('idle'); setProgress(0); }} className="px-5 py-3 rounded-xl text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
                  Retake
                </button>
              </>
            )}
          </div>
        </div>
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4 text-[10px] text-slate-400">
          <span>Required order: Passport → Visa → National ID → Driving license → Live photo</span>
          <span>Encrypted capture</span>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: AI Pipeline ──────────────────────────────────────────────────────

function PipelineStepRow({
  step,
  state,
  progress,
}: {
  step: PipelineStep;
  state: 'waiting' | 'running' | 'done';
  progress: number;
}) {
  const colors = { low: 'text-emerald-600', medium: 'text-amber-600', high: 'text-red-600' };
  return (
    <div className={`rounded-xl border p-4 transition-all ${
      state === 'done' ? 'bg-emerald-50/60 border-emerald-200' :
      state === 'running' ? 'bg-white border-emerald-300 shadow-md' :
      'bg-white border-slate-100'
    }`}>
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
          state === 'done' ? 'bg-emerald-500' :
          state === 'running' ? 'bg-emerald-100' :
          'bg-slate-100'
        }`}>
          {state === 'done' ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7L6 10L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : state === 'running' ? (
            <div className="w-3 h-3 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          ) : (
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm font-semibold ${state === 'waiting' ? 'text-slate-300' : 'text-slate-800'}`}>{step.label}</span>
            {state === 'done' && step.risk && (
              <span className={`text-[10px] font-bold ${colors[step.risk]}`}>
                {step.risk === 'low' ? '✓ PASS' : step.risk === 'medium' ? '⚠ FLAG' : '✕ FAIL'}
              </span>
            )}
            {state === 'waiting' && <span className="text-[10px] text-slate-300">Pending</span>}
            {state === 'running' && <span className="text-[10px] text-emerald-500 font-medium animate-pulse">Running…</span>}
          </div>

          {state !== 'waiting' && (
            <div className={`text-[11px] mt-0.5 ${state === 'done' ? 'text-slate-500' : 'text-slate-400'}`}>
              {state === 'running' ? step.detail : step.result}
            </div>
          )}

          {state === 'running' && (
            <div className="mt-2 h-1 bg-emerald-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PipelineStep({ onNext }: { onNext: (forged: boolean) => void }) {
  const [current, setCurrent] = useState(-1); // -1 = not started
  const [stepProgress, setStepProgress] = useState(0);
  const [started, setStarted] = useState(false);
  const stepRef = useRef(0);

  function runNext(idx: number) {
    if (idx >= PIPELINE.length) {
      setTimeout(() => onNext(false), 600);
      return;
    }
    setCurrent(idx);
    setStepProgress(0);
    const step = PIPELINE[idx];
    const totalMs = step.duration;
    const interval = 30;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += interval;
      setStepProgress(Math.min(100, Math.round((elapsed / totalMs) * 100)));
      if (elapsed >= totalMs) {
        clearInterval(timer);
        stepRef.current = idx + 1;
        setCurrent(idx + 0.5 as any); // brief "done" state for current
        setTimeout(() => runNext(idx + 1), 300);
      }
    }, interval);
  }

  function start() {
    setStarted(true);
    runNext(0);
  }

  const currentInt = Math.floor(current);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-lg">🤖</div>
            <div>
              <div className="font-semibold text-slate-800">AI Analysis Pipeline</div>
              <div className="text-xs text-slate-500">Each check runs sequentially — results are logged in real time</div>
            </div>
            {started && current < PIPELINE.length && (
              <span className="ml-auto text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold animate-pulse">
                LIVE
              </span>
            )}
            {started && current >= PIPELINE.length && (
              <span className="ml-auto text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
                COMPLETE
              </span>
            )}
          </div>
        </div>

        <div className="p-5 space-y-2.5">
          {PIPELINE.map((step, i) => {
            let state: 'waiting' | 'running' | 'done';
            if (!started || i > currentInt) state = 'waiting';
            else if (i === currentInt && current === currentInt) state = 'running';
            else state = 'done';
            return (
              <PipelineStepRow
                key={step.id}
                step={step}
                state={state}
                progress={state === 'running' ? stepProgress : 0}
              />
            );
          })}
        </div>

        <div className="px-5 pb-5">
          {!started ? (
            <button
              onClick={start}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: '#10b981' }}
            >
              🚀 Begin AI Analysis
            </button>
          ) : current < PIPELINE.length ? (
            <div className="w-full py-3 rounded-xl text-sm text-center text-slate-400 bg-slate-50 border border-slate-200">
              Analysis running… ({Math.min(currentInt + 1, PIPELINE.length)} / {PIPELINE.length} checks)
            </div>
          ) : (
            <button
              onClick={() => onNext(false)}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
              style={{ background: '#10b981' }}
            >
              View Verification Result →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Verification ─────────────────────────────────────────────────────

function VerificationStep({ forged }: { forged: boolean }) {
  const navigate = useNavigate();
  const verdict = forged ? VERDICT.forged : VERDICT.genuine;
  const [confirmed, setConfirmed] = useState(false);

  const checks = [
    { label: 'Document structure integrity', pass: !forged || true, note: forged ? 'Page structure anomalies detected' : 'All structural fields intact' },
    { label: 'MRZ checksum verification', pass: !forged, note: forged ? 'Checksum mismatch on line 2' : 'MRZ checksums validated' },
    { label: 'Security features (hologram, UV)', pass: !forged || true, note: 'All 8 features present' },
    { label: 'Photo substitution detection', pass: !forged, note: forged ? 'Edge artifacts suggest photo swap' : 'No substitution artifacts detected' },
    { label: 'Chip data vs printed fields', pass: !forged, note: forged ? 'Chip DOB mismatch' : 'Chip and printed data match exactly' },
    { label: 'Biometric face match', pass: !forged || true, note: forged ? 'Confidence 71.2% — below threshold' : 'Confidence 99.1% — above threshold' },
    { label: 'Watchlist cross-reference', pass: !forged || true, note: 'No matches across 14 watchlists' },
    { label: 'Document not reported stolen', pass: !forged || true, note: 'Not listed in SLTD database' },
  ];

  const passed = checks.filter(c => c.pass).length;
  const failed = checks.length - passed;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Verdict banner */}
      <div
        className={`rounded-2xl p-6 mb-5 border-2 ${verdict.bg} ${verdict.border} flex items-center gap-6`}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shrink-0 shadow-lg"
          style={{ background: verdict.color, boxShadow: `0 8px 24px ${verdict.color}40` }}
        >
          {verdict.icon}
        </div>
        <div className="flex-1">
          <div className={`text-2xl font-bold ${verdict.text} mb-1`}>{verdict.label}</div>
          <div className={`text-sm font-medium ${verdict.text} opacity-80 mb-2`}>{verdict.sub}</div>
          <p className="text-sm text-slate-600 leading-relaxed">{verdict.description}</p>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-4xl font-bold ${verdict.text}`}>{forged ? '34' : '07'}</div>
          <div className="text-xs text-slate-500">Risk score / 100</div>
          <div className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full text-white inline-block ${verdict.badgeClass}`}>
            {forged ? 'HIGH RISK' : 'LOW RISK'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Checklist */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-4">
            Verification Checklist · {passed}/{checks.length} passed
          </div>
          <div className="space-y-2.5">
            {checks.map((c, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${c.pass ? 'bg-emerald-500' : 'bg-red-500'}`}>
                  {c.pass ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M3 3L7 7M7 3L3 7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                <div>
                  <div className={`text-xs font-medium ${c.pass ? 'text-slate-700' : 'text-red-700'}`}>{c.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{c.note}</div>
                </div>
              </div>
            ))}
          </div>
          {failed > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700 font-medium">
              ⚠ {failed} critical {failed === 1 ? 'failure' : 'failures'} detected — document must not be accepted
            </div>
          )}
        </div>

        {/* Traveler + document summary */}
        <div className="flex flex-col gap-4">
          {/* Traveler card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-3">Traveler Summary</div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">👤</div>
              <div>
                <div className="font-bold text-slate-800">MARIJA KOVAČ</div>
                <div className="text-xs text-slate-500">Republic of Croatia · Female</div>
                <div className="text-[10px] text-slate-400">DOB 14 AUG 1987 · Age 38</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {[
                ['Passport No', 'CR081129'],
                ['Issue Date', '14 JUL 2017'],
                ['Expiry Date', '14 JUL 2027'],
                ['Issuing Auth', 'MUP Croatia'],
              ].map(([l, v]) => (
                <div key={l} className="bg-slate-50 rounded-lg p-2">
                  <div className="text-slate-400 text-[9px] mb-0.5">{l}</div>
                  <div className="font-mono font-semibold text-slate-700 text-[10px]">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Forgery indicators */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex-1">
            <div className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-3">Forgery Indicators</div>
            <div className="space-y-2">
              {[
                { label: 'Pixel-level manipulation', val: forged ? 'Detected' : 'None', bad: forged },
                { label: 'Font inconsistency', val: forged ? '3 characters' : 'None', bad: forged },
                { label: 'Chip cloning', val: 'Not detected', bad: false },
                { label: 'UV pattern anomalies', val: 'None', bad: false },
                { label: 'Ink density variance', val: forged ? 'Irregular' : 'Normal', bad: forged },
              ].map(ind => (
                <div key={ind.label} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{ind.label}</span>
                  <span className={`font-semibold ${ind.bad ? 'text-red-600' : 'text-emerald-600'}`}>{ind.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {confirmed ? (
          <div className={`flex-1 py-4 rounded-xl text-center text-sm font-semibold border ${verdict.bg} ${verdict.border} ${verdict.text}`}>
            {forged ? '✕ Case flagged — traveler retained for inspection' : '✓ Traveler cleared — case closed'}
          </div>
        ) : (
          <>
            <button
              onClick={() => setConfirmed(true)}
              className="flex-1 py-4 rounded-xl font-semibold text-sm text-white shadow-md transition-all hover:opacity-90"
              style={{ background: verdict.color }}
            >
              {forged ? '✕ Flag & Retain Traveler' : '✓ Confirm Clearance & Close Case'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-4 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Manual Review
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-4 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Screening() {
  const [step, setStep] = useState<Step>(1);
  const [forged, setForged] = useState(false);

  return (
    <div className="india-page flex h-screen flex-col overflow-hidden">
      <TopBar title="New Identity Screening" />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="heritage-grid flex-1 overflow-y-auto p-8">
          {/* Top bar */}
          <div className="relative mb-6 overflow-hidden rounded-2xl bg-navy p-5 text-white shadow-lg">
            <img
              src="https://images.unsplash.com/photo-1595658658481-d53d3f999875?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
              alt=""
              className="absolute inset-0 size-full object-cover object-center opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy/75 via-navy/45 to-emerald-950/20" />
            <div className="relative">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-300">Identity operations</div>
              <h1 className="mt-1 text-xl font-bold">New Identity Screening</h1>
              <p className="mt-0.5 text-xs text-white/60">Verify every traveler with dignity, accuracy, and care.</p>
            </div>
          </div>

          <StepIndicator current={step} />

          {step === 1 && <CaptureStep onNext={() => setStep(2)} />}
          {step === 2 && <PipelineStep onNext={(f) => { setForged(f); setStep(3); }} />}
          {step === 3 && <VerificationStep forged={forged} />}
        </div>
      </div>
    </div>
  );
}
