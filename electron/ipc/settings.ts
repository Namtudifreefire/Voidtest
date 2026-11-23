import { app, safeStorage } from 'electron';
import { join } from 'path';

export interface AppSettings {
  outputDir: string;
  enableLog: boolean;
  namingFormat: 'default' | 'numeric' | 'custom';
  customPrefix: string;
  numberPadding: number;
  startNumber: number;
  theme: 'dark' | 'light' | 'system';
  zipEnabled: boolean;
  zipOnError: boolean;
  overwriteOutput: boolean;
  defaultTestCount: number;
  defaultTimeout: number;
  aiProvider: AiProviderConfig | null;
  compilerPath: string | null;
  firstRunComplete: boolean;
}

export interface AiProviderConfig {
  type: 'openai' | 'azure' | 'ollama' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  outputDir: '',
  enableLog: true,
  namingFormat: 'default',
  customPrefix: 'TEST',
  numberPadding: 2,
  startNumber: 1,
  theme: 'dark',
  zipEnabled: false,
  zipOnError: false,
  overwriteOutput: false,
  defaultTestCount: 50,
  defaultTimeout: 2000,
  aiProvider: null,
  compilerPath: null,
  firstRunComplete: false,
};

type SettingsRecord = Record<string, unknown>;

class SimpleStore {
  private store: SettingsRecord;
  private filePath: string;
  private loaded = false;

  constructor() {
    this.store = { ...DEFAULT_SETTINGS };
    this.filePath = join(app.getPath('userData'), 'settings.json');
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    const fs = await import('fs/promises');
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(data);
      this.store = { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      // File doesn't exist or invalid, use defaults
    }
    this.loaded = true;
  }

  async save(): Promise<void> {
    const fs = await import('fs/promises');
    await fs.mkdir(join(this.filePath, '..'), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.store, null, 2));
  }

  get(key: string): unknown {
    return this.store[key];
  }

  getAll(): SettingsRecord {
    return { ...this.store };
  }

  set(key: string, value: unknown): void {
    this.store[key] = value;
    this.save();
  }

  setMultiple(settings: SettingsRecord): void {
    for (const [key, value] of Object.entries(settings)) {
      this.store[key] = value;
    }
    this.save();
  }

  clear(): void {
    this.store = { ...DEFAULT_SETTINGS };
    this.save();
  }

  has(key: string): boolean {
    return key in this.store && this.store[key] !== undefined;
  }
}

export class SettingsManager {
  private store: SimpleStore;
  private initialized = false;

  constructor() {
    this.store = new SimpleStore();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Set initialized immediately to prevent race condition
    this.initialized = true;

    await this.store.load();

    // Set default output directory if not set
    if (!this.store.get('outputDir')) {
      const documentsPath = app.getPath('documents');
      const defaultOutputDir = join(documentsPath, 'Voidtest');
      this.store.set('outputDir', defaultOutputDir);
    }

    // Ensure output directory exists
    const outputDir = this.store.get('outputDir') as string;
    const fs = await import('fs/promises');
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create output directory:', error);
      // Fallback to temp directory
      const tempDir = app.getPath('temp');
      const fallbackDir = join(tempDir, 'Voidtest');
      await fs.mkdir(fallbackDir, { recursive: true });
      this.store.set('outputDir', fallbackDir);
    }
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.store.get(key) as AppSettings[K];
  }

  getAll(): AppSettings {
    return this.store.getAll() as unknown as AppSettings;
  }

  set(key: keyof AppSettings, value: unknown): void {
    this.store.set(key, value);
  }

  setMultiple(settings: Partial<AppSettings>): void {
    this.store.setMultiple(settings as SettingsRecord);
  }

  reset(): void {
    this.store.clear();
    // Re-apply defaults
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      this.store.set(key, value);
    }
    // Re-initialize output directory
    this.initialize();
  }

  isFirstRun(): boolean {
    return !this.store.get('firstRunComplete');
  }

  setFirstRunComplete(): void {
    this.store.set('firstRunComplete', true);
  }

  // Encrypt AI API key using Electron's safeStorage
  private encryptApiKey(apiKey: string): string {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        return apiKey; // Fallback to plaintext if encryption not available
      }
      const buffer = Buffer.from(apiKey, 'utf-8');
      const encrypted = safeStorage.encryptString(buffer.toString('base64'));
      return encrypted.toString('base64');
    } catch {
      return apiKey; // Fallback to plaintext on error
    }
  }

  // Decrypt AI API key using Electron's safeStorage
  private decryptApiKey(encryptedKey: string): string {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        return encryptedKey; // Fallback to plaintext if encryption not available
      }
      const encryptedBuffer = Buffer.from(encryptedKey, 'base64');
      const decrypted = safeStorage.decryptString(encryptedBuffer);
      return Buffer.from(decrypted, 'base64').toString('utf-8');
    } catch {
      return encryptedKey; // Fallback to plaintext on error
    }
  }

  // Get AI provider with decrypted API key
  getAiProvider(): AiProviderConfig | null {
    const provider = this.store.get('aiProvider') as AiProviderConfig | null;
    if (!provider || !provider.apiKey) return provider;

    // Check if key is encrypted (encrypted keys are base64 strings from safeStorage)
    const apiKey = provider.apiKey;
    if (apiKey && apiKey.length > 0 && !apiKey.includes('.')) {
      // Likely encrypted with safeStorage
      try {
        return {
          ...provider,
          apiKey: this.decryptApiKey(apiKey),
        };
      } catch {
        return provider; // Return as-is if decryption fails
      }
    }
    return provider;
  }

  // Set AI provider with encrypted API key
  setAiProvider(provider: AiProviderConfig | null): void {
    if (!provider) {
      this.store.set('aiProvider', null);
      return;
    }
    const encryptedProvider = {
      ...provider,
      apiKey: provider.apiKey ? this.encryptApiKey(provider.apiKey) : '',
    };
    this.store.set('aiProvider', encryptedProvider);
  }

  // Get the actual output directory, creating if needed
  async getOutputDir(): Promise<string> {
    const outputDir = this.store.get('outputDir') as string;
    const fs = await import('fs/promises');
    try {
      await fs.mkdir(outputDir, { recursive: true });
      return outputDir;
    } catch (error) {
      throw new Error(`Cannot access output directory: ${outputDir}. ${error}`);
    }
  }

  // Validate and set output directory
  async setOutputDir(dir: string): Promise<{ success: boolean; error?: string }> {
    const fs = await import('fs/promises');
    try {
      await fs.mkdir(dir, { recursive: true });
      // Test write permission
      const testFile = join(dir, '.voidtest_write_test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      this.store.set('outputDir', dir);
      return { success: true };
    } catch (error) {
      return { success: false, error: `Cannot write to directory: ${error}` };
    }
  }
}