import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';

const recentScreenings = [
  { id: 'INT-9934', traveler: 'Sofia Laurent', document: 'French ePassport', confidence: '99.1%', status: 'Verified' },
  { id: 'INT-9933', traveler: 'Kivid Matveuke', document: 'Estonian ePassport', confidence: '95.0%', status: 'Verified' },
  { id: 'INT-9932', traveler: 'Amara Okafor', document: 'Passport + visa', confidence: '72.3%', status: 'Review' },
  { id: 'INT-9931', traveler: 'Luka Petrović', document: 'Croatian national ID', confidence: '91.4%', status: 'Verified' },
];

function StatusBadge({ status }: { status: string }) {
  const isVerified = status === 'Verified';
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${
      isVerified
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-amber-200 bg-amber-50 text-amber-700'
    }`}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="india-page flex h-screen flex-col overflow-hidden">
      <TopBar title="National Border Intelligence Dashboard" />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="heritage-grid flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-5xl">
            <div className="relative mb-6 overflow-hidden rounded-2xl bg-navy px-6 py-6 text-white shadow-lg">
              <img
                src="https://images.unsplash.com/photo-1519955266818-0231b63402bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
                alt=""
                className="absolute inset-0 size-full object-cover opacity-75"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-navy/75 via-navy/50 to-emerald-950/25" />
              <div className="relative flex items-end justify-between gap-4">
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300">Operations overview</div>
                  <div className="text-2xl font-bold tracking-tight">Welcome back, Ashish</div>
                  <p className="mt-1 text-sm text-white/60">Safeguarding every journey with vigilance and respect.</p>
                </div>
                <button
                  onClick={() => navigate('/screening')}
                  className="flex shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-600"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  New screening
                </button>
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-3">
              {[
                { label: 'Screened today', value: '284', detail: 'Across all checkpoints' },
                { label: 'Verified', value: '271', detail: '95.4% clearance rate' },
                { label: 'Needs review', value: '13', detail: '3 high-priority cases' },
              ].map((item, index) => (
                <div key={item.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">{item.label}</span>
                    <span className={`size-2 rounded-full ${index === 2 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  </div>
                  <div className="text-3xl font-bold tracking-tight text-slate-900">{item.value}</div>
                  <div className="mt-1 text-[11px] text-slate-400">{item.detail}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Recent screenings</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">Latest identity verification results</div>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                    LIVE
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {recentScreenings.map((row) => (
                    <div key={row.id} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 sm:grid-cols-[6rem_1fr_1fr_auto]">
                      <span className="hidden font-mono text-[10px] text-slate-400 sm:block">{row.id}</span>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">{row.traveler}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400 sm:hidden">{row.document}</div>
                      </div>
                      <div className="hidden sm:block">
                        <div className="text-[11px] text-slate-500">{row.document}</div>
                        <div className="mt-0.5 text-[10px] font-semibold text-emerald-600">{row.confidence} confidence</div>
                      </div>
                      <StatusBadge status={row.status} />
                    </div>
                  ))}
                </div>
              </div>

              <aside className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="text-sm font-semibold text-slate-800">Attention required</div>
                <div className="mt-1 text-[11px] text-slate-400">Open items from this shift</div>
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-amber-700">Manual review</div>
                  <div className="mt-2 text-xs font-semibold text-slate-800">Biometric confidence below threshold</div>
                  <div className="mt-1 text-[11px] leading-relaxed text-slate-500">Case INT-9932 requires an officer decision.</div>
                </div>
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Review queue</span>
                    <span className="font-semibold text-slate-800">13 cases</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Average wait</span>
                    <span className="font-semibold text-slate-800">2m 14s</span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
