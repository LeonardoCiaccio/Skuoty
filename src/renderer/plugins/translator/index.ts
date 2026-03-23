import type { SkuotyPlugin } from '../../../shared/types'

/**
 * Built-in translator plugin.
 * Uses the current SkuotyPlugin interface: options dropdown + prompt template.
 * {{option}} is replaced by the selected target language, {{context}} by the input text.
 */
const plugin: SkuotyPlugin = {
  name: 'translator',
  label: [{ en: 'Translate', it: 'Traduci', es: 'Traducir', fr: 'Traduire', de: 'Übersetzen' }],
  options: [
    { label: [{ en: 'Italian',             it: 'Italiano'  }], value: 'Italian'            },
    { label: [{ en: 'English',             it: 'Inglese'   }], value: 'English'             },
    { label: [{ en: 'Spanish',             es: 'Español'   }], value: 'Spanish'             },
    { label: [{ en: 'French',              fr: 'Français'  }], value: 'French'              },
    { label: [{ en: 'German',              de: 'Deutsch'   }], value: 'German'              },
    { label: [{ en: 'Portuguese'                           }], value: 'Portuguese'          },
    { label: [{ en: 'Japanese'                             }], value: 'Japanese'            },
    { label: [{ en: 'Chinese (Simplified)'                 }], value: 'Chinese (Simplified)'},
  ],
  prompt: 'Translate the following text into {{option}}. Reply with ONLY the translated text, no explanations, no notes.\n\n{{context}}',
  enabled: true,
}

export default plugin
