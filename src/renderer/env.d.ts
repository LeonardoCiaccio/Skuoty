/// <reference types="vite/client" />

import { AppSettings } from '../shared/types'
import type { AIProvider } from '../shared/types'

declare global {
  const __APP_VERSION__: string

  interface Window {
    skuoty: {
      onSessionReady:      (cb: (json: string) => void) => void
      onClipboardCaptured: (cb: (text: string) => void) => void
      copyToClipboard: (text: string) => void
      pasteBack: (text: string) => void
      getSettings: () => Promise<AppSettings>
      setSettings: (settings: AppSettings) => void
      signalReady: () => void
      hide:           () => void
      showSplash:     () => void
      setLanguage:    (lang: string) => void
      exportToFile:   (json: string) => Promise<boolean>
      importFromFile: () => Promise<string | null>
      openExternal:   (url: string) => void
      sessions: {
        list:   () => Promise<{ id: string; name: string; created: number; modified: number }[]>
        read:   (id: string) => Promise<string | null>
        write:  (id: string, data: string) => Promise<void>
        delete: (id: string) => Promise<void>
      }
    }
  }
}
