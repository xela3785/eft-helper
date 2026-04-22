import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getHideoutModule } from '../entities/module/api';
import { ModuleRequirements } from '../features/hideout/components/ModuleRequirements';
import {
  formatConstructionTime,
  getModuleBuildAvailabilitySummary,
  getLevelProgressSummary,
  getTrackedModuleLevel,
  numberFormatter,
} from '../features/hideout/lib/progress';
import { useHideoutProgressStore } from '../features/hideout/model/progress-store';
import { getErrorMessage } from '../shared/api/errors';
import { buttonClassNames, Button } from '../shared/ui/Button';
import { EmptyState } from '../shared/ui/EmptyState';
import { PageShell } from '../shared/ui/PageShell';
import { ProgressBar } from '../shared/ui/ProgressBar';

export function ModuleDetailPage() {
  const { moduleId = '' } = useParams();
  const initializeProgress = useHideoutProgressStore((state) => state.initializeProgress);
  const isHydrated = useHideoutProgressStore((state) => state.isHydrated);
  const progressModules = useHideoutProgressStore((state) => state.modules);
  const progress = useHideoutProgressStore((state) => state.modules[moduleId]);
  const upgradeModule = useHideoutProgressStore((state) => state.upgradeModule);

  useEffect(() => {
    void initializeProgress();
  }, [initializeProgress]);

  const { data: module, isLoading, error } = useQuery({
    queryKey: ['hideout-module', moduleId],
    queryFn: () => getHideoutModule(moduleId),
    enabled: Boolean(moduleId),
  });

  useEffect(() => {
    if (!error) {
      return;
    }

    toast.error(getErrorMessage(error, 'Не удалось загрузить детали модуля.'));
  }, [error]);

  if (!moduleId) {
    return <Navigate to="/" replace />;
  }

  if (!module && !isLoading && isHydrated) {
    return (
      <PageShell
        eyebrow="Детали модуля"
        title="Модуль не найден"
        description="Вернитесь к списку и попробуйте открыть модуль повторно."
        actions={
          <Link className={buttonClassNames()} to="/">
            Назад к дашборду
          </Link>
        }
      >
        <EmptyState
          title="Не удалось найти модуль"
          description="Backend не вернул данные по запрошенному идентификатору."
        />
      </PageShell>
    );
  }

  const summary = module ? getModuleBuildAvailabilitySummary(module, progress, progressModules) : null;
  const targetLevel = summary?.nextLevel ?? null;
  const canUpgrade = summary
    ? Boolean(targetLevel) &&
      summary.itemRequirementsMet &&
      summary.stationRequirements.allMet
    : false;

  async function handleUpgrade() {
    if (!summary) {
      return;
    }

    if (summary.isMaxLevel) {
      toast.info('Этот модуль уже находится на максимальном уровне.');
      return;
    }

    if (!canUpgrade) {
      toast.info('Сначала закройте все требования для следующего уровня.');
      return;
    }

    try {
      await upgradeModule(moduleId, targetLevel!.level, summary.maxLevel);
      toast.success(`Модуль повышен до уровня ${targetLevel!.level}.`);
    } catch (upgradeError) {
      toast.error(getErrorMessage(upgradeError, 'Не удалось обновить уровень модуля.'));
    }
  }

  return (
    <PageShell
      eyebrow="Детали модуля"
      title={module?.name ?? 'Загрузка модуля'}
      description="Подробный просмотр текущего уровня, прогресса по предметам и требований на следующих этапах развития."
      actions={
        <Link className={buttonClassNames()} to="/">
          Назад к дашборду
        </Link>
      }
    >
      {isLoading || !isHydrated || !module || !summary ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-[520px] animate-pulse rounded-3xl border border-slate-800 bg-slate-900/70" />
          <div className="h-[520px] animate-pulse rounded-3xl border border-slate-800 bg-slate-900/70" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-violet-300/80">{module.normalizedName}</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-50">
                  Текущий уровень {summary.currentLevelNumber}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  {targetLevel?.description ||
                    summary.currentLevel?.description ||
                    'Описание для этого модуля отсутствует.'}
                </p>
              </div>
              <Button className="shrink-0" onClick={() => void handleUpgrade()} disabled={summary.isMaxLevel || !canUpgrade}>
                {summary.isMaxLevel
                  ? 'Максимальный уровень'
                  : `Повысить до ${summary.currentLevelNumber + 1}`}
              </Button>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
                {targetLevel ? (
                  <>
                    <span>
                      Собрано {numberFormatter.format(summary.collectedRequired)} из{' '}
                      {numberFormatter.format(summary.totalRequired)}
                    </span>
                    <span>Время строительства: {formatConstructionTime(targetLevel.constructionTime)}</span>
                  </>
                ) : (
                  <>
                    <span>Все улучшения завершены</span>
                    <span>Время строительства: {formatConstructionTime(0)}</span>
                  </>
                )}
              </div>
              <ProgressBar className="mt-3" value={summary.completionPercent} />
            </div>

            {targetLevel && summary.stationRequirements.totalRequirements > 0 ? (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-slate-50">Требуемые модули</h3>
                  <span className="text-sm text-slate-400">
                    Выполнено {summary.stationRequirements.metRequirements} /{' '}
                    {summary.stationRequirements.totalRequirements}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {summary.stationRequirements.visibleRequirements.map((requirement) => {
                    const currentStationLevel = getTrackedModuleLevel(progressModules, requirement.station.id);
                    const isMet = currentStationLevel >= requirement.level;

                    return (
                      <div
                        key={requirement.id}
                        className={[
                          'flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3',
                          isMet
                            ? 'border-emerald-500/30 bg-emerald-500/10'
                            : 'border-amber-500/30 bg-amber-500/10',
                        ].join(' ')}
                      >
                        <div>
                          <p className="font-medium text-slate-100">
                            {requirement.station.name} {requirement.level} ур.
                          </p>
                          <p className="text-sm text-slate-400">
                            Текущий уровень: {currentStationLevel}
                          </p>
                        </div>
                        <span className={isMet ? 'text-sm text-emerald-200' : 'text-sm text-amber-200'}>
                          {isMet ? 'Готово' : 'Нужно улучшить'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-slate-50">
                {targetLevel ? `Предметы для уровня ${targetLevel.level}` : 'Максимальный уровень достигнут'}
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Изменения сохраняются локально сразу после каждого клика.
              </p>
              <div className="mt-4">
                {targetLevel ? (
                  <ModuleRequirements moduleId={module.id} level={targetLevel} progress={progress} />
                ) : (
                  <EmptyState
                    title="Больше улучшений не требуется"
                    description="Для этого модуля уже достигнут максимальный уровень."
                  />
                )}
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
            <h2 className="text-xl font-semibold text-slate-50">Все уровни модуля</h2>
            <div className="mt-5 space-y-4">
              {module.levels.map((level) => {
                const levelSummary = getLevelProgressSummary(level, progress);
                const isCurrentLevel =
                  level.id === targetLevel?.id ||
                  (summary.isMaxLevel && level.level === summary.currentLevelNumber);

                return (
                  <article
                    key={level.id}
                    className={[
                      'rounded-2xl border p-4 transition-colors',
                      isCurrentLevel
                        ? 'border-violet-400/60 bg-violet-500/10'
                        : 'border-slate-800 bg-slate-950/60',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-slate-50">Уровень {level.level}</h3>
                      <span className="text-xs text-slate-400">
                        {formatConstructionTime(level.constructionTime)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {level.description || 'Описание отсутствует.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                      <span>
                        Требований: {numberFormatter.format(level.itemRequirements.length)}
                      </span>
                      <span>
                        Собрано: {numberFormatter.format(levelSummary.collectedRequired)} /{' '}
                        {numberFormatter.format(levelSummary.totalRequired)}
                      </span>
                      <span>Крафтов: {numberFormatter.format(level.crafts?.length ?? 0)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </aside>
        </div>
      )}
    </PageShell>
  );
}
