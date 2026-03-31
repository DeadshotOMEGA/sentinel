'use client'

import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { cn } from '@/lib/utils'
import type { ChecklistBlock } from '@/lib/dds-content'
import { getTaskKey } from '@/hooks/use-dds-checklist'

interface DdsChecklistCardProps {
  checkoffMap: Record<string, boolean>
  checklistBlocks: ChecklistBlock[]
  completedTasks: number
  completionPercent: number
  description?: string
  onToggleTask: (blockId: string, taskIndex: number) => void
  title?: string
  totalTasks: number
  showHeader?: boolean
  className?: string
  renderAsCard?: boolean
}

export function DdsChecklistCard({
  checkoffMap,
  checklistBlocks,
  completedTasks,
  completionPercent,
  description,
  onToggleTask,
  title = 'Daily Checklist',
  totalTasks,
  showHeader = true,
  className,
  renderAsCard = true,
}: DdsChecklistCardProps) {
  const useDaisyTaskList = !renderAsCard

  const checklistContent = (
    <>
      <div className="w-full">
        <progress
          className="progress progress-primary w-full"
          value={completionPercent}
          max={100}
        />
        <div className="mt-1 text-xs text-base-content/70">
          Progress: {completionPercent}% ({completedTasks}/{totalTasks})
        </div>
      </div>

      {checklistBlocks.map((block) => (
        <section
          key={block.id}
          className="border border-base-300 bg-base-100"
          style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-3)' }}
        >
          <div className="grid gap-(--space-1)">
            <h3 className="font-semibold text-sm">{block.timeLabel}</h3>
            {block.heading ? <p className="text-xs text-base-content/70">{block.heading}</p> : null}
          </div>

          {useDaisyTaskList ? (
            <ul className="list border border-base-300 bg-base-100">
              {block.tasks.map((task, taskIndex) => {
                const taskKey = getTaskKey(block.id, taskIndex)
                const checked = checkoffMap[taskKey] ?? false

                return (
                  <li
                    key={taskKey}
                    className={cn(
                      'list-row px-(--space-2) py-(--space-2)',
                      checked && 'bg-success-fadded text-success-fadded-content'
                    )}
                  >
                    <label className="flex w-full cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary checkbox-sm mt-0.5 shrink-0"
                        checked={checked}
                        onChange={() => onToggleTask(block.id, taskIndex)}
                        data-testid={`dds-task-${block.id}-${taskIndex}`}
                      />
                      <span
                        className={cn(
                          'list-col-grow min-w-0 whitespace-normal wrap-break-word text-xs',
                          checked && 'line-through text-base-content/60'
                        )}
                      >
                        {task}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
              {block.tasks.map((task, taskIndex) => {
                const taskKey = getTaskKey(block.id, taskIndex)
                const checked = checkoffMap[taskKey] ?? false

                return (
                  <label
                    key={taskKey}
                    className={cn(
                      'label w-full max-w-full cursor-pointer items-start justify-start gap-3 border border-base-300 bg-base-100',
                      checked && 'bg-success-fadded'
                    )}
                    style={{ padding: 'var(--space-2)' }}
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm shrink-0"
                      checked={checked}
                      onChange={() => onToggleTask(block.id, taskIndex)}
                      data-testid={`dds-task-${block.id}-${taskIndex}`}
                    />
                    <span
                      className={cn(
                        'min-w-0 flex-1 whitespace-normal wrap-break-word text-xs',
                        checked && 'line-through text-base-content/60'
                      )}
                    >
                      {task}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </section>
      ))}
    </>
  )

  if (!renderAsCard) {
    return <div className={cn('grid gap-(--space-4)', className)}>{checklistContent}</div>
  }

  return (
    <AppCard className={className}>
      {showHeader ? (
        <AppCardHeader>
          <div className="grid gap-(--space-1)">
            <AppCardTitle>{title}</AppCardTitle>
            {description ? <AppCardDescription>{description}</AppCardDescription> : null}
          </div>
        </AppCardHeader>
      ) : null}

      <AppCardContent style={{ display: 'grid', gap: 'var(--space-4)' }}>
        {checklistContent}
      </AppCardContent>
    </AppCard>
  )
}
