import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMe, logoutUser } from '../../entities/auth/api';
import { useAuthStore } from '../../features/auth/model/auth-store';
import { authQueryKeys } from '../../features/auth/model/query-keys';
import { getErrorMessage, getErrorStatus } from '../api/errors';
import { buttonClassNames } from './button-class-names';

const navLinkClassName =
  'inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

export function AppNavigation() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  const meQuery = useQuery({
    queryKey: authQueryKeys.me,
    queryFn: getMe,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: authQueryKeys.me });
      queryClient.removeQueries({ queryKey: authQueryKeys.me });
      clearUser();
      toast.success('Вы вышли из аккаунта.');
      navigate('/login', { replace: true });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Не удалось выйти из системы.'));
    },
  });

  useEffect(() => {
    if (meQuery.data) {
      setUser(meQuery.data);
      return;
    }

    if (meQuery.isError && getErrorStatus(meQuery.error) === 401) {
      clearUser();
    }
  }, [clearUser, meQuery.data, meQuery.error, meQuery.isError, setUser]);

  useEffect(() => {
    if (!meQuery.isError) {
      return;
    }

    if (getErrorStatus(meQuery.error) === 401) {
      return;
    }

    toast.error(getErrorMessage(meQuery.error, 'Не удалось получить данные пользователя.'));
  }, [meQuery.error, meQuery.isError]);

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/80 p-2 shadow-lg shadow-slate-950/20">
      <div className="flex flex-wrap gap-2">
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
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {meQuery.isLoading ? (
          <div className="h-10 w-48 animate-pulse rounded-2xl border border-slate-700 bg-slate-800/70" />
        ) : null}

        {!meQuery.isLoading && user ? (
          <>
            <span className="inline-flex h-10 items-center rounded-2xl border border-violet-400/40 bg-violet-500/10 px-4 text-sm font-medium text-violet-100">
              {user.email}
            </span>
            <button
              className={buttonClassNames({ variant: 'secondary' })}
              disabled={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
              type="button"
            >
              {logoutMutation.isPending ? 'Выход...' : 'Выйти'}
            </button>
          </>
        ) : null}

        {!meQuery.isLoading && !user ? (
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
        ) : null}
      </div>
    </nav>
  );
}
