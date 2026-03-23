<template>
  <!-- Bottom bar: one button per enabled plugin -->
  <div class="px-3 pb-3 pt-2 border-t border-[var(--border)] flex gap-1.5 flex-wrap">
    <button
      v-for="plugin in enabledPlugins"
      :key="plugin.name"
      @click="Array.isArray(plugin.options) ? openPopup(plugin) : runDirect(plugin)"
      :disabled="!context || runningDirect === plugin.name"
      :title="!context ? t('noContextHint') : undefined"
      class="px-3 py-1.5 rounded text-xs font-medium bg-[var(--bg-element)] text-[var(--text-second)] hover:bg-[#6366f1] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--bg-element)] disabled:hover:text-[var(--text-second)] flex items-center gap-1"
    >
      <svg v-if="runningDirect === plugin.name" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      {{ getLabel(plugin.label, settings.language) }}
    </button>

    <p v-if="!enabledPlugins.length" class="text-xs text-[var(--text-faint)] italic self-center">
      {{ t('noPlugins') }}
    </p>
  </div>

  <!-- Modal overlay -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="activePlugin"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        @click.self="closePopup"
      >
        <div class="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6 w-72 shadow-2xl">

          <!-- Header -->
          <div class="flex items-center justify-between mb-5">
            <span class="text-sm font-semibold text-[var(--text-primary)]">
              {{ getLabel(activePlugin.label, settings.language) }}
            </span>
            <button @click="closePopup" class="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><XMarkIcon class="w-3.5 h-3.5" /></button>
          </div>

          <!-- Options dropdown (only when options is an array) -->
          <div v-if="Array.isArray(activePlugin.options)" class="flex flex-col gap-1.5 mb-5">
            <label class="text-xs text-[var(--text-muted)]">{{ t('option') }}</label>
            <select
              v-model="selectedOption"
              class="bg-[var(--bg-element)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#6366f1]"
            >
              <option v-for="opt in activePlugin.options" :key="opt.value" :value="opt.value">
                {{ getLabel(opt.label, settings.language) }}
              </option>
            </select>
          </div>

          <!-- Error -->
          <p v-if="error" class="mb-4 text-xs text-[var(--color-danger)]">{{ error }}</p>

          <!-- Run -->
          <button
            @click="run"
            :disabled="isRunning || !context"
            class="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-colors font-medium"
          >
            <svg v-if="isRunning" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            {{ isRunning ? t('running') : t('run') }}
          </button>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useSettings } from '../composables/useSettings'
import { useI18n } from '../composables/useI18n'
import { runPlugin, AIError } from '../composables/useAI'
import { getLabel } from '../../shared/types'
import type { SkuotyPlugin } from '../../shared/types'

const props = defineProps<{
  selectionText:  string
  elaboratedText: string
}>()

const emit = defineEmits<{ result: [text: string] }>()

const { settings } = useSettings()
const { t } = useI18n()

const enabledPlugins = computed(() => settings.value.plugins.filter((p) => p.enabled))

const context = computed(() =>
  props.elaboratedText.trim() || props.selectionText.trim()
)

const activePlugin   = ref<SkuotyPlugin | null>(null)
const selectedOption = ref('')
const isRunning      = ref(false)
const runningDirect  = ref('')   // name of the direct-run plugin currently running
const error          = ref('')

function openPopup(plugin: SkuotyPlugin) {
  activePlugin.value = plugin
  selectedOption.value = Array.isArray(plugin.options)
    ? plugin.options[0]?.value ?? ''
    : plugin.options
  error.value = ''
}

function closePopup() {
  if (isRunning.value) return
  activePlugin.value = null
  error.value = ''
}

async function runDirect(plugin: SkuotyPlugin) {
  if (!context.value || runningDirect.value) return
  runningDirect.value = plugin.name
  try {
    const result = await runPlugin(plugin, plugin.options as string, context.value, settings.value)
    emit('result', result)
  } catch (e: unknown) {
    // errors on direct-run are silently ignored for now (no popup to show them)
  } finally {
    runningDirect.value = ''
  }
}

async function run() {
  if (!activePlugin.value || !context.value) return
  isRunning.value = true
  error.value = ''
  try {
    const result = await runPlugin(activePlugin.value, selectedOption.value, context.value, settings.value)
    isRunning.value = false
    emit('result', result)
    closePopup()
  } catch (e: unknown) {
    if (e instanceof AIError) {
      error.value = t.value(e.code) + (e.message && e.message !== e.code ? ` (${e.message})` : '')
    } else {
      error.value = e instanceof Error ? e.message : t.value('errApi')
    }
  } finally {
    isRunning.value = false
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }
</style>
