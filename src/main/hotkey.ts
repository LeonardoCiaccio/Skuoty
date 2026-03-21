import { clipboard } from 'electron'
import { uIOhook, UiohookKey } from 'uiohook-napi'

const DOUBLE_PRESS_WINDOW_MS = 600

let lastPressTime = 0
let modifierDown  = false
let captureModifier: 'Ctrl' | 'Alt' = 'Ctrl'
let captureKeyCode = UiohookKey.C

function parseAccelerator(accelerator: string) {
  const parts = accelerator.split('+')
  const keyName = parts[parts.length - 1].toUpperCase()
  captureModifier = parts.includes('Alt') ? 'Alt' : 'Ctrl'
  captureKeyCode  = (UiohookKey as Record<string, number>)[keyName] ?? UiohookKey.C
}

function isModifierKey(keycode: number): boolean {
  return captureModifier === 'Alt'
    ? keycode === UiohookKey.Alt || keycode === UiohookKey.AltRight
    : keycode === UiohookKey.Ctrl || keycode === UiohookKey.CtrlRight
}

export function setupHotkey(onCapture: (text: string) => void, accelerator = 'Ctrl+C') {
  parseAccelerator(accelerator)

  uIOhook.on('keydown', (e) => {
    if (isModifierKey(e.keycode)) { modifierDown = true; return }

    if (modifierDown && e.keycode === captureKeyCode) {
      const now   = Date.now()
      const delta = now - lastPressTime
      lastPressTime = now

      if (delta < DOUBLE_PRESS_WINDOW_MS && delta > 0) {
        setTimeout(() => {
          const text = clipboard.readText().trim()
          if (text.length > 0) onCapture(text)
        }, 80)
      }
    }
  })

  uIOhook.on('keyup', (e) => {
    if (isModifierKey(e.keycode)) modifierDown = false
  })

  console.log('[hotkey] uiohook starting...')
  uIOhook.start()
  console.log('[hotkey] uiohook started')
}

export function updateCaptureKey(accelerator: string) {
  parseAccelerator(accelerator)
  lastPressTime = 0
  modifierDown  = false
}

export function stopHotkey() {
  uIOhook.stop()
}
