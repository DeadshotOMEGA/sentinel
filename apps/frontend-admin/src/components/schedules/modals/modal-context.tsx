'use client'

import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'

type ModalType = 'dds' | 'duty-watch' | 'event' | null

interface ModalState {
  type: ModalType
  weekStartDate: string | null
  nightDate: string | null
  eventId: string | null
}

interface ModalContextValue {
  modal: ModalState
  openDdsModal: (weekStartDate: string) => void
  openDutyWatchModal: (weekStartDate: string, nightDate?: string) => void
  openEventModal: (eventId: string) => void
  closeModal: () => void
}

const initialState: ModalState = {
  type: null,
  weekStartDate: null,
  nightDate: null,
  eventId: null,
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState>(initialState)

  const openDdsModal = useCallback((weekStartDate: string) => {
    setModal({ type: 'dds', weekStartDate, nightDate: null, eventId: null })
  }, [])

  const openDutyWatchModal = useCallback((weekStartDate: string, nightDate?: string) => {
    setModal({ type: 'duty-watch', weekStartDate, nightDate: nightDate ?? null, eventId: null })
  }, [])

  const openEventModal = useCallback((eventId: string) => {
    setModal({ type: 'event', weekStartDate: null, nightDate: null, eventId })
  }, [])

  const closeModal = useCallback(() => {
    setModal(initialState)
  }, [])

  const value = useMemo(
    () => ({ modal, openDdsModal, openDutyWatchModal, openEventModal, closeModal }),
    [modal, openDdsModal, openDutyWatchModal, openEventModal, closeModal]
  )

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
}

export function useModalContext(): ModalContextValue {
  const ctx = useContext(ModalContext)
  if (!ctx) {
    throw new Error('useModalContext must be used within a ModalProvider')
  }
  return ctx
}
