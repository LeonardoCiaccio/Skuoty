import { app, BrowserWindow, ipcMain, clipboard, screen, Tray, Menu, nativeImage, dialog, shell } from 'electron'
import { spawn, spawnSync } from 'child_process'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { setupStore } from './store'
import { setupHotkey } from './hotkey'
import { IPC } from '../shared/types'

let SESSIONS_DIR = ''

function ensureSessionsDir() {
  if (!SESSIONS_DIR) SESSIONS_DIR = path.join(app.getPath('userData'), 'sessions')
  if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true })
}

let mainWindow:   BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null
let tray: Tray | null = null
let dialogOpen = false
let rendererReady = false
let isQuitting = false
let currentLang = 'en'
let sessionActive = false
const isDev = process.env.NODE_ENV === 'development'

const TRAY_LABELS: Record<string, { show: string; quit: string }> = {
  en: { show: 'Show', quit: 'Quit' },
  it: { show: 'Mostra', quit: 'Esci' },
  es: { show: 'Mostrar', quit: 'Salir' },
  fr: { show: 'Afficher', quit: 'Quitter' },
  de: { show: 'Anzeigen', quit: 'Beenden' },
}

// ─── Win32 paste-back ─────────────────────────────────────────────────────────
//
// Architecture:
//  - A persistent PowerShell daemon starts at app launch, compiles the Win32
//    type ONCE, then waits for stdin commands.  Each HWND query costs ~5 ms.
//  - showWindow() awaits queryHwnd() (fast) BEFORE calling mainWindow.show(),
//    so we always capture the user's window, never Skuoty itself.
//  - Paste runs a separate one-shot PS1 that uses AttachThreadInput to force
//    the focus even when other windows are in front.

const PS_DAEMON = path.join(tmpdir(), 'skuoty-hwnd-daemon.ps1')
const PS_PASTE  = path.join(tmpdir(), 'skuoty-paste.ps1')

function writePasteScripts() {
  // Daemon: compiles Win32 type once, then answers "get" commands with the HWND
  writeFileSync(PS_DAEMON, `
Add-Type -MemberDefinition '[DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow();' -Name SKHD -Namespace SKD -PassThru | Out-Null
[Console]::Out.WriteLine("ready")
[Console]::Out.Flush()
while ($true) {
  $cmd = [Console]::ReadLine()
  if ($null -eq $cmd -or $cmd -eq "exit") { break }
  [Console]::Out.WriteLine([SKD.SKHD]::GetForegroundWindow())
  [Console]::Out.Flush()
}`.trim(), 'utf-8')

  // Paste: one-shot script, uses AttachThreadInput to bypass Windows foreground lock
  writeFileSync(PS_PASTE, `
param([long]$Hwnd)
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class SKPaste {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")] public static extern int  GetWindowThreadProcessId(IntPtr h, IntPtr p);
    [DllImport("kernel32.dll")] public static extern int GetCurrentThreadId();
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(int a, int b, bool f);
    [DllImport("user32.dll")] public static extern void keybd_event(byte a, byte b, int c, int d);
}
"@
$cur = [SKPaste]::GetCurrentThreadId()
$tgt = [SKPaste]::GetWindowThreadProcessId([IntPtr]$Hwnd, [IntPtr]::Zero)
[SKPaste]::AttachThreadInput($cur, $tgt, $true)
if ([SKPaste]::IsIconic([IntPtr]$Hwnd)) { [SKPaste]::ShowWindow([IntPtr]$Hwnd, 9) }
[SKPaste]::SetForegroundWindow([IntPtr]$Hwnd)
[SKPaste]::BringWindowToTop([IntPtr]$Hwnd)
[SKPaste]::AttachThreadInput($cur, $tgt, $false)
Start-Sleep -Milliseconds 200
[SKPaste]::keybd_event(0x11,0,0,0)
[SKPaste]::keybd_event(0x56,0,0,0)
Start-Sleep -Milliseconds 30
[SKPaste]::keybd_event(0x56,0,2,0)
[SKPaste]::keybd_event(0x11,0,2,0)`.trim(), 'utf-8')
}

// Daemon state
let daemon: ReturnType<typeof spawn> | null = null
let daemonReady = false
let daemonBuf = ''
const daemonQueue: ((hwnd: string) => void)[] = []

function startDaemon() {
  daemon = spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-File', PS_DAEMON])

  daemon.stdout?.on('data', (chunk: Buffer) => {
    daemonBuf += chunk.toString()
    const lines = daemonBuf.split(/\r?\n/)
    daemonBuf = lines.pop() ?? ''
    for (const raw of lines) {
      const line = raw.trim()
      if (!line) continue
      if (line === 'ready') { daemonReady = true; continue }
      daemonQueue.shift()?.(line)
    }
  })

  daemon.on('close', () => {
    daemon = null
    daemonReady = false
    // Drain pending HWND queries so callers don't hang forever
    while (daemonQueue.length) daemonQueue.shift()?.('0')
  })
  daemon.on('error', () => {
    daemon = null
    daemonReady = false
    while (daemonQueue.length) daemonQueue.shift()?.('0')
  })
}

/** Returns the HWND of the foreground window in ~5 ms (after daemon is ready). */
function queryHwnd(): Promise<string> {
  return new Promise((resolve) => {
    if (!daemon || !daemonReady) { resolve('0'); return }
    daemonQueue.push(resolve)
    daemon.stdin?.write('get\n')
  })
}

let targetHwnd = '0'

function simulatePaste() {
  if (targetHwnd === '0') return
  spawnSync('powershell.exe', [
    '-NoProfile', '-WindowStyle', 'Hidden', '-File', PS_PASTE, '-Hwnd', targetHwnd,
  ], { timeout: 4000 })
}

// ─── Tray ─────────────────────────────────────────────────────────────────────

function buildTrayMenu() {
  const labels = TRAY_LABELS[currentLang] ?? TRAY_LABELS['en']
  return Menu.buildFromTemplate([
    { label: labels.show, click: () => {
      if (sessionActive) { mainWindow?.show(); mainWindow?.focus() }
      else if (splashWindow) { splashWindow.show(); splashWindow.focus() }
    }},
    { type: 'separator' },
    { label: labels.quit, click: () => app.quit() },
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
    if (!mainWindow) return
    if (mainWindow.isVisible()) mainWindow.hide()
    else if (sessionActive) { mainWindow.show(); mainWindow.focus() }
    else if (splashWindow) { splashWindow.show(); splashWindow.focus() }
  })
}


// ─── Splash ───────────────────────────────────────────────────────────────────

function createSplash(lang: string, theme: string) {
  const preload = path.join(__dirname, 'splash-preload.js')
  splashWindow = new BrowserWindow({
    width: 360, height: 460,
    frame: false, resizable: false,
    alwaysOnTop: true, center: true, skipTaskbar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload },
  })

  if (isDev) {
    splashWindow.loadURL(`http://localhost:5173/splash.html?lang=${lang}&theme=${theme}`)
  } else {
    splashWindow.loadFile(path.join(__dirname, '../../renderer/splash.html'), { query: { lang, theme } })
  }
}

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 640, height: 520, minWidth: 480, minHeight: 400, maxWidth: 860, maxHeight: 740,
    frame: false, transparent: false, resizable: true,
    show: false, alwaysOnTop: true, skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'))
  }

  mainWindow.webContents.on('did-finish-load', () => { rendererReady = true })
  mainWindow.on('close', (e) => { if (!isQuitting) { e.preventDefault(); mainWindow?.hide() } })
  mainWindow.on('blur', () => { if (!dialogOpen) mainWindow?.hide() })
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

async function showWindow(text: string) {
  if (!mainWindow || !sessionActive) return

  // Query the daemon BEFORE showing Skuoty — at this point the user's window
  // is still in the foreground, so we get the correct HWND.
  targetHwnd = await queryHwnd()

  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  const [winW, winH] = mainWindow.getSize()
  mainWindow.setPosition(Math.round((width - winW) / 2), Math.round((height - winH) / 2))
  mainWindow.show()
  mainWindow.focus()
  sendTextToRenderer(text)
}

// ─── Session path validation ──────────────────────────────────────────────────

/** Returns the resolved .skuoty path only if `id` is a valid UUID-style string.
 *  Rejects path traversal attempts (e.g. "../../etc/passwd"). */
function safeSessionPath(id: string): string | null {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9\-]+$/.test(id)) return null
  const p = path.resolve(SESSIONS_DIR, `${id}.skuoty`)
  if (!p.startsWith(path.resolve(SESSIONS_DIR))) return null
  return p
}

// ─── IPC ──────────────────────────────────────────────────────────────────────

function setupIPC() {
  // Session unlocked from splash → forward to main window, show it, close splash
  ipcMain.on('session:unlocked', (_e, settingsJSON: string) => {
    sessionActive = true
    if (mainWindow) {
      mainWindow.webContents.send('session:ready', settingsJSON)
      mainWindow.show()
      mainWindow.focus()
    }
    splashWindow?.close()
    splashWindow = null
  })

  ipcMain.on(IPC.RENDERER_READY, () => { rendererReady = true })
  ipcMain.on(IPC.COPY_TO_CLIPBOARD, (_e, text: string) => {
    if (typeof text === 'string') clipboard.writeText(text)
  })

  ipcMain.on(IPC.PASTE_BACK, (_e, text: string) => {
    if (typeof text !== 'string') return
    clipboard.writeText(text)
    mainWindow?.hide()
    setTimeout(simulatePaste, 200)
  })

  ipcMain.handle(IPC.SETTINGS_GET, () => setupStore().get('settings'))
  ipcMain.on(IPC.SETTINGS_SET, (_e, s) => { setupStore().set('settings', s) })

  ipcMain.on(IPC.WINDOW_HIDE, () => { mainWindow?.hide() })

  ipcMain.on(IPC.SHOW_SPLASH, () => {
    sessionActive = false
    mainWindow?.hide()
    if (!splashWindow) {
      const store = setupStore()
      const theme = (store.get('settings') as { theme?: string } | undefined)?.theme ?? 'dark'
      createSplash(currentLang, theme)
    } else {
      splashWindow.show()
      splashWindow.focus()
    }
  })

  ipcMain.on(IPC.LANGUAGE_CHANGED, (_e, lang: string) => {
    const SUPPORTED = ['en', 'it', 'es', 'fr', 'de']
    if (typeof lang !== 'string' || !SUPPORTED.includes(lang)) return
    currentLang = lang
    if (tray) tray.setContextMenu(buildTrayMenu())
  })

  ipcMain.handle(IPC.EXPORT_FILE, async (_e, json: string) => {
    dialogOpen = true
    mainWindow?.setAlwaysOnTop(false)
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export Skuoty settings', defaultPath: 'skuoty-backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    dialogOpen = false
    mainWindow?.setAlwaysOnTop(true)
    if (!canceled && filePath) writeFileSync(filePath, json, 'utf-8')
    mainWindow?.show()
    return !canceled && !!filePath
  })

  ipcMain.handle(IPC.SESSION_LIST, () => {
    ensureSessionsDir()
    return readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.skuoty'))
      .map(f => {
        try {
          const id  = f.replace('.skuoty', '')
          const raw = readFileSync(path.join(SESSIONS_DIR, f), 'utf-8')
          const { name, created, modified } = JSON.parse(raw)
          return { id, name, created, modified }
        } catch {
          return null   // skip corrupted files without hiding valid sessions
        }
      })
      .filter(Boolean)
  })

  ipcMain.handle(IPC.SESSION_READ, (_e, id: string) => {
    ensureSessionsDir()
    const p = safeSessionPath(id)
    if (!p || !existsSync(p)) return null
    return readFileSync(p, 'utf-8')
  })

  ipcMain.handle(IPC.SESSION_WRITE, (_e, id: string, data: string) => {
    ensureSessionsDir()
    const p = safeSessionPath(id)
    if (!p) return
    writeFileSync(p, data, 'utf-8')
  })

  ipcMain.handle(IPC.SESSION_DELETE, (_e, id: string) => {
    ensureSessionsDir()
    const p = safeSessionPath(id)
    if (p && existsSync(p)) unlinkSync(p)
  })

  ipcMain.on(IPC.OPEN_EXTERNAL, (_e, url: string) => {
    // Only allow https URLs to prevent arbitrary protocol execution
    if (typeof url === 'string' && url.startsWith('https://')) {
      shell.openExternal(url)
    }
  })

  ipcMain.handle(IPC.IMPORT_FILE, async () => {
    dialogOpen = true
    mainWindow?.setAlwaysOnTop(false)
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Import Skuoty settings',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })
    dialogOpen = false
    mainWindow?.setAlwaysOnTop(true)
    mainWindow?.show()
    if (canceled || !filePaths[0]) return null
    return readFileSync(filePaths[0], 'utf-8')
  })
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.whenReady().then(() => {
    dialog.showMessageBoxSync({
      type: 'warning',
      title: 'Skuoty',
      message: 'Skuoty is already running.',
      detail: 'Please close the existing Skuoty instance before opening a new one.',
      buttons: ['OK'],
    })
    app.quit()
  })
} else {
  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus() }
  })
}

app.whenReady().then(() => {
  app.on('window-all-closed', () => { /* stay in tray */ })
  app.on('before-quit', () => { isQuitting = true })

  if (process.platform === 'win32') {
    writePasteScripts()
    startDaemon()   // compiles Win32 type once (~300 ms), then stays ready
  }

  // Splash uses dark theme; language from system locale if available
  const sysLang = app.getLocale().split('-')[0]
  const SUPPORTED = ['en', 'it', 'es', 'fr', 'de']
  const splashLang = SUPPORTED.includes(sysLang) ? sysLang : 'en'
  createSplash(splashLang, 'dark')

  createWindow()
  createTray()
  setupIPC()
  setupHotkey((text) => showWindow(text))
  console.log('[skuoty] ready — Ctrl+C+C to capture')
})
