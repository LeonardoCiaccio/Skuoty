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

// Module-level singleton — starts with defaults, populated by init()
const settings = ref<AppSettings>(structuredClone(DEFAULT_SETTINGS))
const ready = ref(false)

export function useSettings() {
  /**
   * Call once from App.vue onMounted.
   * Loads lang/theme from electron-store so the UI is themed before session unlock.
   */
  async function init() {
    if (ready.value) return
    try {
      const saved = await window.skuoty.getSettings() as Partial<AppSettings> | null
      if (saved) settings.value = merge(saved)
    } catch { /* keep defaults */ }
    ready.value = true
  }

  /**
   * Called after a session is successfully unlocked.
   * Overrides the current settings with the decrypted session data.
   */
  function load(s: AppSettings) {
    settings.value = merge(s)
    ready.value = true
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

  return { settings, init, load, exportSettings, importSettings }
}
