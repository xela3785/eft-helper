import { NavLink } from 'react-router-dom';
import { setStoredDashboardView } from '../../../shared/lib/dashboard-view';

const baseClassName =
  'inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

export function DashboardViewSwitcher() {
  return (
    <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-1">
      <NavLink
        className={({ isActive }) =>
          [
            baseClassName,
            isActive
              ? 'border-violet-400 bg-violet-500 text-slate-950'
              : 'border-transparent bg-transparent text-slate-200 hover:bg-slate-800/80 hover:text-white',
          ].join(' ')
        }
        end
        onClick={() => setStoredDashboardView('expanded')}
        to="/dashboard"
      >
        Крупный вид
      </NavLink>
      <NavLink
        className={({ isActive }) =>
          [
            baseClassName,
            isActive
              ? 'border-violet-400 bg-violet-500 text-slate-950'
              : 'border-transparent bg-transparent text-slate-200 hover:bg-slate-800/80 hover:text-white',
          ].join(' ')
        }
        onClick={() => setStoredDashboardView('compact')}
        to="/dashboard-compact"
      >
        Компактный вид
      </NavLink>
    </div>
  );
}
