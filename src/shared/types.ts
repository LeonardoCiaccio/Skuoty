// ─── IPC Channels ─────────────────────────────────────────────────────────────
export const IPC = {
  RENDERER_READY:     'renderer:ready',
  CLIPBOARD_CAPTURED: 'clipboard:captured',
  PASTE_BACK:         'paste:back',
  COPY_TO_CLIPBOARD:  'clipboard:copy',
  SETTINGS_GET:       'settings:get',
  SETTINGS_SET:       'settings:set',
  WINDOW_SHOW:        'window:show',
  WINDOW_HIDE:        'window:hide',
  LANGUAGE_CHANGED:   'language:changed',
  HOTKEYS_CHANGED:    'hotkeys:changed',
  EXPORT_FILE:        'backup:export',
  IMPORT_FILE:        'backup:import',
} as const

// ─── i18n ──────────────────────────────────────────────────────────────────────
/** One locale entry, e.g. {"en":"Translator"} or {"it":"Traduttore"} */
export type LocalizedLabel = Record<string, string>

/** Returns the label in `lang`, falling back to "en". */
export function getLabel(labels: LocalizedLabel[], lang: string): string {
  const hit = labels.find((l) => l[lang])
  if (hit) return hit[lang]
  const fallback = labels.find((l) => l['en'])
  return fallback ? fallback['en'] : ''
}

// ─── Plugin ────────────────────────────────────────────────────────────────────
export interface PluginOption {
  label: LocalizedLabel[]
  value: string
}

/**
 * A Skuoty plugin is a plain JSON object.
 * - options: array  → dropdown shown to user; {{option}} = selected value
 * - options: string → no UI; {{option}} = the string itself
 * - {{context}} in prompt = the text to process (output if present, else selection)
 */
export interface SkuotyPlugin {
  name:    string
  label:   LocalizedLabel[]
  options: PluginOption[] | string
  prompt:  string
  enabled: boolean
}

// ─── AI Providers ──────────────────────────────────────────────────────────────
export type AIProvider = 'gemini' | 'ollama' | 'openrouter' | 'anthropic' | 'openai'

export interface GeminiConfig     { apiKey: string; model: string }
export interface OllamaConfig     { baseUrl: string; model: string }
export interface OpenRouterConfig { apiKey: string; model: string }
export interface AnthropicConfig  { apiKey: string; model: string }
export interface OpenAIConfig     { apiKey: string; model: string }

export interface AIProviderConfigs {
  gemini:     GeminiConfig
  ollama:     OllamaConfig
  openrouter: OpenRouterConfig
  anthropic:  AnthropicConfig
  openai:     OpenAIConfig
}

// ─── App Settings ──────────────────────────────────────────────────────────────
export interface HotkeySettings {
  capture: string   // trigger, e.g. '2x:Ctrl+C' or 'Ctrl+Shift+C'
}

export interface AppSettings {
  language:        string
  theme:           'dark' | 'light'
  aiProvider:      AIProvider
  providers:       AIProviderConfigs
  plugins:         SkuotyPlugin[]
  previewMaxChars: number
  hotkeys:         HotkeySettings
}

export const DEFAULT_SETTINGS: AppSettings = {
  language:   'en',
  theme:      'dark',
  aiProvider: 'gemini',
  providers: {
    gemini:     { apiKey: '',                        model: 'gemini-2.0-flash' },
    ollama:     { baseUrl: 'http://localhost:11434', model: 'llama3.2' },
    openrouter: { apiKey: '',                        model: 'openai/gpt-4o-mini' },
    anthropic:  { apiKey: '',                        model: 'claude-haiku-4-5-20251001' },
    openai:     { apiKey: '',                        model: 'gpt-4o-mini' },
  },
  plugins:         [],
  previewMaxChars: 200,
  hotkeys: {
    capture: '2x:Ctrl+C',
  },
}
