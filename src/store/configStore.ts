import { create } from 'zustand';
import { GenerationMode, NamingConfig, AppSettings } from '../types';

interface ConfigState {
  // Generation settings
  mode: GenerationMode;
  testCount: number;
  timeout: number;

  // Output settings
  overwriteOutput: boolean;
  zipEnabled: boolean;
  zipOnError: boolean;

  // Naming config
  namingConfig: NamingConfig;

  // Actions
  setMode: (mode: GenerationMode) => void;
  setTestCount: (count: number) => void;
  setTimeout: (timeout: number) => void;
  setOverwriteOutput: (value: boolean) => void;
  setZipEnabled: (value: boolean) => void;
  setZipOnError: (value: boolean) => void;
  setNamingConfig: (config: Partial<NamingConfig>) => void;
  loadFromSettings: (settings: AppSettings) => void;
  reset: () => void;
}

const defaultNamingConfig: NamingConfig = {
  format: 'default',
  prefix: 'TEST',
  padding: 2,
  startNumber: 1,
};

const initialState = {
  mode: 'input-output' as GenerationMode,
  testCount: 50,
  timeout: 2000,
  overwriteOutput: false,
  zipEnabled: false,
  zipOnError: false,
  namingConfig: defaultNamingConfig,
};

export const useConfigStore = create<ConfigState>((set) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),
  setTestCount: (count) => set({ testCount: Math.max(1, count) }),
  setTimeout: (timeout) => set({ timeout: Math.max(100, timeout) }),
  setOverwriteOutput: (value) => set({ overwriteOutput: value }),
  setZipEnabled: (value) => set({ zipEnabled: value }),
  setZipOnError: (value) => set({ zipOnError: value }),
  setNamingConfig: (config) =>
    set((state) => ({ namingConfig: { ...state.namingConfig, ...config } })),
  loadFromSettings: (settings) =>
    set({
      testCount: settings.defaultTestCount,
      timeout: settings.defaultTimeout,
      overwriteOutput: settings.overwriteOutput,
      zipEnabled: settings.zipEnabled,
      zipOnError: settings.zipOnError,
      namingConfig: {
        format: settings.namingFormat,
        prefix: settings.customPrefix,
        padding: settings.numberPadding,
        startNumber: settings.startNumber,
      },
    }),
  reset: () => set(initialState),
}));