/* eslint-disable @typescript-eslint/no-var-requires */

// IPC channel strings inlined — avoids require() of local files in preload context
const IPC_CLIPBOARD_CAPTURED = 'clipboard:captured'
const IPC_COPY_TO_CLIPBOARD = 'clipboard:copy'
const IPC_PASTE_BACK = 'paste:back'
const IPC_SETTINGS_GET = 'settings:get'
const IPC_SETTINGS_SET = 'settings:set'
const IPC_RENDERER_READY = 'renderer:ready'
const IPC_WINDOW_HIDE      = 'window:hide'
const IPC_HOTKEYS_CHANGED  = 'hotkeys:changed'
const IPC_LANGUAGE_CHANGED = 'language:changed'
const IPC_EXPORT_FILE = 'backup:export'
const IPC_IMPORT_FILE = 'backup:import'

const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron')

let pendingText: string | null = null
let captureCallback: ((text: string) => void) | null = null

ipcRenderer.on(IPC_CLIPBOARD_CAPTURED, (_event, text: string) => {
  if (captureCallback) {
    captureCallback(text)
  } else {
    pendingText = text
  }
})

contextBridge.exposeInMainWorld('skuoty', {
  onClipboardCaptured: (cb: (text: string) => void) => {
    captureCallback = cb
    if (pendingText !== null) {
      cb(pendingText)
      pendingText = null
    }
  },
  copyToClipboard: (text: string) => ipcRenderer.send(IPC_COPY_TO_CLIPBOARD, text),
  pasteBack: (text: string) => ipcRenderer.send(IPC_PASTE_BACK, text),
  getSettings: () => ipcRenderer.invoke(IPC_SETTINGS_GET),
  setSettings: (settings: unknown) => ipcRenderer.send(IPC_SETTINGS_SET, settings),
  signalReady: () => ipcRenderer.send(IPC_RENDERER_READY),
  hide:           () => ipcRenderer.send(IPC_WINDOW_HIDE),
  setHotkeys:     (h: { capture: string; showWindow: string }) => ipcRenderer.send(IPC_HOTKEYS_CHANGED, h),
  setLanguage:    (lang: string) => ipcRenderer.send(IPC_LANGUAGE_CHANGED, lang),
  exportToFile:   (json: string) => ipcRenderer.invoke(IPC_EXPORT_FILE, json),
  importFromFile: ()             => ipcRenderer.invoke(IPC_IMPORT_FILE),
})
