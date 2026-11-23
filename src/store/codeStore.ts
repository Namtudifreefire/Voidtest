import { create } from 'zustand';
import { CodeAnalysisResult, AiAnalysisResult, SubtaskConfig } from '../types';

interface CodeState {
  // Source code
  sourceCode: string;
  fileName: string | null;

  // Analysis results
  analysis: CodeAnalysisResult | null;
  aiAnalysis: AiAnalysisResult | null;
  subtasks: SubtaskConfig[];

  // Loading states
  isAnalyzing: boolean;
  isAiAnalyzing: boolean;
  analysisError: string | null;

  // Actions
  setSourceCode: (code: string) => void;
  setFileName: (name: string | null) => void;
  setAnalysis: (analysis: CodeAnalysisResult) => void;
  setAiAnalysis: (analysis: AiAnalysisResult) => void;
  setSubtasks: (subtasks: SubtaskConfig[]) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setIsAiAnalyzing: (analyzing: boolean) => void;
  setAnalysisError: (error: string | null) => void;
  reset: () => void;
  resetAnalysis: () => void;
}

const initialState = {
  sourceCode: '',
  fileName: null,
  analysis: null,
  aiAnalysis: null,
  subtasks: [],
  isAnalyzing: false,
  isAiAnalyzing: false,
  analysisError: null,
};

export const useCodeStore = create<CodeState>((set) => ({
  ...initialState,

  setSourceCode: (code) => set({ sourceCode: code }),
  setFileName: (name) => set({ fileName: name }),
  setAnalysis: (analysis) => set({ analysis, isAnalyzing: false, analysisError: analysis.success ? null : analysis.error ?? null }),
  setAiAnalysis: (analysis) => set({ aiAnalysis: analysis, isAiAnalyzing: false }),
  setSubtasks: (subtasks) => set({ subtasks }),
  setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing, analysisError: analyzing ? null : undefined }),
  setIsAiAnalyzing: (analyzing) => set({ isAiAnalyzing: analyzing }),
  setAnalysisError: (error) => set({ analysisError: error, isAnalyzing: false }),
  reset: () => set(initialState),
  resetAnalysis: () => set({ analysis: null, aiAnalysis: null, subtasks: [], isAnalyzing: false, isAiAnalyzing: false, analysisError: null }),
}));