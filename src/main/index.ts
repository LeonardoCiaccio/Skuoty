import { app, BrowserWindow, ipcMain, clipboard, screen, Tray, Menu, nativeImage, dialog } from 'electron'
import { spawn, spawnSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { setupStore } from './store'
import { IPC } from '../shared/types'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let rendererReady = false
let isQuitting = false
let currentLang = 'en'
const isDev = process.env.NODE_ENV === 'development'

const TRAY_LABELS: Record<string, { show: string; quit: string }> = {
  en: { show: 'Show', quit: 'Quit' },
  it: { show: 'Mostra', quit: 'Esci' },
  es: { show: 'Mostrar', quit: 'Salir' },
  fr: { show: 'Afficher', quit: 'Quitter' },
  de: { show: 'Anzeigen', quit: 'Beenden' },
}

// ─── Paste-back: Win32 HWND tracking ─────────────────────────────────────────

const PS_GET_HWND = path.join(tmpdir(), 'skuoty-get-hwnd.ps1')
const PS_PASTE    = path.join(tmpdir(), 'skuoty-paste.ps1')

function writePasteScripts() {
  writeFileSync(PS_GET_HWND, [
    'Add-Type -MemberDefinition \'[DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow();\' -Name SGHW -Namespace SK -PassThru | Out-Null',
    '[SK.SGHW]::GetForegroundWindow()',
  ].join('\n'), 'utf-8')

  writeFileSync(PS_PASTE, [
    'param([long]$Hwnd)',
    'Add-Type -TypeDefinition @"',
    'using System;',
    'using System.Runtime.InteropServices;',
    'public class SKPaste {',
    '    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);',
    '    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);',
    '    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);',
    '    [DllImport("user32.dll")] public static extern int  GetWindowThreadProcessId(IntPtr h, IntPtr p);',
    '    [DllImport("kernel32.dll")] public static extern int GetCurrentThreadId();',
    '    [DllImport("user32.dll")] public static extern bool AttachThreadInput(int a, int b, bool f);',
    '    [DllImport("user32.dll")] public static extern void keybd_event(byte a, byte b, int c, int d);',
    '}',
    '"@',
    // AttachThreadInput trick: lets SetForegroundWindow work even when
    // another window owns the foreground (Windows normally blocks this).
    '$cur = [SKPaste]::GetCurrentThreadId()',
    '$tgt = [SKPaste]::GetWindowThreadProcessId([IntPtr]$Hwnd, [IntPtr]::Zero)',
    '[SKPaste]::AttachThreadInput($cur, $tgt, $true)',
    '[SKPaste]::ShowWindow([IntPtr]$Hwnd, 9)',   // SW_RESTORE
    '[SKPaste]::SetForegroundWindow([IntPtr]$Hwnd)',
    '[SKPaste]::BringWindowToTop([IntPtr]$Hwnd)',
    '[SKPaste]::AttachThreadInput($cur, $tgt, $false)',
    'Start-Sleep -Milliseconds 200',
    '[SKPaste]::keybd_event(0x11,0,0,0)',   // CTRL down
    '[SKPaste]::keybd_event(0x56,0,0,0)',   // V down
    'Start-Sleep -Milliseconds 30',
    '[SKPaste]::keybd_event(0x56,0,2,0)',   // V up
    '[SKPaste]::keybd_event(0x11,0,2,0)',   // CTRL up
  ].join('\n'), 'utf-8')
}

let targetHwnd = '0'

/** Called async at the start of showWindow() — captures whatever window is in
 *  the foreground before Skuoty appears. Ready long before the user can click
 *  paste-back (AI call takes seconds). */
function captureTargetHwnd() {
  if (process.platform !== 'win32') return
  targetHwnd = '0'
  const proc = spawn('powershell.exe', [
    '-NoProfile', '-WindowStyle', 'Hidden', '-File', PS_GET_HWND,
  ])
  let out = ''
  proc.stdout?.on('data', (d: Buffer) => { out += d.toString() })
  proc.on('close', () => { targetHwnd = out.trim() || '0' })
  proc.on('error', () => { /* keep '0' */ })
}

function simulatePaste() {
  try {
    if (process.platform === 'win32') {
      if (targetHwnd !== '0') {
        spawnSync('powershell.exe', [
          '-NoProfile', '-WindowStyle', 'Hidden', '-File', PS_PASTE, '-Hwnd', targetHwnd,
        ], { timeout: 4000 })
      }
    } else if (process.platform === 'linux') {
      spawnSync('xdotool', ['key', 'ctrl+v'], { timeout: 2000 })
    } else if (process.platform === 'darwin') {
      spawnSync('osascript', ['-e', 'tell application "System Events" to keystroke "v" using command down'], { timeout: 2000 })
    }
  } catch { /* text is in clipboard; user can Ctrl+V manually */ }
}

// ─── Tray ─────────────────────────────────────────────────────────────────────

// Suppress harmless GPU cache errors on Windows
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('disable-gpu-disk-cache')
app.commandLine.appendSwitch('disk-cache-size', '0')

function buildTrayMenu() {
  const labels = TRAY_LABELS[currentLang] ?? TRAY_LABELS['en']
  return Menu.buildFromTemplate([
    {
      label: labels.show,
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    { type: 'separator' },
    {
      label: labels.quit,
      click: () => app.quit(),
    },
  ])
}

function createTray() {
  const iconPath = path.join(app.getAppPath(), 'assets/skuoty.png')
  let icon = nativeImage.createFromPath(iconPath)
  if (!icon.isEmpty()) icon = icon.resize({ width: 32, height: 32 })
  tray = new Tray(icon)
  tray.setToolTip('Skuoty')
  tray.setContextMenu(buildTrayMenu())

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

// ─── Window ───────────────────────────────────────────────────────────────────

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
    // mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'))
  }

  mainWindow.webContents.on('did-finish-load', () => { rendererReady = true })

  mainWindow.on('close', (e) => {
    if (!isQuitting) { e.preventDefault(); mainWindow?.hide() }
  })

  mainWindow.on('blur', () => { mainWindow?.hide() })
}

function sendTextToRenderer(text: string) {
  if (!mainWindow) return
  if (rendererReady) {
    mainWindow.webContents.send(IPC.CLIPBOARD_CAPTURED, text)
  } else {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.send(IPC.CLIPBOARD_CAPTURED, text)
    })
  }
}

function showWindow(text: string) {
  if (!mainWindow) return

  // Capture the currently focused window BEFORE Skuoty takes focus.
  // The user must wait for the AI response (seconds), so captureTargetHwnd()
  // will definitely complete before they click paste-back.
  captureTargetHwnd()

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

// ─── IPC ──────────────────────────────────────────────────────────────────────

function setupIPC() {
  ipcMain.on(IPC.RENDERER_READY, () => { rendererReady = true })

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

  ipcMain.on(IPC.LANGUAGE_CHANGED, (_event, lang: string) => {
    currentLang = lang
    if (tray) tray.setContextMenu(buildTrayMenu())
  })

  ipcMain.handle(IPC.EXPORT_FILE, async (_event, json: string) => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export Skuoty settings',
      defaultPath: 'skuoty-backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (canceled || !filePath) return false
    writeFileSync(filePath, json, 'utf-8')
    return true
  })

  ipcMain.handle(IPC.IMPORT_FILE, async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Import Skuoty settings',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (canceled || !filePaths[0]) return null
    return readFileSync(filePaths[0], 'utf-8')
  })
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  app.on('window-all-closed', () => { /* stay in tray */ })
  app.on('before-quit', () => { isQuitting = true })

  if (process.platform === 'win32') writePasteScripts()

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
