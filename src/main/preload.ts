/* eslint-disable @typescript-eslint/no-var-requires */
export {}

// IPC channel strings inlined — avoids require() of local files in preload context
const IPC_CLIPBOARD_CAPTURED = 'clipboard:captured'
const IPC_COPY_TO_CLIPBOARD = 'clipboard:copy'
const IPC_PASTE_BACK = 'paste:back'
const IPC_SETTINGS_GET = 'settings:get'
const IPC_SETTINGS_SET = 'settings:set'
const IPC_RENDERER_READY = 'renderer:ready'
const IPC_WINDOW_HIDE      = 'window:hide'
const IPC_LANGUAGE_CHANGED = 'language:changed'
const IPC_EXPORT_FILE    = 'backup:export'
const IPC_IMPORT_FILE    = 'backup:import'
const IPC_SESSION_LIST   = 'sessions:list'
const IPC_SESSION_READ   = 'sessions:read'
const IPC_SESSION_WRITE  = 'sessions:write'
const IPC_SESSION_DELETE = 'sessions:delete'

const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron')

let pendingText: string | null = null
let captureCallback: ((text: string) => void) | null = null
let sessionReadyCallback: ((json: string) => void) | null = null
let pendingSession: string | null = null

ipcRenderer.on(IPC_CLIPBOARD_CAPTURED, (_event, text: string) => {
  if (captureCallback) {
    captureCallback(text)
  } else {
    pendingText = text
  }
})

ipcRenderer.on('session:ready', (_event, json: string) => {
  if (sessionReadyCallback) {
    sessionReadyCallback(json)
  } else {
    pendingSession = json
  }
})

contextBridge.exposeInMainWorld('skuoty', {
  onSessionReady: (cb: (json: string) => void) => {
    sessionReadyCallback = cb
    if (pendingSession !== null) {
      cb(pendingSession)
      pendingSession = null
    }
  },
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
  setLanguage:    (lang: string) => ipcRenderer.send(IPC_LANGUAGE_CHANGED, lang),
  exportToFile:   (json: string) => ipcRenderer.invoke(IPC_EXPORT_FILE, json),
  importFromFile: ()             => ipcRenderer.invoke(IPC_IMPORT_FILE),
  sessions: {
    list:   ()                         => ipcRenderer.invoke(IPC_SESSION_LIST),
    read:   (id: string)               => ipcRenderer.invoke(IPC_SESSION_READ, id),
    write:  (id: string, data: string) => ipcRenderer.invoke(IPC_SESSION_WRITE, id, data),
    delete: (id: string)               => ipcRenderer.invoke(IPC_SESSION_DELETE, id),
  },
})
