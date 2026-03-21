import type { AppSettings, SkuotyPlugin, AIProvider } from '../../shared/types'

/** Resolves the prompt template and calls the active AI provider. */
export async function runPlugin(
  plugin: SkuotyPlugin,
  option: string,
  context: string,
  settings: AppSettings,
): Promise<string> {
  const prompt = plugin.prompt
    .replace(/\{\{option\}\}/g, option)
    .replace(/\{\{context\}\}/g, context)

  switch (settings.aiProvider) {
    case 'gemini':     return callGemini(prompt, settings.providers.gemini)
    case 'ollama':     return callOllama(prompt, settings.providers.ollama)
    case 'openrouter': return callOpenRouter(prompt, settings.providers.openrouter)
    case 'anthropic':  return callAnthropic(prompt, settings.providers.anthropic)
    case 'openai':     return callOpenAI(prompt, settings.providers.openai)
    default:           throw new Error('Unknown AI provider')
  }
}

/** Sends a minimal "reply ok" probe and returns the response text on success. */
export async function testProvider(
  provider: AIProvider,
  settings: AppSettings,
): Promise<string> {
  const probe = "Reply with exactly the word 'ok' and nothing else."
  const cfg = settings.providers
  switch (provider) {
    case 'gemini':     return callGemini(probe, cfg.gemini)
    case 'ollama':     return callOllama(probe, cfg.ollama)
    case 'openrouter': return callOpenRouter(probe, cfg.openrouter)
    case 'anthropic':  return callAnthropic(probe, cfg.anthropic)
    case 'openai':     return callOpenAI(probe, cfg.openai)
    default:           throw new Error('Unknown provider')
  }
}

/** Fetches the list of models available in a local Ollama instance. */
export async function fetchOllamaModels(baseUrl: string): Promise<string[]> {
  const res = await fetch(`${baseUrl}/api/tags`)
  if (!res.ok) throw new Error(`Ollama responded with HTTP ${res.status}`)
  const data = await res.json() as { models: { name: string }[] }
  return (data.models ?? []).map((m) => m.name)
}

// ─── Provider implementations ─────────────────────────────────────────────────

async function callGemini(prompt: string, cfg: { apiKey: string; model: string }): Promise<string> {
  if (!cfg.apiKey) throw new Error('Gemini API key not set. Go to Settings → AI.')
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 },
      }),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err?.error?.message ?? `Gemini error ${res.status}`)
  }
  const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty response from Gemini.')
  return text.trim()
}

async function callOllama(prompt: string, cfg: { baseUrl: string; model: string }): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: cfg.model, prompt, stream: false }),
  })
  if (!res.ok) throw new Error(`Ollama error ${res.status}`)
  const data = await res.json() as { response: string }
  return data.response.trim()
}

async function callOpenRouter(prompt: string, cfg: { apiKey: string; model: string }): Promise<string> {
  if (!cfg.apiKey) throw new Error('OpenRouter API key not set. Go to Settings → AI.')
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err?.error?.message ?? `OpenRouter error ${res.status}`)
  }
  const data = await res.json() as { choices: { message: { content: string } }[] }
  return data.choices[0].message.content.trim()
}

async function callAnthropic(prompt: string, cfg: { apiKey: string; model: string }): Promise<string> {
  if (!cfg.apiKey) throw new Error('Anthropic API key not set. Go to Settings → AI.')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err?.error?.message ?? `Anthropic error ${res.status}`)
  }
  const data = await res.json() as { content: { text: string }[] }
  return data.content[0].text.trim()
}

async function callOpenAI(prompt: string, cfg: { apiKey: string; model: string }): Promise<string> {
  if (!cfg.apiKey) throw new Error('OpenAI API key not set. Go to Settings → AI.')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err?.error?.message ?? `OpenAI error ${res.status}`)
  }
  const data = await res.json() as { choices: { message: { content: string } }[] }
  return data.choices[0].message.content.trim()
}
