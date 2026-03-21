// ─── Plugin System ────────────────────────────────────────────────────────────

/**
 * Defines which text source a plugin uses as input.
 * - 'selection' : the raw text copied by the user (Ctrl+C)
 * - 'elaborated': the output currently shown in the elaborated textarea
 */
export type PluginInputSource = 'selection' | 'elaborated'

/**
 * A single configurable field inside a plugin's settings panel.
 */
export interface PluginField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number'
  placeholder?: string
  options?: { value: string; label: string }[] // for type 'select'
  default?: string | number
}

/**
 * The contract every Skuoty plugin must implement.
 * Drop a file that exports a default object conforming to this interface
 * inside src/renderer/plugins/ and it will be picked up automatically.
 */
export interface SkuotyPlugin {
  /** Unique machine-readable id, e.g. 'translator' */
  id: string
  /** Human-readable name shown in the UI */
  name: string
  /** Short description */
  description: string
  /** Which text the plugin reads as input */
  inputSource: PluginInputSource
  /** Configurable fields rendered in the plugin panel */
  fields: PluginField[]
  /**
   * Called when the user triggers the plugin.
   * @param input   The text to process (from inputSource)
   * @param config  Values filled in by the user for this plugin's fields
   * @param apiKey  The Gemini API key from global settings
   * @param model   The Gemini model id from global settings
   * @returns       The processed text to show in the elaborated area
   */
  run(input: string, config: Record<string, string>, apiKey: string, model: string): Promise<string>
}

// ─── IPC Channels ─────────────────────────────────────────────────────────────

export const IPC = {
  /** Renderer → Main: renderer Vue app is mounted and ready to receive events */
  RENDERER_READY: 'renderer:ready',
  /** Main → Renderer: clipboard text captured after double Ctrl+C */
  CLIPBOARD_CAPTURED: 'clipboard:captured',
  /** Renderer → Main: paste elaborated text into previous window */
  PASTE_BACK: 'paste:back',
  /** Renderer → Main: copy text to clipboard */
  COPY_TO_CLIPBOARD: 'clipboard:copy',
  /** Renderer ↔ Main: read/write persistent settings */
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  /** Main → Renderer: show/hide window */
  WINDOW_SHOW: 'window:show',
  WINDOW_HIDE: 'window:hide',
} as const

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface AppSettings {
  geminiApiKey: string
  geminiModel: string
  /** Per-plugin config keyed by plugin id */
  plugins: Record<string, Record<string, string>>
  /** Max chars shown in preview */
  previewMaxChars: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
  plugins: {},
  previewMaxChars: 200,
}

export const GEMINI_MODELS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (fast)' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (powerful)' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
]
