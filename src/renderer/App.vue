<template>
  <div class="flex flex-col h-screen bg-[var(--bg-base)] text-[var(--text-primary)] select-none overflow-hidden rounded-lg border border-[var(--border)]">

    <!-- Title bar (draggable) -->
    <div class="flex items-center justify-between px-3 py-2 bg-[var(--bg-deep)] border-b border-[var(--border)]" style="-webkit-app-region: drag">
      <span class="text-xs font-semibold tracking-widest text-[var(--text-muted)] uppercase">Skuoty <span class="font-normal opacity-50">v{{ appVersion }}</span></span>
      <div class="flex gap-1" style="-webkit-app-region: no-drag">
        <button
          @click="showSettings = !showSettings"
          class="p-1 rounded hover:bg-[var(--bg-element)] text-[var(--text-second)] hover:text-[var(--text-primary)] transition-colors"
          title="Settings"
        >
          <ChevronRightIcon v-if="showSettings" class="w-4 h-4" />
          <Cog6ToothIcon v-else class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Settings panel -->
    <SettingsPanel v-if="showSettings" @close="showSettings = false" />

    <!-- Main content -->
    <template v-else>
      <TextPreview :text="selectionText" :max-chars="settings.previewMaxChars" />

      <!-- AI provider quick-switch (custom dropdown) -->
      <div data-ai-bar class="relative inline-flex border border-[var(--border)] rounded-lg bg-[var(--bg-deep)] px-3 py-2 mx-3 my-1.5">
        <!-- Trigger -->
        <button
          @click="aiDropdownOpen = !aiDropdownOpen"
          class="inline-flex items-center gap-2 max-w-[260px]"
        >
          <span class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider shrink-0">AI</span>
          <span class="text-xs text-[var(--text-second)] truncate">{{ currentAiLabel }}</span>
          <span class="text-[var(--text-faint)] text-xs shrink-0 transition-transform" :class="aiDropdownOpen ? 'rotate-180' : ''">▾</span>
        </button>

        <!-- Dropdown panel -->
        <Teleport to="body">
          <div v-if="aiDropdownOpen" class="fixed inset-0 z-40" @click="aiDropdownOpen = false" />
          <Transition name="ai-drop">
            <div
              v-if="aiDropdownOpen"
              class="fixed z-50 bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg shadow-2xl overflow-hidden"
              :style="aiDropdownStyle"
            >
              <button
                v-for="p in aiProviderOptions"
                :key="p.id"
                @click="settings.aiProvider = p.id; aiDropdownOpen = false"
                class="w-full flex flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
                :class="settings.aiProvider === p.id ? 'bg-[#6366f1]/10' : ''"
              >
                <span class="text-xs font-medium" :class="settings.aiProvider === p.id ? 'text-[#6366f1]' : 'text-[var(--text-primary)]'">{{ p.name }}</span>
                <span class="text-xs text-[var(--text-muted)] font-mono">{{ p.model }}</span>
              </button>
            </div>
          </Transition>
        </Teleport>
      </div>

      <ElaboratedText v-model="elaboratedText" :has-target="hasTarget" @paste-back="pasteBack" @copy-done="copyDone" @reset="resetSession" />
      <PluginPanel
        :selection-text="selectionText"
        :elaborated-text="elaboratedText"
        @result="elaboratedText = $event"
      />
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Cog6ToothIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import TextPreview    from './components/TextPreview.vue'
import ElaboratedText from './components/ElaboratedText.vue'
import PluginPanel    from './components/PluginPanel.vue'
import SettingsPanel  from './components/SettingsPanel.vue'
import { useSettings } from './composables/useSettings'

const { settings, init } = useSettings()

const appVersion = __APP_VERSION__

const aiProviderOptions = computed(() => [
  { id: 'ollama',     name: 'Ollama',      model: settings.value.providers.ollama.model     },
  { id: 'gemini',     name: 'Gemini',      model: settings.value.providers.gemini.model     },
  { id: 'openrouter', name: 'OpenRouter',  model: settings.value.providers.openrouter.model },
  { id: 'anthropic',  name: 'Anthropic',   model: settings.value.providers.anthropic.model  },
  { id: 'openai',     name: 'OpenAI',      model: settings.value.providers.openai.model     },
])

const currentAiLabel = computed(() => {
  const p = aiProviderOptions.value.find(p => p.id === settings.value.aiProvider)
  return p ? `${p.name} · ${p.model}` : settings.value.aiProvider
})

const aiDropdownOpen  = ref(false)
const aiDropdownStyle = ref<Record<string, string>>({})

watch(aiDropdownOpen, (open) => {
  if (!open) return
  const bar = document.querySelector('[data-ai-bar]') as HTMLElement | null
  if (!bar) return
  const rect = bar.getBoundingClientRect()
  aiDropdownStyle.value = {
    top:       `${rect.bottom}px`,
    left:      `${rect.left}px`,
    width:     '240px',
    maxHeight: `${window.innerHeight - rect.bottom - 8}px`,
    overflowY: 'auto',
  }
})

// Apply theme to <html> so CSS variables are available everywhere (incl. teleported modals)
watch(() => settings.value.theme, (t) => {
  document.documentElement.dataset.theme = t
}, { immediate: true })

// Keep tray menu labels in sync with language
watch(() => settings.value.language, (lang) => {
  window.skuoty.setLanguage(lang)
})

const selectionText  = ref('')
const elaboratedText = ref('')
const showSettings   = ref(false)
const hasTarget      = ref(false)

onMounted(() => {
  init()
  window.skuoty.onClipboardCaptured((text) => {
    selectionText.value  = text
    elaboratedText.value = ''
    showSettings.value   = false
    hasTarget.value      = true
  })
  window.skuoty.signalReady()
  window.skuoty.setLanguage(settings.value.language)
})

function copyDone() {
  resetSession()
  window.skuoty.hide()
}

function resetSession() {
  selectionText.value  = ''
  elaboratedText.value = ''
  hasTarget.value      = false
}

function pasteBack() {
  window.skuoty.pasteBack(elaboratedText.value)
  hasTarget.value      = false
  selectionText.value  = ''
  elaboratedText.value = ''
}
</script>

<style scoped>
.ai-drop-enter-active, .ai-drop-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.ai-drop-enter-from, .ai-drop-leave-to       { opacity: 0; transform: translateY(-4px); }
</style>
