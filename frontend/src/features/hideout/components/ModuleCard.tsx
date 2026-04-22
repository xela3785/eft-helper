import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { HideoutModule } from '../../../entities/module/types';
import { getErrorMessage } from '../../../shared/api/errors';
import { Button } from '../../../shared/ui/Button';
import { ProgressBar } from '../../../shared/ui/ProgressBar';
import {
  formatConstructionTime,
  getModuleBuildAvailabilitySummary,
  getRequirementFillAmount,
  getTrackedModuleLevel,
  numberFormatter,
} from '../lib/progress';
import { useHideoutProgressStore } from '../model/progress-store';
import { ModuleIcon } from './ModuleIcon';
import { ModuleRequirements } from './ModuleRequirements';

interface ModuleCardProps {
  module: HideoutModule;
}

export function ModuleCard({ module }: ModuleCardProps) {
  const progressModules = useHideoutProgressStore((state) => state.modules);
  const progress = useHideoutProgressStore((state) => state.modules[module.id]);
  const upgradeModule = useHideoutProgressStore((state) => state.upgradeModule);
  const downgradeModule = useHideoutProgressStore((state) => state.downgradeModule);
  const fillLevelRequirements = useHideoutProgressStore((state) => state.fillLevelRequirements);
  const summary = getModuleBuildAvailabilitySummary(module, progress, progressModules);
  const targetLevel = summary.nextLevel;
  const isLevelFullyCollected =
    Boolean(targetLevel) &&
    summary.totalRequired > 0 &&
    summary.collectedRequired >= summary.totalRequired;
  const canUpgrade =
    Boolean(targetLevel) &&
    summary.itemRequirementsMet &&
    summary.stationRequirements.allMet;

  async function handleUpgrade() {
    if (summary.isMaxLevel) {
      toast.info('Этот модуль уже находится на максимальном уровне.');
      return;
    }

    if (!canUpgrade) {
      toast.info('Сначала закройте все требования следующего уровня.');
      return;
    }

    try {
      await upgradeModule(module.id, targetLevel!.level, summary.maxLevel);
      toast.success(`Уровень модуля ${module.name} повышен.`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось сохранить новый уровень модуля.'));
    }
  }

  async function handleDowngrade() {
    if (summary.isMinLevel) {
      toast.info('Этот модуль минимального уровня.');
      return;
    }

    try {
      await downgradeModule(module.id, summary.currentLevelNumber - 1, 0);
      toast.success(`Уровень модуля ${module.name} понижен.`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось сохранить новый уровень модуля.'));
    }
  }

  async function handleCollectAll() {
    if (!targetLevel) {
      toast.info('Для этого модуля больше нечего собирать.');
      return;
    }

    try {
      await fillLevelRequirements(
        module.id,
        targetLevel.id,
        targetLevel.itemRequirements.map((requirement) => ({
          requirementId: requirement.id,
          maxCount: isLevelFullyCollected ? 0 : getRequirementFillAmount(requirement),
          itemId: requirement.item.id,
        })),
      );
      toast.success(
        isLevelFullyCollected
          ? `Прогресс предметов для ${module.name} сброшен.`
          : `Все предметы для ${module.name} отмечены как собранные.`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось заполнить предметы текущего уровня.'));
    }
  }

  return (
    <article
      className={[
        'flex h-full flex-col rounded-3xl border bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30',
        summary.canBuild
          ? 'border-emerald-400/70 shadow-emerald-950/20'
          : 'border-slate-800',
      ].join(' ')}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Link className="flex min-w-0 items-center gap-4" to={`/module/${module.id}`}>
          <ModuleIcon module={module} />
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.28em] text-violet-300/80">{module.normalizedName}</p>
            <h2 className="mt-1 truncate text-xl font-semibold text-slate-50 hover:text-violet-300">
              {module.name}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Уровень {summary.currentLevelNumber} из {summary.maxLevel}
            </p>
          </div>
        </Link>

        <button
          className="shrink-0 self-start rounded-lg px-2 py-1 text-xs font-medium text-violet-300 transition hover:text-violet-200 hover:underline disabled:cursor-not-allowed disabled:text-slate-500 disabled:no-underline"
          disabled={!targetLevel}
          onClick={() => void handleCollectAll()}
          type="button"
        >
          {targetLevel ? (isLevelFullyCollected ? 'Сбросить все' : 'Собрать все') : 'Собирать не нужно'}
        </button>
      </div>

      {summary.canBuild ? (
        <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Модуль готов к постройке
        </div>
      ) : null}

      <p className="mt-5 text-sm leading-6 text-slate-300">
        {targetLevel?.description || 'Требования для следующего уровня отсутствуют.'}
      </p>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
          {targetLevel ? (
            <>
              <span>
                Собрано {numberFormatter.format(summary.collectedRequired)} /{' '}
                {numberFormatter.format(summary.totalRequired)}
              </span>
              <span>{formatConstructionTime(targetLevel.constructionTime)}</span>
            </>
          ) : (
            <>
              <span>Все улучшения завершены</span>
              <span>{formatConstructionTime(0)}</span>
            </>
          )}
        </div>
        <ProgressBar className="mt-3" value={summary.completionPercent} />
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
        <span>Требований: {numberFormatter.format(targetLevel?.itemRequirements.length ?? 0)}</span>
        <span>
          Модулей: {numberFormatter.format(summary.stationRequirements.metRequirements)} /{' '}
          {numberFormatter.format(summary.stationRequirements.totalRequirements)}
        </span>
        <span>Крафтов: {numberFormatter.format(targetLevel?.crafts?.length ?? 0)}</span>
      </div>

      {targetLevel && summary.stationRequirements.totalRequirements > 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-100">Требования по другим модулям</h3>
            <span className="text-xs text-slate-400">
              {summary.stationRequirements.allMet ? 'Все выполнены' : 'Есть блокирующие зависимости'}
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {summary.stationRequirements.visibleRequirements.map((requirement) => {
              const currentStationLevel = getTrackedModuleLevel(progressModules, requirement.station.id);
              const isMet = currentStationLevel >= requirement.level;

              return (
                <li
                  key={requirement.id}
                  className={[
                    'flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm',
                    isMet
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-200',
                  ].join(' ')}
                >
                  <span className="min-w-0 break-words">
                    {requirement.station.name} {requirement.level} ур.
                  </span>
                  <span className="shrink-0 text-xs">
                    Сейчас: {currentStationLevel}/{requirement.level}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 flex-1">
        {targetLevel ? (
          <ModuleRequirements compact level={targetLevel} moduleId={module.id} progress={progress} />
        ) : (
          <p className="rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-200">
            Модуль уже улучшен до максимального уровня.
          </p>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 text-sm text-slate-400">
        <Button className="min-w-0" disabled={summary.isMaxLevel || !canUpgrade} onClick={() => void handleUpgrade()}>
          {summary.isMaxLevel
            ? 'Максимальный уровень'
            : canUpgrade
              ? `Повысить до уровня ${targetLevel!.level}`
              : summary.blockedByStationRequirements
                ? 'Постройте требуемые модули'
                : 'Соберите предметы для следующего уровня'}
        </Button>
        <Button className="min-w-0" disabled={summary.isMinLevel || summary.isLevelLocked} onClick={() => void handleDowngrade()}>
          {summary.isLevelLocked
            ? 'Уровень зафиксирован'
            : summary.isMinLevel
              ? 'Минимальный уровень'
              : `Понизить до ${summary.currentLevelNumber - 1}`}
        </Button>
      </div>
    </article>
  );
}
