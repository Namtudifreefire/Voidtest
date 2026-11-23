import { create } from 'zustand';
import { TestCase, TestPreviewData } from '../types';

interface PreviewState {
  previewData: TestPreviewData | null;
  selectedTestId: number | null;
  isPreviewOpen: boolean;

  setPreviewData: (data: TestPreviewData) => void;
  setSelectedTestId: (id: number | null) => void;
  setIsPreviewOpen: (open: boolean) => void;
  getSelectedTest: () => TestCase | null;
  getTestsBySubtask: (subtaskId: number) => TestCase[];
  clear: () => void;
}

export const usePreviewStore = create<PreviewState>((set, get) => ({
  previewData: null,
  selectedTestId: null,
  isPreviewOpen: false,

  setPreviewData: (data) => set({ previewData: data }),
  setSelectedTestId: (id) => set({ selectedTestId: id }),
  setIsPreviewOpen: (open) => set({ isPreviewOpen: open }),

  getSelectedTest: () => {
    const { previewData, selectedTestId } = get();
    if (!previewData || selectedTestId === null) return null;
    return previewData.testCases.find((t) => t.id === selectedTestId) || null;
  },

  getTestsBySubtask: (subtaskId) => {
    const { previewData } = get();
    if (!previewData) return [];
    return previewData.testCases.filter((t) => t.subtaskId === subtaskId);
  },

  clear: () => set({ previewData: null, selectedTestId: null, isPreviewOpen: false }),
}));