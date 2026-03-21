import type { SkuotyPlugin } from '../../../shared/types'

const DEFAULT_PROMPT = `You are a professional translator.
Translate the following text into {targetLang}.
Reply with ONLY the translated text, no explanations, no notes.

Text to translate:
{input}`

const plugin: SkuotyPlugin = {
  id: 'translator',
  name: 'Translator',
  description: 'Translates selected text into a target language using Gemini AI.',
  inputSource: 'selection',

  fields: [
    {
      key: 'targetLang',
      label: 'Target language',
      type: 'select',
      default: 'Italian',
      options: [
        { value: 'Italian', label: 'Italian' },
        { value: 'English', label: 'English' },
        { value: 'Spanish', label: 'Spanish' },
        { value: 'French', label: 'French' },
        { value: 'German', label: 'German' },
        { value: 'Portuguese', label: 'Portuguese' },
        { value: 'Japanese', label: 'Japanese' },
        { value: 'Chinese (Simplified)', label: 'Chinese (Simplified)' },
      ],
    },
    {
      key: 'prompt',
      label: 'Prompt',
      type: 'textarea',
      default: DEFAULT_PROMPT,
      placeholder: 'Custom prompt…',
    },
  ],

  async run(input, config, apiKey, model) {
    if (!apiKey) throw new Error('Gemini API key not set. Go to Settings.')

    const prompt = (config.prompt || DEFAULT_PROMPT)
      .replace('{targetLang}', config.targetLang || 'Italian')
      .replace('{input}', input)

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err?.error?.message ?? `API error ${response.status}`)
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty response from Gemini.')
    return text.trim()
  },
}

export default plugin
