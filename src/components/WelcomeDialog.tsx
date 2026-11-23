import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { ArrowRight, Check, FolderOpen, Code, Zap, Settings, FileText } from 'lucide-react';
import { Button } from './common/Button';
import { Dialog } from './common/Dialog';
import { Input } from './common/Input';
import { useIPC } from '../hooks/useIPC';
import { useSettings } from '../hooks/useSettings';

interface WelcomeDialogProps {
  isOpen: boolean;
  onComplete: () => void;
}

const steps = [
  { id: 1, title: 'Welcome', icon: Code, description: 'Welcome to Voidtest! Let\'s set up your environment.' },
  { id: 2, title: 'Output Directory', icon: FolderOpen, description: 'Choose where to save generated test files.' },
  { id: 3, title: 'Compiler Check', icon: Zap, description: 'Verify your C++ compiler is working correctly.' },
  { id: 4, title: 'Ready!', icon: Check, description: 'You\'re all set to generate test cases.' },
];

export function WelcomeDialog({ isOpen, onComplete }: WelcomeDialogProps) {
  const { file, compile } = useIPC();
  const { updateSetting } = useSettings();
  const [currentStep, setCurrentStep] = useState(1);
  const [outputDir, setOutputDir] = useState<string>('');
  const [selectingFolder, setSelectingFolder] = useState(false);
  const [compilerTested, setCompilerTested] = useState(false);
  const [compilerResult, setCompilerResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingCompiler, setTestingCompiler] = useState(false);

  const handleSelectFolder = useCallback(async () => {
    setSelectingFolder(true);
    try {
      const dir = await file.selectFolder();
      if (dir) {
        setOutputDir(dir);
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    } finally {
      setSelectingFolder(false);
    }
  }, [file]);

  const handleTestCompiler = useCallback(async () => {
    setTestingCompiler(true);
    setCompilerResult({ success: false, message: 'Testing compiler...' });
    try {
      const testCode = `#include <iostream>
int main() {
  std::cout << "Hello, World!" << std::endl;
  return 0;
}`;
      const result = await compile.check(testCode);
      if (result.success) {
        setCompilerResult({ success: true, message: `Compiler test passed! ${result.compilerUsed} (${result.compileTime}ms)` });
        setCompilerTested(true);
      } else {
        setCompilerResult({ success: false, message: result.errors?.join(', ') || 'Compilation failed' });
        setCompilerTested(false);
      }
    } catch (error) {
      setCompilerResult({ success: false, message: error instanceof Error ? error.message : 'Test failed' });
      setCompilerTested(false);
    } finally {
      setTestingCompiler(false);
    }
  }, [compile]);

  const handleNext = useCallback(async () => {
    if (currentStep === 2) {
      if (!outputDir.trim()) {
        alert('Please select an output directory');
        return;
      }
      await updateSetting('outputDir', outputDir);
    }
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, outputDir, updateSetting]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleFinish = useCallback(async () => {
    await updateSetting('firstRunComplete', true);
    onComplete();
  }, [updateSetting, onComplete]);

  const canProceed = () => {
    if (currentStep === 2) return outputDir.trim().length > 0;
    if (currentStep === 3) return compilerTested;
    return true;
  };

  const currentStepData = steps[currentStep - 1];
  const CurrentIcon = currentStepData.icon;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onComplete}
      title=""
      maxWidth="lg"
      footer={
        <div className="flex w-full justify-between">
          <Button variant="ghost" onClick={handleBack} disabled={currentStep === 1}>
            Back
          </Button>
          <div className="flex gap-2">
            {currentStep === steps.length ? (
              <Button variant="primary" onClick={handleFinish}>
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button variant="primary" onClick={handleNext} disabled={!canProceed()}>
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      }
    >
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-all',
                index < currentStep - 1
                  ? 'bg-accent text-inverse'
                  : index === currentStep - 1
                  ? 'bg-accent/20 text-accent border-2 border-accent'
                  : 'bg-secondary text-muted border-2 border-primary'
              )}>
                {index < currentStep - 1 ? <Check className="w-5 h-5" /> : step.id}
              </div>
              {index < steps.length - 1 && (
                <div className={clsx(
                  'w-16 h-0.5 mx-2',
                  index < currentStep - 1 ? 'bg-accent' : 'bg-primary'
                )} />
              )}
            </div>
          ))}
        </div>
        <div className="text-center text-sm text-muted">
          Step {currentStep} of {steps.length}
        </div>
      </div>

      {/* Step content */}
      <div className="space-y-6">
        {currentStep === 1 && (
          <div className="text-center py-4">
            <div className="w-20 h-20 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <CurrentIcon className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-primary mb-2">Welcome to Voidtest!</h2>
            <p className="text-secondary max-w-md mx-auto">
              Voidtest automatically generates test cases for competitive programming problems.
              It analyzes your C++ code, creates diverse test inputs, compiles and runs your solution
              to produce actual outputs.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-secondary rounded-lg border border-primary">
                <FileText className="w-5 h-5 text-accent mx-auto mb-2" />
                <div className="font-medium">Smart Analysis</div>
                <div className="text-xs text-muted">Parses C++ code structure</div>
              </div>
              <div className="p-3 bg-secondary rounded-lg border border-primary">
                <Zap className="w-5 h-5 text-accent mx-auto mb-2" />
                <div className="font-medium">Real Execution</div>
                <div className="text-xs text-muted">Compiles & runs your code</div>
              </div>
              <div className="p-3 bg-secondary rounded-lg border border-primary">
                <Settings className="w-5 h-5 text-accent mx-auto mb-2" />
                <div className="font-medium">Flexible Output</div>
                <div className="text-xs text-muted">Organized test cases</div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <CurrentIcon className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-xl font-bold text-primary mb-2">Output Directory</h2>
              <p className="text-secondary">Choose where Voidtest will save your generated test files.</p>
            </div>

            <div className="p-4 bg-secondary rounded-lg border border-primary">
              <label className="block text-sm font-medium text-secondary mb-2">Select Output Directory</label>
              <div className="flex gap-2">
                <Input
                  value={outputDir}
                  onChange={(e) => setOutputDir(e.target.value)}
                  placeholder="Click Browse to select a folder..."
                  disabled
                  className="flex-1"
                />
                <Button variant="secondary" onClick={handleSelectFolder} disabled={selectingFolder} fullWidth>
                  <FolderOpen className="w-4 h-4" />
                  <span>{selectingFolder ? 'Selecting...' : 'Browse'}</span>
                </Button>
              </div>
              <p className="text-xs text-muted mt-2">Default: Documents/Voidtest</p>
            </div>

            <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
              <p className="text-sm text-secondary">
                <strong>Tip:</strong> Choose a location with enough disk space. Test files and outputs
                can take significant space for large test counts.
              </p>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <CurrentIcon className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-xl font-bold text-primary mb-2">Compiler Check</h2>
              <p className="text-secondary">Verify your C++ compiler is properly configured.</p>
            </div>

            <div className="p-4 bg-secondary rounded-lg border border-primary">
              <Button
                variant={compilerTested && compilerResult?.success ? 'primary' : 'primary'}
                size="lg"
                fullWidth
                onClick={handleTestCompiler}
                disabled={testingCompiler}
                loading={testingCompiler}
              >
                {testingCompiler ? 'Testing...' : compilerTested ? 'Re-test Compiler' : 'Test Compiler'}
              </Button>

              {compilerResult && (
                <div className={clsx('mt-4 p-3 rounded-lg', compilerResult.success ? 'bg-success/10 border border-success/30 text-success' : 'bg-error/10 border border-error/30 text-error')}>
                  {compilerResult.message}
                </div>
              )}

              <div className="mt-4 p-3 bg-input rounded-lg border border-primary">
                <h4 className="font-medium text-primary mb-2">Supported Compilers</h4>
                <ul className="text-sm text-secondary space-y-1 font-mono">
                  <li>GCC (g++)</li>
                  <li>Clang (clang++)</li>
                  <li>MSVC (cl.exe)</li>
                  <li>MinGW (Windows)</li>
                </ul>
                <p className="text-xs text-muted mt-2">Auto-detected or configure custom path in Settings → Compiler</p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="text-center py-8">
            <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
              <Check className="w-12 h-12 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-primary mb-2">You're All Set!</h2>
            <p className="text-secondary mb-6 max-w-md mx-auto">
              Voidtest is ready to use. Start by pasting or importing your C++ solution code,
              then click "Analyze Code" to begin generating test cases.
            </p>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-left">
              <div className="p-4 bg-secondary rounded-lg border border-primary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="font-medium text-primary">1. Add Code</div>
                    <div className="text-sm text-muted">Paste or import C++ solution</div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-secondary rounded-lg border border-primary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="font-medium text-primary">2. Analyze</div>
                    <div className="text-sm text-muted">Click "Analyze Code"</div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-secondary rounded-lg border border-primary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="font-medium text-primary">3. Configure</div>
                    <div className="text-sm text-muted">Review subtasks & settings</div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-secondary rounded-lg border border-primary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="font-medium text-primary">4. Generate</div>
                    <div className="text-sm text-muted">Click "Create Tests!"</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}