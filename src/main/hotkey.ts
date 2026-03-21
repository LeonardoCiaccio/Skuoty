import { clipboard } from 'electron'
import { uIOhook, UiohookKey } from 'uiohook-napi'

const DOUBLE_PRESS_WINDOW_MS = 600

let lastCtrlCTime = 0
let ctrlDown = false

export function setupHotkey(onCapture: (text: string) => void) {
  uIOhook.on('keydown', (e) => {
    // Track both left and right Ctrl
    if (e.keycode === UiohookKey.Ctrl || e.keycode === UiohookKey.CtrlRight) {
      ctrlDown = true
      return
    }

    if (ctrlDown && e.keycode === UiohookKey.C) {
      const now = Date.now()
      const delta = now - lastCtrlCTime
      lastCtrlCTime = now
      console.log(`[hotkey] Ctrl+C detected, delta=${delta}ms`)

      if (delta < DOUBLE_PRESS_WINDOW_MS && delta > 0) {
        console.log('[hotkey] Double Ctrl+C! Reading clipboard...')
        setTimeout(() => {
          const text = clipboard.readText().trim()
          console.log(`[hotkey] clipboard text length: ${text.length}`)
          if (text.length > 0) {
            onCapture(text)
          }
        }, 80)
      }
    }
  })

  uIOhook.on('keyup', (e) => {
    if (e.keycode === UiohookKey.Ctrl || e.keycode === UiohookKey.CtrlRight) {
      ctrlDown = false
    }
  })

  console.log('[hotkey] uiohook starting...')
  uIOhook.start()
  console.log('[hotkey] uiohook started')
}

export function stopHotkey() {
  uIOhook.stop()
}
