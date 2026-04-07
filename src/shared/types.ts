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
  EXPORT_FILE:        'backup:export',
  IMPORT_FILE:        'backup:import',
  SESSION_LIST:       'sessions:list',
  SESSION_READ:       'sessions:read',
  SESSION_WRITE:      'sessions:write',
  SESSION_DELETE:     'sessions:delete',
  OPEN_EXTERNAL:      'shell:openExternal',
  SHOW_SPLASH:        'window:showSplash',
  EXPORT_PLUGIN:      'plugin:export',
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

export interface GeminiConfig     { apiKey: string; model: string; temperature: number; maxTokens: number }
export interface OllamaConfig     { baseUrl: string; model: string; temperature: number; topP: number; maxTokens: number }
export interface OpenRouterConfig { apiKey: string; model: string; temperature: number; maxTokens: number }
export interface AnthropicConfig  { apiKey: string; model: string; temperature: number; maxTokens: number }
export interface OpenAIConfig     { apiKey: string; model: string; temperature: number; maxTokens: number }

export interface AIProviderConfigs {
  gemini:     GeminiConfig
  ollama:     OllamaConfig
  openrouter: OpenRouterConfig
  anthropic:  AnthropicConfig
  openai:     OpenAIConfig
}

// ─── App Settings ──────────────────────────────────────────────────────────────
export interface AppSettings {
  language:        string
  theme:           'dark' | 'light'
  aiProvider:      AIProvider
  providers:       AIProviderConfigs
  plugins:         SkuotyPlugin[]
  previewMaxChars: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  language:   'en',
  theme:      'dark',
  aiProvider: 'gemini',
  providers: {
    gemini:     { apiKey: '',                        model: 'gemini-2.0-flash',        temperature: 0.3, maxTokens: 1024 },
    ollama:     { baseUrl: 'http://localhost:11434', model: 'llama3.2',               temperature: 0.3, maxTokens: 1024, topP: 0.9 },
    openrouter: { apiKey: '',                        model: 'openai/gpt-4o-mini',      temperature: 0.3, maxTokens: 1024 },
    anthropic:  { apiKey: '',                        model: 'claude-haiku-4-5-20251001', temperature: 0.3, maxTokens: 1024 },
    openai:     { apiKey: '',                        model: 'gpt-4o-mini',             temperature: 0.3, maxTokens: 1024 },
  },
  plugins: [
    {
      name: 'translator',
      label: [{ en: 'Translate' }, { it: 'Traduci' }, { es: 'Traducir' }, { fr: 'Traduire' }, { de: 'Übersetzen' }],
      options: [
        { label: [{ en: 'English'    }, { it: 'Inglese'     }], value: 'English'    },
        { label: [{ en: 'Italian'    }, { it: 'Italiano'    }], value: 'Italian'    },
        { label: [{ en: 'Spanish'    }, { it: 'Spagnolo'    }], value: 'Spanish'    },
        { label: [{ en: 'French'     }, { it: 'Francese'    }], value: 'French'     },
        { label: [{ en: 'German'     }, { it: 'Tedesco'     }], value: 'German'     },
        { label: [{ en: 'Portuguese' }, { it: 'Portoghese'  }], value: 'Portuguese' },
        { label: [{ en: 'Japanese'   }, { it: 'Giapponese'  }], value: 'Japanese'   },
        { label: [{ en: 'Chinese'    }, { it: 'Cinese'      }], value: 'Chinese'    },
      ],
      prompt: 'Translate the following text to {{option}}. Return only the translated text, with no explanations, no notes, no quotation marks:\n\n{{context}}',
      enabled: true,
    },
    {
      name: 'summarizer',
      label: [{ en: 'Summarize' }, { it: 'Riassumi' }, { es: 'Resumir' }, { fr: 'Résumer' }, { de: 'Zusammenfassen' }],
      options: [
        { label: [{ en: 'Short'    }, { it: 'Breve'       }, { es: 'Corto'    }, { fr: 'Court'    }, { de: 'Kurz'       }], value: 'in 2-3 sentences'                        },
        { label: [{ en: 'Medium'   }, { it: 'Medio'       }, { es: 'Medio'    }, { fr: 'Moyen'    }, { de: 'Mittel'     }], value: 'in a short paragraph'                    },
        { label: [{ en: 'Detailed' }, { it: 'Dettagliato' }, { es: 'Detallado'}, { fr: 'Détaillé' }, { de: 'Ausführlich'}], value: 'in a detailed paragraph with bullet points'},
      ],
      prompt: 'Detect the language of the text below and summarize it {{option}} in the same language. Return only the summary, with no preamble, no explanations, no quotation marks:\n\n{{context}}',
      enabled: true,
    },
    {
      name: 'rewriter',
      label: [{ en: 'Rewrite' }, { it: 'Riscrivi' }, { es: 'Reescribir' }, { fr: 'Réécrire' }, { de: 'Umschreiben' }],
      options: [
        { label: [{ en: 'Friendly'     }, { it: 'Amichevole' }, { es: 'Amigable'    }, { fr: 'Amical'      }, { de: 'Freundlich'  }], value: 'in a friendly and warm tone'                    },
        { label: [{ en: 'Professional' }, { it: 'Professionale'}, {es: 'Profesional' }, { fr: 'Professionnel'}, { de: 'Professionell'}], value: 'in a formal and professional tone'             },
        { label: [{ en: 'Concise'      }, { it: 'Conciso'    }, { es: 'Conciso'     }, { fr: 'Concis'      }, { de: 'Präzise'     }], value: 'as concisely as possible, removing any redundancy'},
        { label: [{ en: 'Persuasive'   }, { it: 'Persuasivo' }, { es: 'Persuasivo'  }, { fr: 'Persuasif'   }, { de: 'Überzeugend' }], value: 'in a persuasive and compelling tone'             },
        { label: [{ en: 'Simple'       }, { it: 'Semplice'   }, { es: 'Simple'      }, { fr: 'Simple'      }, { de: 'Einfach'     }], value: 'using simple language, easy to understand for anyone'},
        { label: [{ en: 'Assertive'    }, { it: 'Assertivo'  }, { es: 'Asertivo'    }, { fr: 'Assertif'    }, { de: 'Bestimmt'    }], value: 'in a direct and assertive tone, without hesitation'},
        { label: [{ en: 'Empathetic'   }, { it: 'Empatico'   }, { es: 'Empático'    }, { fr: 'Empathique'  }, { de: 'Einfühlsam'  }], value: 'with an empathetic and understanding tone'        },
      ],
      prompt: 'Detect the language of the text below and rewrite it {{option}}. You MUST respond exclusively in the same language as the input text, no exceptions. Return only the rewritten text, with no preamble, no explanations, no quotation marks:\n\n{{context}}',
      enabled: true,
    },
    {
      name: 'grammar',
      label: [{ en: 'Fix Grammar' }, { it: 'Correggi' }, { es: 'Corregir' }, { fr: 'Corriger' }, { de: 'Korrigieren' }],
      options: 'fix all grammar, spelling and punctuation errors',
      prompt: 'Detect the language of the text below and correct ALL errors: grammar, spelling, punctuation, verb tenses, temporal inconsistencies, and wrong word choices. Keep the original intent and style. Write in the same language as the input. Return only the corrected text, no explanations, no quotation marks:\n\n{{context}}',
      enabled: true,
    },
  ],
  previewMaxChars: 200,
}
