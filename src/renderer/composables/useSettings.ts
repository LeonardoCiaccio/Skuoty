import { ref, watchEffect } from 'vue'
import { DEFAULT_SETTINGS } from '../../shared/types'
import type { AppSettings } from '../../shared/types'

const STORAGE_KEY = 'skuoty-settings'

function loadFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_SETTINGS)
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      providers: { ...DEFAULT_SETTINGS.providers, ...(parsed.providers ?? {}) },
      plugins: parsed.plugins ?? [],
      theme: (parsed.theme === 'light' ? 'light' : 'dark') as 'dark' | 'light',
    }
  } catch {
    return structuredClone(DEFAULT_SETTINGS)
  }
}

// Module-level singleton: all components share the same reactive state
const settings = ref<AppSettings>(loadFromStorage())

// watchEffect tracks every reactive property accessed by JSON.stringify, so any
// nested change (api key, plugin, language, …) automatically triggers a save.
watchEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
})

export function useSettings() {
  function exportSettings(): string {
    return JSON.stringify(settings.value, null, 2)
  }

  function importSettings(json: string): string | null {
    try {
      const parsed = JSON.parse(json) as Partial<AppSettings>
      settings.value = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        providers: { ...DEFAULT_SETTINGS.providers, ...(parsed.providers ?? {}) },
        plugins: parsed.plugins ?? [],
      }
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Invalid JSON'
    }
  }

  return { settings, exportSettings, importSettings }
}
