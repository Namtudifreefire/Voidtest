import { join } from 'path';
import { TestCase, NamingConfig } from './code-analysis.js';

export function getFileName(testCase: TestCase, namingConfig: NamingConfig, extension: 'inp' | 'out'): string {
  let baseName: string;

  switch (namingConfig.format) {
    case 'numeric':
      baseName = String(testCase.id).padStart(namingConfig.padding, '0');
      break;
    case 'custom':
      baseName = `${namingConfig.prefix}${String(testCase.id).padStart(namingConfig.padding, '0')}`;
      break;
    default:
      baseName = `TEST${String(testCase.id).padStart(namingConfig.padding, '0')}`;
  }

  return `${baseName}.${extension}`;
}

export function getSubtaskDir(outputDir: string, subtaskId: number, subtaskName?: string): string {
  const name = subtaskName
    ? `Subtask-${String(subtaskId).padStart(2, '0')}-${subtaskName.replace(/[^a-zA-Z0-9]/g, '-')}`
    : `Subtask-${String(subtaskId).padStart(2, '0')}`;
  return join(outputDir, name);
}

export function validateNamingConfig(config: NamingConfig): { valid: boolean; error?: string } {
  if (config.padding < 1 || config.padding > 10) {
    return { valid: false, error: 'Padding must be between 1 and 10' };
  }
  if (config.startNumber < 1) {
    return { valid: false, error: 'Start number must be at least 1' };
  }
  if (config.format === 'custom' && !config.prefix.trim()) {
    return { valid: false, error: 'Custom prefix cannot be empty' };
  }
  if (config.prefix.length > 20) {
    return { valid: false, error: 'Prefix cannot exceed 20 characters' };
  }
  return { valid: true };
}