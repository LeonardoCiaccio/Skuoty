import { ref, watchEffect } from 'vue'
import { DEFAULT_SETTINGS } from '../../shared/types'
import type { AppSettings } from '../../shared/types'

const STORAGE_KEY = 'skuoty-settings'

function merge(saved: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    providers: { ...DEFAULT_SETTINGS.providers, ...(saved.providers ?? {}) },
    plugins: saved.plugins ?? [],
    theme: saved.theme === 'light' ? 'light' : 'dark',
  }
}

function fromLocalStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? merge(JSON.parse(raw) as Partial<AppSettings>) : structuredClone(DEFAULT_SETTINGS)
  } catch {
    return structuredClone(DEFAULT_SETTINGS)
  }
}

// Module-level singleton
const settings = ref<AppSettings>(fromLocalStorage())
const storeReady = ref(false)

// Save on every change:
//  - always to localStorage (sync, fast)
//  - to electron-store via IPC once init() has completed (reliable across restarts)
watchEffect(() => {
  const snapshot = JSON.parse(JSON.stringify(settings.value)) as AppSettings
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  if (storeReady.value) {
    window.skuoty.setSettings(snapshot)
  }
})

export function useSettings() {
  /**
   * Must be called once from App.vue onMounted.
   * Loads from electron-store (authoritative) only when localStorage is empty —
   * i.e. first run or after the browser storage was cleared.
   */
  async function init() {
    if (storeReady.value) return
    try {
      const hasCache = localStorage.getItem(STORAGE_KEY) !== null
      if (!hasCache) {
        const saved = await window.skuoty.getSettings() as Partial<AppSettings> | null
        if (saved) settings.value = merge(saved)
      }
    } catch { /* keep current */ }
    storeReady.value = true
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

  return { settings, init, exportSettings, importSettings }
}
