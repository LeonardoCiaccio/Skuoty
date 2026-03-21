import Store from 'electron-store'
import { AppSettings, DEFAULT_SETTINGS } from '../shared/types'

interface StoreSchema {
  settings: AppSettings
}

let storeInstance: Store<StoreSchema> | null = null

export function setupStore(): Store<StoreSchema> {
  if (!storeInstance) {
    storeInstance = new Store<StoreSchema>({
      defaults: {
        settings: DEFAULT_SETTINGS,
      },
    })
  }
  return storeInstance
}
