import { create } from 'zustand';

interface UIState {
  // Modal states
  isCreateMemberModalOpen: boolean;
  isManualCheckinModalOpen: boolean;

  // Actions
  openCreateMemberModal: () => void;
  closeCreateMemberModal: () => void;
  openManualCheckinModal: () => void;
  closeManualCheckinModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isCreateMemberModalOpen: false,
  isManualCheckinModalOpen: false,

  openCreateMemberModal: () => set({ isCreateMemberModalOpen: true }),
  closeCreateMemberModal: () => set({ isCreateMemberModalOpen: false }),
  openManualCheckinModal: () => set({ isManualCheckinModalOpen: true }),
  closeManualCheckinModal: () => set({ isManualCheckinModalOpen: false }),
}));
