export function validateTestCount(count: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(count)) {
    return { valid: false, error: 'Test count must be an integer' };
  }
  if (count === 0) {
    return { valid: false, error: 'Test count is required' };
  }
  if (count < 1) {
    return { valid: false, error: 'Test count must be at least 1' };
  }
  if (count > 10000) {
    return { valid: false, error: 'Test count cannot exceed 10,000' };
  }
  return { valid: true };
}

export function validateTimeout(timeout: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(timeout)) {
    return { valid: false, error: 'Timeout must be an integer (milliseconds)' };
  }
  if (timeout < 100) {
    return { valid: false, error: 'Timeout must be at least 100ms' };
  }
  if (timeout > 300000) {
    return { valid: false, error: 'Timeout cannot exceed 5 minutes (300,000ms)' };
  }
  return { valid: true };
}

export function validateSubtaskLimits(
  limits: Record<string, { min: number; max: number }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [variable, range] of Object.entries(limits)) {
    if (range.min > range.max) {
      errors.push(`${variable}: min (${range.min}) cannot be greater than max (${range.max})`);
    }
    if (range.min < -1000000000 || range.max > 1000000000) {
      errors.push(`${variable}: values should be within reasonable range (-1e9 to 1e9)`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateSourceCode(code: string): { valid: boolean; error?: string } {
  if (!code.trim()) {
    return { valid: false, error: 'Source code cannot be empty' };
  }
  if (code.length > 500000) {
    return { valid: false, error: 'Source code exceeds maximum size (500KB)' };
  }
  // Basic check for C++ main function
  if (!code.includes('main')) {
    return { valid: false, error: 'No main function found in source code' };
  }
  return { valid: true };
}

export function validateOutputDir(dir: string): { valid: boolean; error?: string } {
  if (!dir.trim()) {
    return { valid: false, error: 'Output directory cannot be empty' };
  }
  // Path validation would be done in main process
  return { valid: true };
}