import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const navItems = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: <path d="M3 3h6v6H3V3Zm0 12h6v6H3v-6Zm12-12h6v6h-6V3Zm0 12h6v6h-6v-6Z" />,
  },
  {
    label: 'New screening',
    to: '/screening',
    icon: <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  },
];

interface Props {
  officer?: string;
}

export default function Sidebar({ officer = 'Ashish Divvela' }: Props) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  function logOut() {
    setProfileOpen(false);
    navigate('/');
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <nav className="flex-1 px-3 py-7" aria-label="Primary navigation">
        <div className="mb-3 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</div>
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-orange-800 shadow-sm ring-1 ring-orange-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                {item.icon}
              </svg>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="border-t border-slate-100 p-4">
        {profileOpen && (
          <div className="mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            <button
              onClick={logOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Log out
            </button>
          </div>
        )}
        <button
          onClick={() => setProfileOpen((open) => !open)}
          aria-expanded={profileOpen}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition-colors hover:border-slate-200 hover:bg-white"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
            {officer.split(' ').map((name) => name[0]).join('')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-semibold text-slate-700">{officer}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[9px] text-slate-400">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Officer on duty
            </div>
          </div>
          <svg className={`size-3.5 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
