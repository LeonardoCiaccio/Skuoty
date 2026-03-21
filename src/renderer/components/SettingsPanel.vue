<template>
  <div class="flex flex-1 min-h-0">

    <!-- ── Sidebar ── -->
    <nav class="w-24 bg-[#1e1e1e] border-r border-[#3a3a3a] flex flex-col py-2 shrink-0">
      <button
        v-for="s in sections"
        :key="s.id"
        @click="active = s.id"
        :class="[
          'relative px-3 py-2.5 text-left text-xs transition-colors',
          active === s.id ? 'text-white' : 'text-[#7a7a7a] hover:text-[#c0c0c0]',
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
        <h2 class="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider mb-3">{{ t('general') }}</h2>

        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[#7a7a7a]">{{ t('language') }}</label>
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
            <label class="text-xs text-[#7a7a7a]">{{ t('previewMaxChars') }}</label>
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
        <h2 class="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider mb-3">{{ t('aiProvider') }}</h2>

        <div class="flex flex-col gap-3">
          <div
            v-for="p in aiProviders"
            :key="p.id"
            :class="[
              'rounded-lg border p-3 transition-colors',
              settings.aiProvider === p.id ? 'border-[#6366f1]/60 bg-[#6366f1]/5' : 'border-[#3a3a3a]',
            ]"
          >
            <!-- Provider header: radio + name + test button -->
            <div class="flex items-center gap-2 mb-2">
              <input
                type="radio"
                :value="p.id"
                v-model="settings.aiProvider"
                class="accent-[#6366f1]"
              />
              <span class="text-xs font-medium text-[#e0e0e0] flex-1">{{ p.name }}</span>

              <!-- Test button -->
              <button
                @click="runTest(p.id)"
                :disabled="testState[p.id] === 'testing'"
                class="px-2 py-0.5 text-xs rounded bg-[#3d3d3d] hover:bg-[#4a4a4a] text-[#c0c0c0] disabled:opacity-50 transition-colors"
              >
                {{ testState[p.id] === 'testing' ? '…' : t('test') }}
              </button>
              <span v-if="testState[p.id] === 'ok'"    class="text-xs text-emerald-400">✓</span>
              <span v-if="testState[p.id] === 'error'" class="text-xs text-red-400">✗</span>
            </div>

            <!-- Test error message -->
            <p v-if="testState[p.id] === 'error' && testMsg[p.id]" class="text-xs text-red-400 mb-2">
              {{ testMsg[p.id] }}
            </p>

            <!-- Ollama fields -->
            <template v-if="p.id === 'ollama'">
              <div class="flex flex-col gap-2">
                <div class="flex flex-col gap-0.5">
                  <label class="text-xs text-[#6a6a6a]">{{ t('baseUrl') }}</label>
                  <input v-model="settings.providers.ollama.baseUrl" type="text" class="field" />
                </div>
                <div class="flex flex-col gap-0.5">
                  <label class="text-xs text-[#6a6a6a]">{{ t('model') }}</label>
                  <div class="flex gap-1.5">
                    <select
                      v-if="ollamaModels.length"
                      v-model="settings.providers.ollama.model"
                      class="field flex-1"
                    >
                      <option v-for="m in ollamaModels" :key="m" :value="m">{{ m }}</option>
                    </select>
                    <input
                      v-else
                      v-model="settings.providers.ollama.model"
                      type="text"
                      class="field flex-1"
                    />
                    <button
                      @click="refreshOllamaModels"
                      :disabled="ollamaFetching"
                      class="px-2 py-0.5 text-xs rounded bg-[#3d3d3d] hover:bg-[#4a4a4a] text-[#c0c0c0] disabled:opacity-50 transition-colors shrink-0"
                      :title="t('refreshModels')"
                    >
                      {{ ollamaFetching ? '…' : '↺' }}
                    </button>
                  </div>
                  <p v-if="ollamaFetchError" class="text-xs text-red-400">{{ ollamaFetchError }}</p>
                </div>
              </div>
            </template>

            <!-- All other providers: apiKey + model -->
            <template v-else>
              <div class="flex flex-col gap-2">
                <div class="flex flex-col gap-0.5">
                  <label class="text-xs text-[#6a6a6a]">{{ t('apiKey') }}</label>
                  <input v-model="settings.providers[p.id].apiKey" type="password" class="field" />
                </div>
                <div class="flex flex-col gap-0.5">
                  <label class="text-xs text-[#6a6a6a]">{{ t('model') }}</label>
                  <input v-model="settings.providers[p.id].model" type="text" class="field" />
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- ══ PLUGINS ══ -->
      <template v-if="active === 'plugins'">
        <h2 class="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider mb-3">{{ t('plugins') }}</h2>

        <!-- Plugin list -->
        <div class="flex flex-col gap-2 mb-4">
          <div
            v-for="(plugin, idx) in settings.plugins"
            :key="plugin.name"
            class="flex items-center gap-2 bg-[#222] border border-[#3a3a3a] rounded-lg px-3 py-2"
          >
            <!-- Enable toggle -->
            <button
              @click="plugin.enabled = !plugin.enabled"
              :class="[
                'w-7 h-4 rounded-full transition-colors shrink-0',
                plugin.enabled ? 'bg-[#6366f1]' : 'bg-[#4a4a4a]',
              ]"
            >
              <span :class="['block w-3 h-3 rounded-full bg-white transition-transform mx-0.5', plugin.enabled ? 'translate-x-3' : 'translate-x-0']" />
            </button>

            <span class="text-xs text-[#e0e0e0] flex-1 truncate">
              {{ getLabel(plugin.label, settings.language) }}
            </span>

            <button
              @click="openEditor(idx)"
              class="text-xs text-[#7a7a7a] hover:text-[#c0c0c0] transition-colors px-1"
              :title="t('edit')"
            >✎</button>
            <button
              @click="deletePlugin(idx)"
              class="text-xs text-[#7a7a7a] hover:text-red-400 transition-colors px-1"
              :title="t('delete')"
            >✕</button>
          </div>

          <p v-if="!settings.plugins.length" class="text-xs text-[#5a5a5a] italic">
            {{ t('noPluginsList') }}
          </p>
        </div>

        <!-- Load new plugin -->
        <div class="border-t border-[#3a3a3a] pt-3">
          <p class="text-xs text-[#7a7a7a] mb-2">{{ t('loadPlugin') }}</p>
          <textarea
            v-model="loadJson"
            rows="5"
            placeholder='{&#10;  "name": "my-plugin",&#10;  "label": [{"en":"My Plugin"}],&#10;  "options": "...",&#10;  "prompt": "{{option}} {{context}}"&#10;}'
            class="field w-full resize-none font-mono text-xs"
          />
          <p v-if="loadError" class="text-xs text-red-400 mt-1">{{ loadError }}</p>
          <button @click="loadPlugin" class="mt-2 btn-primary text-xs px-3 py-1.5">
            {{ t('load') }}
          </button>
        </div>
      </template>

      <!-- ══ BACKUP ══ -->
      <template v-if="active === 'backup'">
        <h2 class="text-xs font-semibold text-[#8a8a8a] uppercase tracking-wider mb-3">Backup</h2>

        <div class="flex flex-col gap-4">
          <!-- Export -->
          <div>
            <p class="text-xs text-[#7a7a7a] mb-2">{{ t('exportDesc') }}</p>
            <button @click="doExport" class="btn-primary text-xs px-3 py-1.5">{{ t('export') }}</button>
            <p v-if="exportDone" class="text-xs text-emerald-400 mt-1">{{ t('copiedToClipboard') }}</p>
          </div>

          <!-- Import -->
          <div class="border-t border-[#3a3a3a] pt-3">
            <p class="text-xs text-[#7a7a7a] mb-2">{{ t('importDesc') }}</p>
            <textarea
              v-model="importJson"
              rows="6"
              :placeholder="t('pasteJson')"
              class="field w-full resize-none font-mono text-xs"
            />
            <p v-if="importError" class="text-xs text-red-400 mt-1">{{ importError }}</p>
            <button @click="doImport" class="mt-2 btn-primary text-xs px-3 py-1.5">{{ t('import') }}</button>
          </div>
        </div>
      </template>

    </div>
  </div>

  <!-- ── Plugin JSON editor modal ── -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="editorIdx !== null"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        @click.self="closeEditor"
      >
        <div class="bg-[#2a2a2a] border border-[#4a4a4a] rounded-xl p-5 w-[480px] shadow-2xl flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-[#f0f0f0]">{{ t('editPlugin') }}</span>
            <button @click="closeEditor" class="text-[#6b6b6b] hover:text-[#f0f0f0] transition-colors">✕</button>
          </div>
          <textarea
            v-model="editorJson"
            rows="14"
            class="field w-full resize-none font-mono text-xs"
          />
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
import { ref } from 'vue'
import { useSettings } from '../composables/useSettings'
import { useI18n } from '../composables/useI18n'
import { testProvider, fetchOllamaModels } from '../composables/useAI'
import { getLabel } from '../../shared/types'
import type { AIProvider, SkuotyPlugin } from '../../shared/types'

defineEmits<{ close: [] }>()

const { settings, exportSettings, importSettings } = useSettings()
const { t } = useI18n()

// ── Sidebar sections ───────────────────────────────────────────────────────────
const sections = [
  { id: 'general', label: { en: 'General',  it: 'Generale' } },
  { id: 'ai',      label: { en: 'AI',       it: 'AI'       } },
  { id: 'plugins', label: { en: 'Plugins',  it: 'Plugin'   } },
  { id: 'backup',  label: { en: 'Backup',   it: 'Backup'   } },
]
const active = ref('general')

// ── AI providers list ─────────────────────────────────────────────────────────
const aiProviders = [
  { id: 'gemini',     name: 'Gemini'     },
  { id: 'ollama',     name: 'Ollama'     },
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

async function runTest(provider: AIProvider) {
  testState.value[provider] = 'testing'
  testMsg.value[provider] = ''
  try {
    await testProvider(provider, settings.value)
    testState.value[provider] = 'ok'
  } catch (e) {
    testState.value[provider] = 'error'
    testMsg.value[provider] = e instanceof Error ? e.message : 'Error'
  }
}

// ── Ollama model refresh ──────────────────────────────────────────────────────
const ollamaModels = ref<string[]>([])
const ollamaFetching = ref(false)
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
    ollamaFetchError.value = e instanceof Error ? e.message : 'Failed'
  } finally {
    ollamaFetching.value = false
  }
}

// ── Plugin editor ─────────────────────────────────────────────────────────────
const editorIdx  = ref<number | null>(null)
const editorJson = ref('')
const editorError = ref('')

function openEditor(idx: number) {
  editorIdx.value = idx
  const { enabled: _enabled, ...rest } = settings.value.plugins[idx]
  editorJson.value = JSON.stringify(rest, null, 2)
  editorError.value = ''
}

function closeEditor() {
  editorIdx.value = null
  editorError.value = ''
}

function saveEditor() {
  const validated = validatePlugin(editorJson.value)
  if (!validated) { editorError.value = 'Invalid plugin JSON.'; return }
  const enabled = settings.value.plugins[editorIdx.value!].enabled
  settings.value.plugins[editorIdx.value!] = { ...validated, enabled }
  closeEditor()
}

// ── Plugin delete ─────────────────────────────────────────────────────────────
function deletePlugin(idx: number) {
  settings.value.plugins.splice(idx, 1)
}

// ── Load new plugin ───────────────────────────────────────────────────────────
const loadJson  = ref('')
const loadError = ref('')

function loadPlugin() {
  loadError.value = ''
  const validated = validatePlugin(loadJson.value)
  if (!validated) { loadError.value = 'Invalid plugin. Required: name (string), label (array with "en" entry), options (string or array), prompt (string).'; return }
  const exists = settings.value.plugins.findIndex((p) => p.name === validated.name)
  if (exists >= 0) {
    settings.value.plugins[exists] = validated
  } else {
    settings.value.plugins.push(validated)
  }
  loadJson.value = ''
}

// ── Backup ────────────────────────────────────────────────────────────────────
const importJson  = ref('')
const importError = ref('')
const exportDone  = ref(false)

function doExport() {
  navigator.clipboard.writeText(exportSettings()).then(() => {
    exportDone.value = true
    setTimeout(() => { exportDone.value = false }, 2000)
  })
}

function doImport() {
  importError.value = ''
  const err = importSettings(importJson.value)
  if (err) { importError.value = err; return }
  importJson.value = ''
}

// ── Plugin validation ─────────────────────────────────────────────────────────
function validatePlugin(raw: string): SkuotyPlugin | null {
  try {
    const p = JSON.parse(raw) as Record<string, unknown>
    if (typeof p.name !== 'string' || !p.name) return null
    if (!Array.isArray(p.label)) return null
    if (!p.label.some((l: unknown) => typeof l === 'object' && l !== null && typeof (l as Record<string, string>)['en'] === 'string')) return null
    if (typeof p.options !== 'string' && !Array.isArray(p.options)) return null
    if (typeof p.prompt !== 'string' || !p.prompt) return null
    return {
      name:    p.name,
      label:   p.label as SkuotyPlugin['label'],
      options: p.options as SkuotyPlugin['options'],
      prompt:  p.prompt,
      enabled: p.enabled !== false,
    }
  } catch {
    return null
  }
}
</script>

<style scoped>
.field {
  @apply bg-[#222] border border-[#3a3a3a] rounded-lg px-2.5 py-1.5 text-xs text-[#f0f0f0]
         focus:outline-none focus:border-[#6366f1] transition-colors;
}
.btn-primary {
  @apply bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-lg transition-colors font-medium;
}
.btn-secondary {
  @apply bg-[#3d3d3d] hover:bg-[#4a4a4a] text-[#c0c0c0] rounded-lg transition-colors;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }
</style>
