/* eslint-disable @typescript-eslint/no-var-requires */
export {}

import { IPC } from '../shared/types'

const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron')

let pendingText: string | null = null
let captureCallback: ((text: string) => void) | null = null
let sessionReadyCallback: ((json: string) => void) | null = null
let pendingSession: string | null = null

ipcRenderer.on(IPC.CLIPBOARD_CAPTURED, (_event, text: string) => {
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
  copyToClipboard: (text: string) => ipcRenderer.send(IPC.COPY_TO_CLIPBOARD, text),
  pasteBack: (text: string) => ipcRenderer.send(IPC.PASTE_BACK, text),
  getSettings: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
  setSettings: (settings: unknown) => ipcRenderer.send(IPC.SETTINGS_SET, settings),
  signalReady: () => ipcRenderer.send(IPC.RENDERER_READY),
  hide:           () => ipcRenderer.send(IPC.WINDOW_HIDE),
  showSplash:     () => ipcRenderer.send(IPC.SHOW_SPLASH),
  setLanguage:    (lang: string) => ipcRenderer.send(IPC.LANGUAGE_CHANGED, lang),
  exportToFile:   (json: string) => ipcRenderer.invoke(IPC.EXPORT_FILE, json),
  exportPlugin:   (json: string, name: string) => ipcRenderer.invoke(IPC.EXPORT_PLUGIN, json, name),
  importFromFile: ()             => ipcRenderer.invoke(IPC.IMPORT_FILE),
  openExternal:   (url: string)  => ipcRenderer.send(IPC.OPEN_EXTERNAL, url),
  sessions: {
    list:   ()                         => ipcRenderer.invoke(IPC.SESSION_LIST),
    read:   (id: string)               => ipcRenderer.invoke(IPC.SESSION_READ, id),
    write:  (id: string, data: string) => ipcRenderer.invoke(IPC.SESSION_WRITE, id, data),
    delete: (id: string)               => ipcRenderer.invoke(IPC.SESSION_DELETE, id),
  },
})
