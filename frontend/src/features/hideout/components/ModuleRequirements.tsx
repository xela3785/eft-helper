import clsx from 'clsx';
import { toast } from 'react-toastify';
import type { HideoutModuleLevel, RequirementItem } from '../../../entities/module/types';
import { getErrorMessage } from '../../../shared/api/errors';
import { Button } from '../../../shared/ui/Button';
import { getRequirementCollected, getRequirementFillAmount, numberFormatter } from '../lib/progress';
import { useHideoutProgressStore } from '../model/progress-store';
import type { ModuleProgress } from '../model/types';

interface ModuleRequirementsProps {
  moduleId: string;
  level: HideoutModuleLevel;
  progress?: ModuleProgress;
  compact?: boolean;
  editable?: boolean;
}

function getRequirementTotal(requirement: RequirementItem) {
  return requirement.count ?? requirement.quantity ?? 0;
}

export function ModuleRequirements({
  moduleId,
  level,
  progress,
  compact = false,
  editable = true,
}: ModuleRequirementsProps) {
  const incrementItem = useHideoutProgressStore((state) => state.incrementItem);
  const decrementItem = useHideoutProgressStore((state) => state.decrementItem);
  const fillLevelRequirements = useHideoutProgressStore((state) => state.fillLevelRequirements);

  async function handleIncrement(requirement: RequirementItem) {
    try {
      await incrementItem(moduleId, level.id, requirement.id, getRequirementTotal(requirement), requirement.item.id);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось сохранить прогресс и синхронизировать его с сервером.'));
    }
  }

  async function handleDecrement(requirement: RequirementItem) {
    try {
      await decrementItem(moduleId, level.id, requirement.id, requirement.item.id);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось сохранить прогресс и синхронизировать его с сервером.'));
    }
  }

  async function handleFillRequirement(requirement: RequirementItem) {
    const total = getRequirementTotal(requirement);
    const collected = Math.min(getRequirementCollected(progress, level.id, requirement.id), total);
    const nextValue = collected >= total ? 0 : getRequirementFillAmount(requirement);

    try {
      await fillLevelRequirements(moduleId, level.id, [
        {
          requirementId: requirement.id,
          maxCount: nextValue,
          itemId: requirement.item.id,
        },
      ]);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось обновить прогресс предмета и синхронизировать его.'));
    }
  }

  function hasFoundInRaidAttribute(requirement: RequirementItem) {
    return requirement.attributes?.some(
      (attribute) => attribute.name === 'foundInRaid' && attribute.value === 'true',
    );
  }

  if (level.itemRequirements.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-5 text-sm text-slate-400">
        Для этого уровня не требуется собирать дополнительные предметы.
      </p>
    );
  }

  return (
    <ul className={clsx('space-y-3', compact && 'space-y-2')}>
      {level.itemRequirements.map((requirement) => {
        const total = getRequirementTotal(requirement);
        const collected = Math.min(getRequirementCollected(progress, level.id, requirement.id), total);
        const isComplete = collected >= total;
        const isFoundInRaid = hasFoundInRaidAttribute(requirement);

        return (
          <li
            key={requirement.id}
            className={clsx(
              'rounded-2xl border p-3 transition-colors',
              compact ? 'border-slate-800 bg-slate-950/60' : 'border-slate-800 bg-slate-950/70',
              isComplete && 'border-emerald-500/40 bg-emerald-500/10',
            )}
          >
            <div className="flex items-start gap-3">
              {requirement.item.iconLink ? (
                <img
                  alt={requirement.item.name}
                  className="mt-0.5 size-11 rounded-xl border border-slate-700 bg-slate-900 object-cover"
                  src={requirement.item.iconLink}
                />
              ) : (
                <div className="mt-0.5 flex size-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-sm font-semibold text-slate-200">
                  {requirement.item.shortName.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      {isFoundInRaid ? (
                        <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-500/15 text-[11px] font-bold text-emerald-300">
                          ✓
                        </span>
                      ) : null}
                      <p className="break-words font-medium text-slate-100">{requirement.item.name}</p>
                    </div>
                    <p className="text-sm text-slate-400">{requirement.item.shortName}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-start rounded-2xl border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-sm text-slate-300">
                    <Button
                      className="h-10 w-10 shrink-0 px-0 py-0"
                      disabled={!editable || collected === 0}
                      onClick={() => void handleDecrement(requirement)}
                      type="button"
                      variant="ghost"
                    >
                      -
                    </Button>
                    <button
                      className="whitespace-nowrap font-medium text-slate-100 transition hover:text-violet-300 disabled:cursor-not-allowed disabled:text-slate-500"
                      disabled={!editable}
                      onClick={() => void handleFillRequirement(requirement)}
                      type="button"
                    >
                      {numberFormatter.format(collected)} / {numberFormatter.format(total)}
                    </button>
                    <Button
                      className="h-10 w-10 shrink-0 px-0 py-0"
                      disabled={!editable || collected >= total}
                      onClick={() => void handleIncrement(requirement)}
                      type="button"
                      variant="ghost"
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
