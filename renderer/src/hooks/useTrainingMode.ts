interface TrainingModeState {
  isEnabled: boolean;
  activeSession: string | null;
  lastCheckpoint: string | null;
  availableModels: string[];
  enableTraining: () => void;
  disableTraining: () => void;
  setActiveSession: (sessionId: string | null) => void;
  setLastCheckpoint: (checkpoint: string | null) => void;
  setAvailableModels: (models: string[]) => void;
}

export const useTrainingMode = create<TrainingModeState>((set) => ({
  isEnabled: false,
  activeSession: null,
  lastCheckpoint: null,
  availableModels: [],
  
  enableTraining: () => set({ isEnabled: true }),
  disableTraining: () => set({ isEnabled: false }),
  setActiveSession: (sessionId) => set({ activeSession: sessionId }),
  setLastCheckpoint: (checkpoint) => set({ lastCheckpoint: checkpoint }),
  setAvailableModels: (models) => set({ availableModels: models }),
})); 