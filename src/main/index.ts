import { app, BrowserWindow, ipcMain, clipboard, screen, Tray, Menu, nativeImage } from 'electron'
import { execSync } from 'child_process'
import path from 'path'
import { setupStore } from './store'
import { IPC } from '../shared/types'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let rendererReady = false
const isDev = process.env.NODE_ENV === 'development'

// Suppress harmless GPU cache errors on Windows
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('disable-gpu-disk-cache')
app.commandLine.appendSwitch('disk-cache-size', '0')

function createTray() {
  const iconPath = path.join(app.getAppPath(), 'assets/skuoty.png')
  console.log('[tray] icon path:', iconPath)
  let icon = nativeImage.createFromPath(iconPath)
  console.log('[tray] icon empty:', icon.isEmpty())
  if (!icon.isEmpty()) {
    icon = icon.resize({ width: 32, height: 32 })
  }
  tray = new Tray(icon)
  tray.setToolTip('Skuoty')

  const menu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ])

  tray.setContextMenu(menu)

  // Left click on tray icon also shows the window
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 640,
    height: 520,
    minWidth: 480,
    minHeight: 400,
    frame: false,
    transparent: false,
    resizable: true,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'))
  }

  mainWindow.webContents.on('did-finish-load', () => {
    rendererReady = true
  })

  // Hide to tray instead of closing
  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow?.hide()
  })

  mainWindow.on('blur', () => {
    mainWindow?.hide()
  })
}

function sendTextToRenderer(text: string) {
  if (!mainWindow) return
  console.log(`[ipc] sendText rendererReady=${rendererReady} len=${text.length}`)
  if (rendererReady) {
    mainWindow.webContents.send(IPC.CLIPBOARD_CAPTURED, text)
    console.log('[ipc] sent')
  } else {
    console.log('[ipc] waiting for did-finish-load...')
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('[ipc] sending after load')
      mainWindow?.webContents.send(IPC.CLIPBOARD_CAPTURED, text)
    })
  }
}

function showWindow(text: string) {
  if (!mainWindow) return

  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize
  const [winW, winH] = mainWindow.getSize()
  mainWindow.setPosition(
    Math.round((width - winW) / 2),
    Math.round((height - winH) / 2)
  )

  mainWindow.show()
  mainWindow.focus()
  sendTextToRenderer(text)
}

function simulatePaste() {
  try {
    if (process.platform === 'win32') {
      execSync(
        'powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^\' + \'v\')"',
        { timeout: 2000 }
      )
    } else if (process.platform === 'linux') {
      execSync('xdotool key ctrl+v', { timeout: 2000 })
    } else if (process.platform === 'darwin') {
      execSync("osascript -e 'tell application \"System Events\" to keystroke \"v\" using command down'", { timeout: 2000 })
    }
  } catch {
    // Text is in clipboard; user can Ctrl+V manually
  }
}

function setupIPC() {
  ipcMain.on(IPC.RENDERER_READY, () => {
    rendererReady = true
  })

  ipcMain.on(IPC.COPY_TO_CLIPBOARD, (_event, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.on(IPC.PASTE_BACK, (_event, text: string) => {
    clipboard.writeText(text)
    mainWindow?.hide()
    setTimeout(simulatePaste, 200)
  })

  ipcMain.handle(IPC.SETTINGS_GET, () => {
    const store = setupStore()
    return store.get('settings')
  })

  ipcMain.on(IPC.SETTINGS_SET, (_event, settings) => {
    const store = setupStore()
    store.set('settings', settings)
  })
}

app.whenReady().then(() => {
  // Prevent app from closing when all windows are closed (live in tray)
  app.on('window-all-closed', () => { /* stay in tray */ })

  createWindow()
  createTray()
  setupIPC()

  try {
    const { setupHotkey } = require('./hotkey') as typeof import('./hotkey')
    setupHotkey((text) => showWindow(text))
    console.log('[skuoty] ready — double Ctrl+C to activate')
  } catch (err) {
    console.error('[skuoty] keyboard hook failed:', err)
  }
})
