import { NavLink } from 'react-router-dom';

const navLinkClassName =
  'inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

export function AppNavigation() {
  return (
    <nav className="mb-6 flex flex-wrap gap-2 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/80 p-2 shadow-lg shadow-slate-950/20">
      <NavLink
        className={({ isActive }) =>
          [
            navLinkClassName,
            isActive
              ? 'border-violet-400 bg-violet-500 text-slate-950'
              : 'border-transparent bg-transparent text-slate-200 hover:bg-slate-800/80 hover:text-white',
          ].join(' ')
        }
        end
        to="/"
      >
        EFT-helper
      </NavLink>
      <NavLink
        className={({ isActive }) =>
          [
            navLinkClassName,
            isActive
              ? 'border-violet-400 bg-violet-500 text-slate-950'
              : 'border-transparent bg-transparent text-slate-200 hover:bg-slate-800/80 hover:text-white',
          ].join(' ')
        }
        to="/market"
      >
        Маркет
      </NavLink>
      <NavLink
        className={({ isActive }) =>
          [
            navLinkClassName,
            isActive
              ? 'border-violet-400 bg-violet-500 text-slate-950'
              : 'border-transparent bg-transparent text-slate-200 hover:bg-slate-800/80 hover:text-white',
          ].join(' ')
        }
        to="/items"
      >
        Предметы
      </NavLink>
      <NavLink
        className={({ isActive }) =>
          [
            navLinkClassName,
            isActive
              ? 'border-violet-400 bg-violet-500 text-slate-950'
              : 'border-transparent bg-transparent text-slate-200 hover:bg-slate-800/80 hover:text-white',
          ].join(' ')
        }
        to="/login"
      >
        Вход/Регистрация
      </NavLink>
    </nav>
  );
}
