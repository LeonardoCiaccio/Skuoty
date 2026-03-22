/// <reference types="vite/client" />

declare const __APP_VERSION__: string

import { AppSettings } from '../shared/types'

declare global {
  interface Window {
    skuoty: {
      onClipboardCaptured: (cb: (text: string) => void) => void
      copyToClipboard: (text: string) => void
      pasteBack: (text: string) => void
      getSettings: () => Promise<AppSettings>
      setSettings: (settings: AppSettings) => void
      signalReady: () => void
      hide:           () => void
      setLanguage:    (lang: string) => void
      exportToFile:   (json: string) => Promise<boolean>
      importFromFile: () => Promise<string | null>
      sessions: {
        list:   () => Promise<{ id: string; name: string; created: number; modified: number }[]>
        read:   (id: string) => Promise<string | null>
        write:  (id: string, data: string) => Promise<void>
        delete: (id: string) => Promise<void>
      }
    }
  }
}
