import { ref, watch } from 'vue'
import { AppSettings, DEFAULT_SETTINGS } from '../../shared/types'

const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
let loaded = false

export function useSettings() {
  async function load() {
    if (loaded) return
    loaded = true
    try {
      const s = await window.skuoty.getSettings()
      settings.value = s ?? { ...DEFAULT_SETTINGS }
    } catch {
      settings.value = { ...DEFAULT_SETTINGS }
    }
  }

  function save() {
    window.skuoty.setSettings(settings.value)
  }

  watch(settings, save, { deep: true })

  return { settings, load, save }
}
