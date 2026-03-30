'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ChecklistBlock } from '@/lib/dds-content'

const CHECKOFF_STORAGE_PREFIX = 'dds.checkoff.v1'
const CHECKOFF_STORAGE_EVENT = 'sentinel:dds-checkoff-update'

type TaskCheckoffMap = Record<string, boolean>

interface UseDdsChecklistOptions {
  checklistBlocks: ChecklistBlock[]
  memberId?: string | null
  dateKey: string
}

interface DdsChecklistUpdateDetail {
  storageKey: string
  value: TaskCheckoffMap
}

function getStorageKey(memberId: string | null | undefined, dateKey: string): string {
  return `${CHECKOFF_STORAGE_PREFIX}.${memberId ?? 'anonymous'}.${dateKey}`
}

function parseStoredCheckoff(value: string | null): TaskCheckoffMap {
  if (!value) return {}

  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    return Object.entries(parsed).reduce<TaskCheckoffMap>((acc, [key, rawValue]) => {
      acc[key] = rawValue === true
      return acc
    }, {})
  } catch {
    return {}
  }
}

export function getTaskKey(blockId: string, taskIndex: number): string {
  return `${blockId}:${taskIndex}`
}

export function useDdsChecklist({ checklistBlocks, memberId, dateKey }: UseDdsChecklistOptions) {
  const storageKey = useMemo(() => getStorageKey(memberId, dateKey), [dateKey, memberId])
  const [checkoffMap, setCheckoffMap] = useState<TaskCheckoffMap>({})
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    setCheckoffMap(parseStoredCheckoff(window.localStorage.getItem(storageKey)))
    setIsHydrated(true)
  }, [storageKey])

  useEffect(() => {
    if (typeof window === 'undefined' || !isHydrated) return

    const serialized = JSON.stringify(checkoffMap)
    window.localStorage.setItem(storageKey, serialized)
    window.dispatchEvent(
      new window.CustomEvent<DdsChecklistUpdateDetail>(CHECKOFF_STORAGE_EVENT, {
        detail: {
          storageKey,
          value: checkoffMap,
        },
      })
    )
  }, [checkoffMap, isHydrated, storageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorage = (event: unknown) => {
      const storageEvent = event as { key: string | null; newValue: string | null }
      if (storageEvent.key !== storageKey) return
      setCheckoffMap(parseStoredCheckoff(storageEvent.newValue))
    }

    const handleCustomSync = (event: unknown) => {
      const customEvent = event as { detail: DdsChecklistUpdateDetail }
      if (customEvent.detail.storageKey !== storageKey) return
      setCheckoffMap(customEvent.detail.value)
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(CHECKOFF_STORAGE_EVENT, handleCustomSync)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(CHECKOFF_STORAGE_EVENT, handleCustomSync)
    }
  }, [storageKey])

  const totalTasks = useMemo(
    () => checklistBlocks.reduce((count, block) => count + block.tasks.length, 0),
    [checklistBlocks]
  )

  const completedTasks = useMemo(
    () =>
      checklistBlocks.reduce((count, block) => {
        const completedInBlock = block.tasks.reduce((taskCount, _task, taskIndex) => {
          const taskKey = getTaskKey(block.id, taskIndex)
          return taskCount + (checkoffMap[taskKey] ? 1 : 0)
        }, 0)

        return count + completedInBlock
      }, 0),
    [checklistBlocks, checkoffMap]
  )

  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const toggleTask = (blockId: string, taskIndex: number) => {
    const taskKey = getTaskKey(blockId, taskIndex)
    setCheckoffMap((current) => ({
      ...current,
      [taskKey]: !current[taskKey],
    }))
  }

  const resetChecklist = () => {
    setCheckoffMap({})
  }

  return {
    checkoffMap,
    completedTasks,
    completionPercent,
    isHydrated,
    resetChecklist,
    storageKey,
    toggleTask,
    totalTasks,
  }
}
