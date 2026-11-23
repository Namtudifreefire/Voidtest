import { useCallback, useEffect, useState } from 'react';
import { useIPC } from './useIPC';
import { AppSettings } from '../types';
import { useConfigStore } from '../store/configStore';

export function useSettings() {
  const { settings } = useIPC();
  const loadFromSettings = useConfigStore((s) => s.loadFromSettings);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const s = await settings.get();
      setAppSettings(s);
      loadFromSettings(s);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [settings, loadFromSettings]);

  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      try {
        await settings.set(key, value);
        setAppSettings((prev) => (prev ? { ...prev, [key]: value } : null));
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to update ${String(key)}`);
        throw err;
      }
    },
    [settings]
  );

  const resetSettings = useCallback(async () => {
    try {
      await settings.reset();
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset settings');
      throw err;
    }
  }, [settings, loadSettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings: appSettings,
    loading,
    error,
    loadSettings,
    updateSetting,
    resetSettings,
  };
}