import { useRef, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { FileText, FolderOpen, Code, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './common/Button';
import { useCodeStore } from '../store/codeStore';
import { useIPC } from '../hooks/useIPC';
import { validateSourceCode } from '../utils/validation';
import { CompilationResult } from '../types';

export function SourceCodePanel() {
  const { sourceCode, fileName, analysis, isAnalyzing, analysisError, setSourceCode, setFileName, setAnalysis, setAnalysisError, setIsAnalyzing } = useCodeStore();
  const { code, compile } = useIPC();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [showCompileStatus, setShowCompileStatus] = useState(false);
  const [compileResult, setCompileResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleImport = useCallback(async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.cpp,.cc,.cxx,.c,.h,.hpp';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const text = await file.text();
          setSourceCode(text);
          setFileName(file.name);
        }
      };
      input.click();
    } catch (error) {
      console.error('Import failed:', error);
    }
  }, [setSourceCode, setFileName]);

  const handleAnalyze = useCallback(async () => {
    const validation = validateSourceCode(sourceCode);
    if (!validation.valid) {
      setAnalysisError(validation.error || 'Invalid source code');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const result = await code.analyze(sourceCode);
      setAnalysis(result);
      if (!result.success) {
        setAnalysisError(result.error || 'Analysis failed');
      }
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      // The store's setAnalysis already handles isAnalyzing = false
    }
  }, [sourceCode, code, setAnalysis, setIsAnalyzing, setAnalysisError]);

  const handleCompile = useCallback(async () => {
    const validation = validateSourceCode(sourceCode);
    if (!validation.valid) {
      setCompileResult({ success: false, message: validation.error || 'Invalid source code' });
      setShowCompileStatus(true);
      return;
    }

    setShowCompileStatus(true);
    setCompileResult({ success: false, message: 'Compiling...' });

    try {
      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise<CompilationResult>((_, reject) => {
        setTimeout(() => reject(new Error('Compilation timed out after 60 seconds')), 60000);
      });

      const result = await Promise.race([compile.check(sourceCode), timeoutPromise]);

      if (result.success) {
        setCompileResult({ success: true, message: `Compiled successfully with ${result.compilerUsed} (${result.compileTime}ms)` });
      } else {
        setCompileResult({ success: false, message: result.errors?.[0] || 'Compilation failed' });
      }
    } catch (error) {
      setCompileResult({ success: false, message: error instanceof Error ? error.message : 'Compilation failed' });
    }
  }, [sourceCode, compile]);

  return (
    <div className="panel flex-1 min-w-0" style={{ minWidth: '320px' }}>
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <Code className="w-5 h-5 text-accent" />
          <span className="panel-title">Source Code</span>
        </div>
        <div className="flex items-center gap-2">
          {fileName && (
            <span className="text-xs text-muted px-2 py-1 bg-secondary rounded flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {fileName}
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={handleImport} disabled={isAnalyzing}>
            <FolderOpen className="w-4 h-4" />
            <span>Import</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 relative min-h-0">
        <textarea
          ref={editorRef}
          className="w-full h-full bg-input border border-primary rounded-lg p-4 font-mono text-sm resize-none"
          style={{ minHeight: '300px', fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}
          value={sourceCode}
          onChange={(e) => setSourceCode(e.target.value)}
          placeholder="// Import or write your C++ code here"
          disabled={isAnalyzing}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-primary">
        <Button
          variant="primary"
          size="sm"
          onClick={handleAnalyze}
          disabled={isAnalyzing || !sourceCode.trim()}
          loading={isAnalyzing}
        >
          <Loader2 className="w-4 h-4" />
          <span>Analyze Code</span>
        </Button>

        <Button variant="secondary" size="sm" onClick={handleCompile} disabled={isAnalyzing || !sourceCode.trim()}>
          <span>Compile Check</span>
        </Button>

        {showCompileStatus && compileResult && (
          <div className={clsx('flex items-center gap-2 text-sm', compileResult.success ? 'text-success' : 'text-error')}>
            {compileResult.success ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{compileResult.message}</span>
          </div>
        )}

        {analysisError && (
          <div className="flex items-center gap-2 text-sm text-error ml-auto">
            <AlertCircle className="w-4 h-4" />
            <span>{analysisError}</span>
          </div>
        )}

        {analysis?.success && (
          <div className="flex items-center gap-2 text-sm text-success ml-auto">
            <CheckCircle className="w-4 h-4" />
            <span>{analysis.variables.length} variables, {analysis.constraints.length} constraints</span>
          </div>
        )}
      </div>
    </div>
  );
}