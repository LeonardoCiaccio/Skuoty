/* eslint-disable @typescript-eslint/no-var-requires */
export {}
const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron')

contextBridge.exposeInMainWorld('splash', {
  listSessions: ()                       => ipcRenderer.invoke('sessions:list'),
  readSession:  (id: string)             => ipcRenderer.invoke('sessions:read', id),
  writeSession: (id: string, data: string) => ipcRenderer.invoke('sessions:write', id, data),
  unlock:       (settingsJSON: string)   => ipcRenderer.send('session:unlocked', settingsJSON),
  theme:        ()                       => new URLSearchParams(location.search).get('theme') || 'dark',
  lang:         ()                       => new URLSearchParams(location.search).get('lang') || 'en',
})
