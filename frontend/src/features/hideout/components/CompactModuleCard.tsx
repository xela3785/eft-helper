import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { HideoutModule } from '../../../entities/module/types';
import { getErrorMessage } from '../../../shared/api/errors';
import { Button } from '../../../shared/ui/Button';
import { Modal } from '../../../shared/ui/Modal';
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

interface CompactModuleCardProps {
  module: HideoutModule;
}

export function CompactModuleCard({ module }: CompactModuleCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const statusLabel = summary.isMaxLevel
    ? 'Макс'
    : summary.canBuild
      ? 'Готов'
      : summary.blockedByStationRequirements
        ? 'Заблокирован'
        : 'В процессе';

  const statusClassName = summary.isMaxLevel
    ? 'border-slate-700 bg-slate-800/70 text-slate-300'
    : summary.canBuild
      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
      : summary.blockedByStationRequirements
        ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
        : 'border-violet-500/40 bg-violet-500/15 text-violet-200';

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
      toast.error(getErrorMessage(error, 'Не удалось сохранить прогресс и синхронизировать предметы с сервером.'));
    }
  }

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
      toast.error(getErrorMessage(error, 'Не удалось сохранить прогресс модуля и синхронизировать его с сервером.'));
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
      toast.error(getErrorMessage(error, 'Не удалось сохранить прогресс модуля и синхронизировать его с сервером.'));
    }
  }

  return (
    <>
      <article
        className={[
          'rounded-2xl border bg-slate-900/70 p-3 shadow-md shadow-slate-950/20',
          summary.canBuild ? 'border-emerald-400/70' : 'border-slate-800',
        ].join(' ')}
      >
        <div className="flex items-start gap-3">
          <Link className="flex min-w-0 flex-1 items-start gap-3" to={`/module/${module.id}`}>
            <ModuleIcon module={module} size="sm" />

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[10px] uppercase tracking-[0.2em] text-violet-300/80">
                    {module.normalizedName}
                  </p>
                  <h2 className="truncate text-sm font-semibold text-slate-50 hover:text-violet-300">
                    {module.name}
                  </h2>
                </div>
                <span className={['rounded-lg border px-2 py-0.5 text-[10px] font-medium', statusClassName].join(' ')}>
                  {statusLabel}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>
                  Ур. {summary.currentLevelNumber}/{summary.maxLevel}
                </span>
                <span>{targetLevel ? `След. ${targetLevel.level}` : 'Макс. уровень'}</span>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-2">
          <ProgressBar value={summary.completionPercent} />
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-400">
          <span className="rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-0.5">
            Предм. {numberFormatter.format(summary.collectedRequired)} / {numberFormatter.format(summary.totalRequired)}
          </span>
          <span className="rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-0.5">
            Мод. {numberFormatter.format(summary.stationRequirements.metRequirements)} /{' '}
            {numberFormatter.format(summary.stationRequirements.totalRequirements)}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button className="min-w-0 px-2 py-1.5 text-[11px]" disabled={!targetLevel} onClick={() => void handleCollectAll()}>
            {targetLevel ? (isLevelFullyCollected ? 'Сбросить все' : 'Собрать все') : 'Собирать не нужно'}
          </Button>
          <Button className="min-w-0 px-2 py-1.5 text-[11px]" onClick={() => setIsModalOpen(true)} variant="secondary">
            Открыть сбор
          </Button>
        </div>
      </article>

      {isModalOpen ? (
        <Modal onClose={() => setIsModalOpen(false)}>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-2xl shadow-slate-950/50 sm:p-5">
            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 border-b border-slate-800 bg-slate-900/95 px-4 py-4 backdrop-blur sm:-mx-5 sm:-mt-5 sm:px-5 sm:py-5">
              <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <ModuleIcon module={module} />
                <div className="min-w-0">
                  <Link className="block" to={`/module/${module.id}`} onClick={() => setIsModalOpen(false)}>
                    <h2 className="truncate text-xl font-semibold text-slate-50 hover:text-violet-300">
                      {module.name}
                    </h2>
                  </Link>
                  <p className="mt-1 text-sm text-slate-400">
                    Уровень {summary.currentLevelNumber} / {summary.maxLevel}
                  </p>
                </div>
              </div>
              <Button className="px-2 py-1.5 text-[11px]" onClick={() => setIsModalOpen(false)} type="button" variant="ghost">
                Закрыть
              </Button>
            </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
                {targetLevel ? (
                  <>
                    <span>
                      Собрано {numberFormatter.format(summary.collectedRequired)} /{' '}
                      {numberFormatter.format(summary.totalRequired)}
                    </span>
                    <span>{formatConstructionTime(targetLevel.constructionTime)}</span>
                  </>
                ) : (
                  <span>Все улучшения завершены</span>
                )}
              </div>
              <ProgressBar className="mt-3" value={summary.completionPercent} />
            </div>

            {targetLevel && summary.stationRequirements.totalRequirements > 0 ? (
              <div className="mt-4 space-y-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <h3 className="text-sm font-semibold text-slate-100">Зависимости по модулям</h3>
                <ul className="space-y-2">
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

            <div className="mt-4">
              {targetLevel ? (
                <ModuleRequirements compact editable level={targetLevel} moduleId={module.id} progress={progress} />
              ) : (
                <p className="rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-200">
                  Модуль уже улучшен до максимального уровня.
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button className="min-w-0 px-3 py-2 text-xs" disabled={!targetLevel} onClick={() => void handleCollectAll()}>
                {targetLevel ? (isLevelFullyCollected ? 'Сбросить все' : 'Собрать все') : 'Собирать не нужно'}
              </Button>
              <Button className="min-w-0 px-3 py-2 text-xs" disabled={summary.isMaxLevel || !canUpgrade} onClick={() => void handleUpgrade()}>
                {summary.isMaxLevel
                  ? 'Максимальный уровень'
                  : canUpgrade
                    ? `Повысить до уровня ${targetLevel!.level}`
                    : summary.blockedByStationRequirements
                      ? 'Постройте требуемые модули'
                      : 'Соберите предметы для следующего уровня'}
              </Button>
              <Button
                className="min-w-0 px-3 py-2 text-xs"
                disabled={summary.isMinLevel || summary.isLevelLocked}
                onClick={() => void handleDowngrade()}
              >
                {summary.isLevelLocked
                  ? 'Уровень зафиксирован'
                  : summary.isMinLevel
                    ? 'Минимальный уровень'
                    : `Понизить до ${summary.currentLevelNumber - 1}`}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
