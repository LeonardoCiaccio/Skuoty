import { ref } from 'vue'
import { DEFAULT_SETTINGS } from '../../shared/types'
import type { AppSettings } from '../../shared/types'

function merge(saved: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    providers: { ...DEFAULT_SETTINGS.providers, ...(saved.providers ?? {}) },
    plugins:   saved.plugins ?? [],
    theme:     saved.theme === 'light' ? 'light' : 'dark',
  }
}

// Module-level singleton — populated when a session is unlocked
const settings = ref<AppSettings>(structuredClone(DEFAULT_SETTINGS))

export function useSettings() {
  /**
   * Called after a session is successfully unlocked.
   * Overrides current settings with the decrypted session data.
   */
  function load(s: AppSettings) {
    settings.value = merge(s)
  }

  function exportSettings(): string {
    return JSON.stringify(settings.value, null, 2)
  }

  function importSettings(json: string): string | null {
    try {
      settings.value = merge(JSON.parse(json) as Partial<AppSettings>)
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Invalid JSON'
    }
  }

  return { settings, load, exportSettings, importSettings }
}
