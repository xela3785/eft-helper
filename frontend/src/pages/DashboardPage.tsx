import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { getHideoutModules } from '../entities/module/api';
import { useAuthStore } from '../features/auth/model/auth-store';
import { DashboardViewSwitcher } from '../features/hideout/components/DashboardViewSwitcher';
import { ModuleCard } from '../features/hideout/components/ModuleCard';
import { ModuleGridSkeleton } from '../features/hideout/components/ModuleGridSkeleton';
import { getModuleBuildSortOrder } from '../features/hideout/lib/progress';
import { useHideoutProgressStore } from '../features/hideout/model/progress-store';
import { getErrorMessage } from '../shared/api/errors';
import { setStoredDashboardView } from '../shared/lib/dashboard-view';
import { EmptyState } from '../shared/ui/EmptyState';
import { PageShell } from '../shared/ui/PageShell';


export function DashboardPage() {
  const initializeProgress = useHideoutProgressStore((state) => state.initializeProgress);
  const isHydrated = useHideoutProgressStore((state) => state.isHydrated);
  const lastSyncedAt = useHideoutProgressStore((state) => state.lastSyncedAt);
  const progressModules = useHideoutProgressStore((state) => state.modules);
  const userId = useAuthStore((state) => state.user?.id ?? null);

  useEffect(() => {
    void initializeProgress();
  }, [initializeProgress, userId]);

  useEffect(() => {
    setStoredDashboardView('expanded');
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['hideout-modules'],
    queryFn: getHideoutModules,
  });

  useEffect(() => {
    if (!error) {
      return;
    }

    toast.error(getErrorMessage(error, 'Не удалось загрузить список модулей убежища.'));
  }, [error]);

  const modules = useMemo(
    () =>
      [...(data ?? [])].sort((leftModule, rightModule) => {
        const leftOrder = getModuleBuildSortOrder(
          leftModule,
          progressModules[leftModule.id],
          progressModules,
        );
        const rightOrder = getModuleBuildSortOrder(
          rightModule,
          progressModules[rightModule.id],
          progressModules,
        );

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return leftModule.name.localeCompare(rightModule.name, 'ru');
      }),
    [data, progressModules],
  );

  return (
    <PageShell
      eyebrow="Escape from Tarkov"
      title="Прогресс убежища"
      actions={<DashboardViewSwitcher />}
    >
      <section className="mt-8">
        <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">Список модулей</h2>
          </div>
          <p className="text-sm text-slate-400">
            Последнее обновление прогресса:{' '}
            <span className="text-slate-200">
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString('ru-RU') : 'еще не выполнялась'}
            </span>
          </p>
        </div>

        {isLoading || !isHydrated ? <ModuleGridSkeleton count={6} /> : null}

        {!isLoading && isHydrated && modules.length === 0 ? (
          <EmptyState
            title="Модули пока недоступны"
            description="Проверьте, что backend запущен и API `/api/v1/hideout/module/list` возвращает данные."
          />
        ) : null}

        {!isLoading && isHydrated && modules.length > 0 ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {modules.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        ) : null}
      </section>

    </PageShell>
  );
}
