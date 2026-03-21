<template>
  <div class="flex flex-1 min-h-0">

    <!-- ── Sidebar ── -->
    <nav class="w-28 bg-[var(--bg-deep)] border-r border-[var(--border)] flex flex-col py-3 shrink-0">
      <button
        v-for="s in sections"
        :key="s.id"
        @click="active = s.id"
        :class="[
          'relative px-5 py-3.5 text-left text-xs transition-colors',
          active === s.id ? 'text-[#6366f1] font-medium' : 'text-[var(--text-muted)] hover:text-[var(--text-second)]',
        ]"
      >
        <span v-if="active === s.id" class="absolute left-0 top-0 bottom-0 w-0.5 bg-[#6366f1] rounded-r" />
        {{ s.label[settings.language] ?? s.label['en'] }}
      </button>
    </nav>

    <!-- ── Content ── -->
    <div class="flex-1 overflow-y-auto p-4">

      <!-- ══ GENERAL ══ -->
      <template v-if="active === 'general'">
        <h2 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{{ t('general') }}</h2>

        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[var(--text-muted)]">{{ t('language') }}</label>
            <select v-model="settings.language" class="field w-40">
              <option value="en">English</option>
              <option value="it">Italiano</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="pt">Português</option>
              <option value="ja">日本語</option>
              <option value="zh">中文</option>
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs text-[var(--text-muted)]">{{ t('theme') }}</label>
            <div class="flex gap-2">
              <button
                @click="settings.theme = 'dark'"
                :class="['px-3 py-1.5 text-xs rounded-lg border transition-colors', settings.theme === 'dark' ? 'border-[#6366f1] bg-[#6366f1]/10 text-white' : 'border-[var(--border)] text-[var(--text-second)] hover:border-[var(--text-muted)]']"
              >🌙 {{ t('themeDark') }}</button>
              <button
                @click="settings.theme = 'light'"
                :class="['px-3 py-1.5 text-xs rounded-lg border transition-colors', settings.theme === 'light' ? 'border-[#6366f1] bg-[#6366f1]/10 text-[#6366f1]' : 'border-[var(--border)] text-[var(--text-second)] hover:border-[var(--text-muted)]']"
              >☀️ {{ t('themeLight') }}</button>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs text-[var(--text-muted)]">{{ t('previewMaxChars') }}</label>
            <input
              v-model.number="settings.previewMaxChars"
              type="number" min="50" max="2000" step="50"
              class="field w-28"
            />
          </div>
        </div>
      </template>

      <!-- ══ AI ══ -->
      <template v-if="active === 'ai'">
        <h2 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{{ t('aiProvider') }}</h2>

        <div class="flex flex-col gap-3">
          <div
            v-for="p in aiProviders"
            :key="p.id"
            :class="[
              'rounded-lg border p-3 transition-colors',
              settings.aiProvider === p.id ? 'border-[#6366f1]/60 bg-[#6366f1]/5' : 'border-[var(--border)]',
            ]"
          >
            <!-- Provider header -->
            <div class="flex items-center gap-2 mb-2">
              <input type="radio" :value="p.id" v-model="settings.aiProvider" class="accent-[#6366f1]" />
              <span class="text-xs font-medium text-[var(--text-primary)] flex-1">{{ p.name }}</span>

              <!-- Reset button -->
              <button
                @click="resetProvider(p.id)"
                :disabled="settings.aiProvider !== p.id"
                class="px-2 py-0.5 text-xs rounded bg-[var(--bg-element)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-muted)] hover:text-red-400 transition-colors"
                :title="t('reset')"
              >↺</button>

              <!-- Test button — disabled when provider not selected -->
              <button
                @click="runTest(p.id)"
                :disabled="settings.aiProvider !== p.id || testState[p.id] === 'testing'"
                :class="[
                  'px-2 py-0.5 text-xs rounded bg-[var(--bg-element)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium',
                  testState[p.id] === 'ok'    ? 'text-emerald-600' :
                  testState[p.id] === 'error' ? 'text-red-400'     : 'text-[var(--text-second)]',
                ]"
              >
                {{ testState[p.id] === 'testing' ? '…' : t('test') }}
              </button>
            </div>

            <!-- Test error message -->
            <p v-if="testState[p.id] === 'error' && testMsg[p.id]" class="text-xs text-red-400 mb-2">
              {{ testMsg[p.id] }}
            </p>

            <!-- Ollama fields -->
            <template v-if="p.id === 'ollama'">
              <div class="flex flex-col gap-2" :class="settings.aiProvider !== p.id ? 'opacity-40 pointer-events-none' : ''">
                <div class="flex flex-col gap-0.5">
                  <label class="text-xs text-[var(--text-muted)]">{{ t('baseUrl') }}</label>
                  <input v-model="settings.providers.ollama.baseUrl" type="text" class="field" :disabled="settings.aiProvider !== p.id" />
                </div>
                <div class="flex flex-col gap-0.5">
                  <label class="text-xs text-[var(--text-muted)]">{{ t('model') }}</label>
                  <div class="flex gap-1.5">
                    <select v-if="ollamaModels.length" v-model="settings.providers.ollama.model" class="field flex-1" :disabled="settings.aiProvider !== p.id">
                      <option v-for="m in ollamaModels" :key="m" :value="m">{{ m }}</option>
                    </select>
                    <input v-else v-model="settings.providers.ollama.model" type="text" class="field flex-1" :disabled="settings.aiProvider !== p.id" />
                    <button
                      @click="refreshOllamaModels"
                      :disabled="settings.aiProvider !== p.id || ollamaFetching"
                      class="px-2 py-0.5 text-xs rounded bg-[var(--bg-element)] hover:bg-[var(--bg-hover)] text-[var(--text-second)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                      :title="t('refreshModels')"
                    >{{ ollamaFetching ? '…' : '↺' }}</button>
                  </div>
                  <p v-if="ollamaFetchError" class="text-xs text-red-400">{{ ollamaFetchError }}</p>
                </div>
              </div>
            </template>

            <!-- Other providers -->
            <template v-else>
              <div class="flex flex-col gap-2" :class="settings.aiProvider !== p.id ? 'opacity-40 pointer-events-none' : ''">
                <div class="flex flex-col gap-0.5">
                  <label class="text-xs text-[var(--text-muted)]">{{ t('apiKey') }}</label>
                  <input v-model="settings.providers[p.id].apiKey" type="password" class="field" :disabled="settings.aiProvider !== p.id" />
                </div>
                <div class="flex flex-col gap-0.5">
                  <label class="text-xs text-[var(--text-muted)]">{{ t('model') }}</label>
                  <input v-model="settings.providers[p.id].model" type="text" class="field" :disabled="settings.aiProvider !== p.id" />
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- ══ PLUGINS ══ -->
      <template v-if="active === 'plugins'">
        <h2 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{{ t('plugins') }}</h2>

        <!-- Load new plugin (first) -->
        <div class="mb-4">
          <p class="text-xs text-[var(--text-muted)] mb-2">{{ t('loadPlugin') }}</p>
          <textarea
            v-model="loadJson"
            rows="5"
            placeholder='{&#10;  "name": "my-plugin",&#10;  "label": [{"en":"My Plugin"}],&#10;  "options": "...",&#10;  "prompt": "{{option}} {{context}}"&#10;}'
            class="field w-full resize-none font-mono text-xs"
          />
          <p v-if="loadError" class="text-xs text-red-400 mt-1">{{ loadError }}</p>
          <button @click="loadPlugin" class="mt-2 btn-primary text-xs px-3 py-1.5">{{ t('load') }}</button>
        </div>

        <!-- Installed plugins (after) -->
        <div class="border-t border-[var(--border)] pt-3 flex flex-col gap-2">
          <div
            v-for="(plugin, idx) in settings.plugins"
            :key="plugin.name"
            class="flex items-center gap-2 bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg px-3 py-2"
          >
            <button
              @click="plugin.enabled = !plugin.enabled"
              :class="['w-7 h-4 rounded-full transition-colors shrink-0', plugin.enabled ? 'bg-[#6366f1]' : 'bg-[var(--bg-hover)]']"
            >
              <span :class="['block w-3 h-3 rounded-full bg-white transition-transform mx-0.5', plugin.enabled ? 'translate-x-3' : 'translate-x-0']" />
            </button>

            <span class="text-xs text-[var(--text-primary)] flex-1 truncate">
              {{ getLabel(plugin.label, settings.language) }}
            </span>

            <button @click="openEditor(idx)" class="text-xs text-[var(--text-muted)] hover:text-[var(--text-second)] transition-colors px-1" :title="t('edit')">✎</button>
            <button @click="deletePlugin(idx)" class="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors px-1" :title="t('delete')">✕</button>
          </div>

          <p v-if="!settings.plugins.length" class="text-xs text-[var(--text-faint)] italic">
            {{ t('noPluginsList') }}
          </p>
        </div>
      </template>

      <!-- ══ SHORTCUTS ══ -->
      <template v-if="active === 'shortcuts'">
        <h2 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{{ t('shortcuts') }}</h2>

        <div class="flex flex-col gap-4">
          <!-- Capture key -->
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[var(--text-muted)]">{{ t('captureKey') }}</label>
            <button
              @click="startRecording('capture')"
              :class="['field text-left w-full', recording === 'capture' ? 'border-[#6366f1] text-[var(--text-muted)] animate-pulse' : '']"
            >
              {{ recording === 'capture' ? t('pressKeys') : displayAccel(settings.hotkeys.capture) }}
            </button>
          </div>

          <!-- Show window key -->
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[var(--text-muted)]">{{ t('showWindowKey') }}</label>
            <button
              @click="startRecording('showWindow')"
              :class="['field text-left w-full', recording === 'showWindow' ? 'border-[#6366f1] text-[var(--text-muted)] animate-pulse' : '']"
            >
              {{ recording === 'showWindow' ? t('pressKeys') : (displayAccel(settings.hotkeys.showWindow) || '—') }}
            </button>
            <p class="text-xs text-[var(--text-faint)]">{{ t('escToClear') }}</p>
          </div>

          <div class="flex items-center gap-2 mt-2">
            <button
              v-if="hotkeyDirty"
              @click="applyHotkeys"
              class="btn-primary text-xs px-3 py-1.5"
            >{{ t('save') }}</button>
            <span v-if="hotkeySaved" class="text-xs text-emerald-500">✓ {{ t('applied') }}</span>
          </div>
        </div>
      </template>

      <!-- ══ BACKUP ══ -->
      <template v-if="active === 'backup'">
        <h2 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Backup</h2>

        <div class="flex flex-col gap-4">
          <div>
            <p class="text-xs text-[var(--text-muted)] mb-2">{{ t('exportDesc') }}</p>
            <button @click="doExport" :disabled="exporting" class="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">{{ t('export') }}</button>
            <p v-if="exportDone" class="text-xs text-emerald-500 mt-1">{{ t('exportedToFile') }}</p>
          </div>

          <div class="border-t border-[var(--border)] pt-3">
            <p class="text-xs text-[var(--text-muted)] mb-2">{{ t('importDesc') }}</p>
            <p v-if="importError" class="text-xs text-red-400 mb-1">{{ importError }}</p>
            <button @click="doImport" :disabled="importing" class="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">{{ t('import') }}</button>
          </div>
        </div>
      </template>

    </div>
  </div>

  <!-- Plugin JSON editor modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="editorIdx !== null"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        @click.self="closeEditor"
      >
        <div class="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 w-[480px] shadow-2xl flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-[var(--text-primary)]">{{ t('editPlugin') }}</span>
            <button @click="closeEditor" class="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">✕</button>
          </div>
          <textarea v-model="editorJson" rows="14" class="field w-full resize-none font-mono text-xs" />
          <p v-if="editorError" class="text-xs text-red-400">{{ editorError }}</p>
          <div class="flex justify-end gap-2">
            <button @click="closeEditor" class="btn-secondary text-xs px-3 py-1.5">{{ t('cancel') }}</button>
            <button @click="saveEditor"  class="btn-primary  text-xs px-3 py-1.5">{{ t('save') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useSettings } from '../composables/useSettings'
import { useI18n } from '../composables/useI18n'
import { testProvider, fetchOllamaModels, AIError } from '../composables/useAI'
import { getLabel, DEFAULT_SETTINGS } from '../../shared/types'
import type { AIProvider, SkuotyPlugin } from '../../shared/types'

defineEmits<{ close: [] }>()

const { settings, exportSettings, importSettings } = useSettings()
const { t } = useI18n()

const sections = [
  { id: 'general',   label: { en: 'General',   it: 'Generale',   es: 'General',   fr: 'Général',    de: 'Allgemein'  } },
  { id: 'ai',        label: { en: 'AI',         it: 'AI',         es: 'IA',         fr: 'IA',         de: 'KI'         } },
  { id: 'plugins',   label: { en: 'Plugins',    it: 'Plugin',     es: 'Plugins',    fr: 'Plugins',    de: 'Plugins'    } },
  { id: 'shortcuts', label: { en: 'Shortcuts',  it: 'Scorciatoie', es: 'Atajos',   fr: 'Raccourcis',  de: 'Tastenkürzel' } },
  { id: 'backup',    label: { en: 'Backup',     it: 'Backup',     es: 'Copia',      fr: 'Sauvegarde', de: 'Sicherung'  } },
]
const active = ref('general')

const aiProviders = [
  { id: 'ollama',     name: 'Ollama'     },
  { id: 'gemini',     name: 'Gemini'     },
  { id: 'openrouter', name: 'OpenRouter' },
  { id: 'anthropic',  name: 'Anthropic'  },
  { id: 'openai',     name: 'OpenAI'     },
] as const

// ── AI test ───────────────────────────────────────────────────────────────────
const testState = ref<Record<string, 'idle' | 'testing' | 'ok' | 'error'>>({
  gemini: 'idle', ollama: 'idle', openrouter: 'idle', anthropic: 'idle', openai: 'idle',
})
const testMsg = ref<Record<string, string>>({
  gemini: '', ollama: '', openrouter: '', anthropic: '', openai: '',
})

function resetProvider(provider: AIProvider) {
  const def = DEFAULT_SETTINGS.providers[provider]
  settings.value.providers[provider] = { ...def }
  testState.value[provider] = 'idle'
  testMsg.value[provider] = ''
}

async function runTest(provider: AIProvider) {
  testState.value[provider] = 'testing'
  testMsg.value[provider] = ''
  try {
    await testProvider(provider, settings.value)
    testState.value[provider] = 'ok'
  } catch (e) {
    testState.value[provider] = 'error'
    if (e instanceof AIError) {
      testMsg.value[provider] = t.value(e.code) + (e.message && e.message !== e.code ? ` (${e.message})` : '')
    } else {
      testMsg.value[provider] = e instanceof Error ? e.message : t.value('errApi')
    }
  }
}

// ── Ollama model refresh ──────────────────────────────────────────────────────
const ollamaModels    = ref<string[]>([])
const ollamaFetching  = ref(false)
const ollamaFetchError = ref('')

async function refreshOllamaModels() {
  ollamaFetching.value = true
  ollamaFetchError.value = ''
  try {
    const models = await fetchOllamaModels(settings.value.providers.ollama.baseUrl)
    ollamaModels.value = models
    if (models.length && !models.includes(settings.value.providers.ollama.model)) {
      settings.value.providers.ollama.model = models[0]
    }
  } catch (e) {
    ollamaFetchError.value = e instanceof AIError
      ? t.value(e.code)
      : e instanceof Error ? e.message : t.value('errNetwork')
  } finally {
    ollamaFetching.value = false
  }
}

// ── Plugin editor ─────────────────────────────────────────────────────────────
const editorIdx   = ref<number | null>(null)
const editorJson  = ref('')
const editorError = ref('')

function openEditor(idx: number) {
  editorIdx.value = idx
  const { enabled: _enabled, ...rest } = settings.value.plugins[idx]
  editorJson.value = JSON.stringify(rest, null, 2)
  editorError.value = ''
}
function closeEditor() { editorIdx.value = null; editorError.value = '' }
function saveEditor() {
  const v = validatePlugin(editorJson.value)
  if (!v) { editorError.value = 'Invalid plugin JSON.'; return }
  const enabled = settings.value.plugins[editorIdx.value!].enabled
  settings.value.plugins[editorIdx.value!] = { ...v, enabled }
  closeEditor()
}

// ── Plugin delete ─────────────────────────────────────────────────────────────
function deletePlugin(idx: number) { settings.value.plugins.splice(idx, 1) }

// ── Load new plugin ───────────────────────────────────────────────────────────
const loadJson  = ref('')
const loadError = ref('')

function loadPlugin() {
  loadError.value = ''
  const v = validatePlugin(loadJson.value)
  if (!v) { loadError.value = 'Invalid plugin. Required: name, label (array with "en" entry), options (string or array), prompt.'; return }
  const idx = settings.value.plugins.findIndex((p) => p.name === v.name)
  if (idx >= 0) settings.value.plugins[idx] = v
  else settings.value.plugins.push(v)
  loadJson.value = ''
}

// ── Backup ────────────────────────────────────────────────────────────────────
const importError = ref('')
const exportDone  = ref(false)
const exporting   = ref(false)
const importing   = ref(false)

async function doExport() {
  exporting.value = true
  exportDone.value = false
  const saved = await window.skuoty.exportToFile(exportSettings())
  exporting.value = false
  if (saved) {
    exportDone.value = true
    setTimeout(() => { exportDone.value = false }, 3000)
  }
}

async function doImport() {
  importing.value = true
  importError.value = ''
  const json = await window.skuoty.importFromFile()
  importing.value = false
  if (!json) return
  const err = importSettings(json)
  if (err) importError.value = err
}

// ── Hotkey recorder ───────────────────────────────────────────────────────────
const recording = ref<'capture' | 'showWindow' | null>(null)

function displayAccel(raw: string): string {
  if (!raw) return ''
  if (raw.startsWith('2x:')) { const k = raw.slice(3); return `${k} + ${k}` }
  return raw
}

function startRecording(field: 'capture' | 'showWindow') {
  recording.value = field
  window.addEventListener('keydown', onKeyDown, { capture: true })
}

const KEY_NAMES: Record<string, string> = {
  ' ': 'Space', 'ArrowUp': 'Up', 'ArrowDown': 'Down',
  'ArrowLeft': 'Left', 'ArrowRight': 'Right',
  'Enter': 'Return', 'Delete': 'Delete', 'Backspace': 'Backspace',
  'Tab': 'Tab', 'Insert': 'Insert', 'Home': 'Home', 'End': 'End',
  'PageUp': 'PageUp', 'PageDown': 'PageDown',
}

let firstPress = ''
let firstPressTimer = 0

function buildAccelerator(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey)  parts.push('Ctrl')
  if (e.altKey)   parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  const key = KEY_NAMES[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key)
  parts.push(key)
  return parts.join('+')
}

function commitAccelerator(accelerator: string) {
  if (recording.value) {
    settings.value.hotkeys[recording.value] = accelerator
    hotkeyDirty.value = true
  }
  firstPress = ''
  stopRecording()
}

function onKeyDown(e: KeyboardEvent) {
  e.preventDefault()
  e.stopPropagation()

  if (e.key === 'Escape') {
    clearTimeout(firstPressTimer)
    firstPress = ''
    if (recording.value === 'showWindow') settings.value.hotkeys.showWindow = ''
    stopRecording()
    return
  }

  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return

  const accelerator = buildAccelerator(e)

  if (!firstPress) {
    // First press — wait to see if user presses same combo again
    firstPress = accelerator
    firstPressTimer = window.setTimeout(() => {
      // No second press within 600ms → single press
      commitAccelerator(firstPress)
    }, 600)
  } else if (accelerator === firstPress) {
    // Second press of same combo → double press
    clearTimeout(firstPressTimer)
    commitAccelerator('2x:' + accelerator)
  } else {
    // Different combo on second press → use first press as single
    clearTimeout(firstPressTimer)
    commitAccelerator(firstPress)
  }
}

function stopRecording() {
  recording.value = null
  window.removeEventListener('keydown', onKeyDown, { capture: true })
}

const hotkeySaved  = ref(false)
const hotkeyDirty  = ref(false)

function applyHotkeys() {
  window.skuoty.setHotkeys(settings.value.hotkeys)
  hotkeyDirty.value = false
  hotkeySaved.value = true
  setTimeout(() => { hotkeySaved.value = false }, 2000)
}

onUnmounted(() => stopRecording())

// ── Plugin validation ─────────────────────────────────────────────────────────
function validatePlugin(raw: string): SkuotyPlugin | null {
  try {
    const p = JSON.parse(raw) as Record<string, unknown>
    if (typeof p.name !== 'string' || !p.name) return null
    if (!Array.isArray(p.label)) return null
    if (!p.label.some((l: unknown) => typeof l === 'object' && l !== null && typeof (l as Record<string, string>)['en'] === 'string')) return null
    if (typeof p.options !== 'string' && !Array.isArray(p.options)) return null
    if (typeof p.prompt !== 'string' || !p.prompt) return null
    return { name: p.name, label: p.label as SkuotyPlugin['label'], options: p.options as SkuotyPlugin['options'], prompt: p.prompt, enabled: p.enabled !== false }
  } catch { return null }
}
</script>

<style scoped>
.field {
  @apply bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)]
         focus:outline-none focus:border-[#6366f1] transition-colors;
}
.btn-primary   { @apply bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-lg transition-colors font-medium; }
.btn-secondary { @apply bg-[var(--bg-element)] hover:bg-[var(--bg-hover)] text-[var(--text-second)] rounded-lg transition-colors; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }
</style>
