import type { AppSettings, SkuotyPlugin, AIProvider, UnslothConfig, OllamaConfig } from '../../shared/types'

/** Error thrown by AI providers — has a translatable `code` key. */
export class AIError extends Error {
  constructor(public code: string, detail = '') {
    super(detail || code)
  }
}

function wrapFetch<T>(promise: Promise<T>): Promise<T> {
  return promise.catch((e) => {
    if (e instanceof TypeError) throw new AIError('errNetwork', e.message)
    throw e
  })
}

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
    case 'unsloth':    return callUnsloth(prompt, settings.providers.unsloth)
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
    case 'unsloth':    return callUnsloth(probe, cfg.unsloth)
    default:           throw new Error('Unknown provider')
  }
}

/** Fetches the list of models available in a local Ollama instance. */
export async function fetchOllamaModels(baseUrl: string): Promise<string[]> {
  const res = await wrapFetch(fetch(`${baseUrl}/api/tags`))
  if (!res.ok) throw new AIError('errApi', `Ollama ${res.status}`)
  const data = await res.json() as { models: { name: string }[] }
  return (data.models ?? []).map((m) => m.name)
}

// ─── Unsloth Studio ───────────────────────────────────────────────────────────
// Requests go through the main process: Unsloth Studio's CORS allowlist only admits
// its own UI origins, so a direct fetch from the renderer would be blocked.

export interface UnslothModel { id: string; loaded: boolean }

function unslothUrl(baseUrl: string, path: string): string {
  // Accept both "http://host:8888" and "http://host:8888/v1"
  const root = baseUrl.trim().replace(/\/+$/, '').replace(/\/v1$/, '')
  return `${root}/v1${path}`
}

function unslothHeaders(apiKey: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey.trim()) h.Authorization = `Bearer ${apiKey.trim()}`
  return h
}

async function unslothRequest(
  cfg: Pick<UnslothConfig, 'baseUrl' | 'apiKey'>,
  path: string,
  method: 'GET' | 'POST',
  body?: unknown,
  timeoutMs = 15_000,
): Promise<unknown> {
  if (!cfg.baseUrl.trim()) throw new AIError('errNetwork', 'Base URL not set')
  const res = await window.skuoty.httpRequest({
    url: unslothUrl(cfg.baseUrl, path),
    method,
    headers: unslothHeaders(cfg.apiKey),
    body: body === undefined ? undefined : JSON.stringify(body),
    timeoutMs,
  })
  if (res.networkError) throw new AIError('errNetwork', res.networkError)
  let data: unknown = null
  try { data = res.body ? JSON.parse(res.body) : null } catch { /* non-JSON body */ }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new AIError('errUnauthorized', `Unsloth ${res.status}`)
    const d = data as { error?: { message?: string } | string; detail?: unknown } | null
    const msg = typeof d?.error === 'string' ? d.error
      : d?.error?.message
      ?? (typeof d?.detail === 'string' ? d.detail : d?.detail ? JSON.stringify(d.detail) : '')
    throw new AIError('errApi', msg || `Unsloth ${res.status}`)
  }
  return data
}

/** Lists models known to Unsloth Studio (GET /v1/models). Loaded models come first. */
export async function fetchUnslothModels(cfg: Pick<UnslothConfig, 'baseUrl' | 'apiKey'>): Promise<UnslothModel[]> {
  const data = await unslothRequest(cfg, '/models', 'GET') as { data?: { id?: string; loaded?: boolean; status?: string }[] } | null
  const models = (data?.data ?? [])
    .filter((m): m is { id: string; loaded?: boolean; status?: string } => typeof m?.id === 'string' && !!m.id)
    .map((m) => ({ id: m.id, loaded: m.loaded === true || m.status === 'loaded' }))
  return models.sort((a, b) => Number(b.loaded) - Number(a.loaded) || a.id.localeCompare(b.id))
}

async function callUnsloth(prompt: string, cfg: UnslothConfig): Promise<string> {
  if (!cfg.model.trim()) throw new AIError('errNoModel')
  const body: Record<string, unknown> = {
    model:      cfg.model.trim(),
    messages:   [{ role: 'user', content: prompt }],
    stream:     false,
    max_tokens: cfg.maxTokens,
    // Qwen3.5 & co. reason by default; reasoning tokens count against max_tokens.
    enable_thinking: cfg.thinking === true,
  }
  if (!cfg.serverSampling) {
    body.temperature = cfg.temperature
    body.top_p       = cfg.topP
  }
  const timeoutMs = Math.max(10, Number(cfg.timeoutSec) || 120) * 1000
  const data = await unslothRequest(cfg, '/chat/completions', 'POST', body, timeoutMs) as
    { choices?: { message?: { content?: string }; finish_reason?: string }[] } | null
  const choice = data?.choices?.[0]
  let text = choice?.message?.content ?? ''
  // Reasoning models may inline their chain of thought — keep only the final answer.
  // An unclosed <think> means the token budget ran out while still reasoning.
  text = text.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '').trim()
  if (!text) {
    if (choice?.finish_reason === 'length') throw new AIError('errTruncated')
    throw new AIError('errEmptyResponse')
  }
  return text
}

// ─── Provider implementations ─────────────────────────────────────────────────

async function callGemini(prompt: string, cfg: { apiKey: string; model: string; temperature: number; maxTokens: number }): Promise<string> {
  if (!cfg.apiKey) throw new AIError('errNoApiKey')
  const res = await wrapFetch(fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: cfg.temperature, maxOutputTokens: cfg.maxTokens },
      }),
    },
  ))
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new AIError('errApi', err?.error?.message ?? `Gemini ${res.status}`)
  }
  const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new AIError('errEmptyResponse')
  return text.trim()
}

async function callOllama(prompt: string, cfg: OllamaConfig): Promise<string> {
  const send = (withThink: boolean) => wrapFetch(fetch(`${cfg.baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: cfg.model,
      prompt,
      stream: false,
      // Thinking models (Qwen3, DeepSeek-R1, gpt-oss…) reason by default; `think` turns it on/off.
      ...(withThink ? { think: cfg.thinking === true } : {}),
      options: { temperature: cfg.temperature, top_p: cfg.topP, num_predict: cfg.maxTokens },
    }),
  }))

  let res = await send(true)
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    // Models without thinking support (or older Ollama versions) may reject `think`: retry without it.
    if (/think/i.test(err.error ?? '')) {
      res = await send(false)
      if (!res.ok) {
        const err2 = await res.json().catch(() => ({})) as { error?: string }
        throw new AIError('errApi', err2.error ?? `Ollama ${res.status}`)
      }
    } else {
      throw new AIError('errApi', err.error ?? `Ollama ${res.status}`)
    }
  }
  const data = await res.json() as { response?: string; done_reason?: string }
  // Older versions inline the reasoning in the response; an unclosed <think> means the budget ran out.
  const text = (data.response ?? '').replace(/<think>[\s\S]*?(<\/think>|$)/gi, '').trim()
  if (!text) {
    if (data.done_reason === 'length') throw new AIError('errTruncated')
    throw new AIError('errEmptyResponse')
  }
  return text
}

async function callOpenRouter(prompt: string, cfg: { apiKey: string; model: string; temperature: number; maxTokens: number }): Promise<string> {
  if (!cfg.apiKey) throw new AIError('errNoApiKey')
  const res = await wrapFetch(fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }], temperature: cfg.temperature, max_tokens: cfg.maxTokens }),
  }))
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new AIError('errApi', err?.error?.message ?? `OpenRouter ${res.status}`)
  }
  const data = await res.json() as { choices?: { message?: { content?: string } }[] }
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new AIError('errEmptyResponse')
  return text.trim()
}

async function callAnthropic(prompt: string, cfg: { apiKey: string; model: string; temperature: number; maxTokens: number }): Promise<string> {
  if (!cfg.apiKey) throw new AIError('errNoApiKey')
  const res = await wrapFetch(fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: cfg.maxTokens,
      temperature: cfg.temperature,
      messages: [{ role: 'user', content: prompt }],
    }),
  }))
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new AIError('errApi', err?.error?.message ?? `Anthropic ${res.status}`)
  }
  const data = await res.json() as { content?: { text?: string }[] }
  const text = data?.content?.[0]?.text
  if (!text) throw new AIError('errEmptyResponse')
  return text.trim()
}

async function callOpenAI(prompt: string, cfg: { apiKey: string; model: string; temperature: number; maxTokens: number }): Promise<string> {
  if (!cfg.apiKey) throw new AIError('errNoApiKey')
  const res = await wrapFetch(fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }], temperature: cfg.temperature, max_tokens: cfg.maxTokens }),
  }))
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new AIError('errApi', err?.error?.message ?? `OpenAI ${res.status}`)
  }
  const data = await res.json() as { choices?: { message?: { content?: string } }[] }
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new AIError('errEmptyResponse')
  return text.trim()
}
