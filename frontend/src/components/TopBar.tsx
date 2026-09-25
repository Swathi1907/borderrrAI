import indiaEmblem from '../imports/image.png';

interface Props {
  title?: string;
}

export function IndiaEmblem() {
  return (
    <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-white p-0.5 shadow-sm">
      <img
        src={indiaEmblem}
        alt="National Emblem of India"
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}

export function BorderAILogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="text-sm font-bold tracking-tight text-slate-900">BorderAI</div>
        <div className="text-[8px] font-semibold uppercase tracking-[0.2em] text-slate-400">India identity intelligence</div>
      </div>
      <div className="flex size-9 items-center justify-center rounded-xl bg-navy text-white shadow-sm">
        <svg className="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1.5 14 4.8v4.8L8 14 2 9.6V4.8L8 1.5Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="m5.2 7.7 1.7 1.7 3.8-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

export default function TopBar({ title = 'Identity Operations' }: Props) {
  return (
    <div className="relative flex h-[4.75rem] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 shadow-sm lg:px-4">
      <div className="absolute inset-x-0 top-0 flex h-1" aria-hidden="true">
        <span className="flex-1 bg-orange-400" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-emerald-600" />
      </div>
      <div className="flex min-w-0 items-center gap-4">
        <IndiaEmblem />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-800">{title}</div>
          <div className="mt-0.5 hidden text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:block">
            Government-authorized secure operations
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <BorderAILogo />
      </div>
    </div>
  );
}
