import { create } from 'zustand';
import type { CodeAnalysisResult, AiAnalysisResult, SubtaskConfig } from '../types';

interface CodeState {
  sourceCode: string; fileName: string | null;
  analysis: CodeAnalysisResult | null; aiAnalysis: AiAnalysisResult | null; subtasks: SubtaskConfig[];
  isAnalyzing: boolean; isAiAnalyzing: boolean; analysisError: string | null;
  setSourceCode(code: string): void; setFileName(name: string | null): void;
  setAnalysis(analysis: CodeAnalysisResult): void; setAiAnalysis(analysis: AiAnalysisResult): void;
  setSubtasks(subtasks: SubtaskConfig[]): void; setIsAnalyzing(value: boolean): void;
  setIsAiAnalyzing(value: boolean): void; setAnalysisError(error: string | null): void;
  reset(): void; resetAnalysis(): void;
}
const emptyAnalysis = { analysis: null, aiAnalysis: null, subtasks: [], isAnalyzing: false, isAiAnalyzing: false, analysisError: null };
const initialState = { sourceCode: '', fileName: null, ...emptyAnalysis };
export const useCodeStore = create<CodeState>((set) => ({
  ...initialState,
  setSourceCode: sourceCode => set(prev => sourceCode === prev.sourceCode ? prev : { sourceCode, ...emptyAnalysis }),
  setFileName: fileName => set({ fileName }),
  setAnalysis: analysis => set({ analysis, isAnalyzing: false, analysisError: analysis.success ? null : analysis.error ?? 'Analysis failed' }),
  setAiAnalysis: aiAnalysis => set({ aiAnalysis, isAiAnalyzing: false }),
  setSubtasks: subtasks => set({ subtasks }),
  setIsAnalyzing: isAnalyzing => set(prev => ({ isAnalyzing, analysisError: isAnalyzing ? null : prev.analysisError })),
  setIsAiAnalyzing: isAiAnalyzing => set({ isAiAnalyzing }),
  setAnalysisError: analysisError => set({ analysisError, isAnalyzing: false }),
  reset: () => set(initialState), resetAnalysis: () => set(emptyAnalysis),
}));
