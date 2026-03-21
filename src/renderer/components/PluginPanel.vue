<template>
  <!-- Bottom bar: one button per enabled plugin -->
  <div class="px-3 pb-3 pt-2 border-t border-[#3a3a3a] flex gap-1.5 flex-wrap">
    <button
      v-for="plugin in enabledPlugins"
      :key="plugin.name"
      @click="openPopup(plugin)"
      class="px-3 py-1.5 rounded text-xs font-medium bg-[#3d3d3d] text-[#c0c0c0] hover:bg-[#6366f1] hover:text-white transition-colors"
    >
      {{ getLabel(plugin.label, settings.language) }}
    </button>

    <p v-if="!enabledPlugins.length" class="text-xs text-[#4a4a4a] italic self-center">
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
        <div class="bg-[#2a2a2a] border border-[#4a4a4a] rounded-xl p-5 w-72 shadow-2xl">

          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <span class="text-sm font-semibold text-[#f0f0f0]">
              {{ getLabel(activePlugin.label, settings.language) }}
            </span>
            <button @click="closePopup" class="text-[#6b6b6b] hover:text-[#f0f0f0] transition-colors">✕</button>
          </div>

          <!-- Options dropdown (only when options is an array) -->
          <div v-if="Array.isArray(activePlugin.options)" class="flex flex-col gap-1 mb-4">
            <label class="text-xs text-[#7a7a7a]">{{ t('option') }}</label>
            <select
              v-model="selectedOption"
              class="bg-[#333] border border-[#4a4a4a] rounded-lg px-2.5 py-1.5 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#6366f1]"
            >
              <option
                v-for="opt in activePlugin.options"
                :key="opt.value"
                :value="opt.value"
              >
                {{ getLabel(opt.label, settings.language) }}
              </option>
            </select>
          </div>

          <!-- Error -->
          <p v-if="error" class="mb-3 text-xs text-red-400">{{ error }}</p>

          <!-- Run -->
          <button
            @click="run"
            :disabled="isRunning || !context"
            class="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-colors font-medium"
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
import { useSettings } from '../composables/useSettings'
import { useI18n } from '../composables/useI18n'
import { runPlugin } from '../composables/useAI'
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

// context: elaborated output if present, else selection
const context = computed(() =>
  props.elaboratedText.trim() || props.selectionText.trim()
)

const activePlugin   = ref<SkuotyPlugin | null>(null)
const selectedOption = ref('')
const isRunning      = ref(false)
const error          = ref('')

function openPopup(plugin: SkuotyPlugin) {
  activePlugin.value = plugin
  // Resolve initial option
  if (Array.isArray(plugin.options)) {
    selectedOption.value = plugin.options[0]?.value ?? ''
  } else {
    selectedOption.value = plugin.options
  }
  error.value = ''
}

function closePopup() {
  if (isRunning.value) return
  activePlugin.value = null
  error.value = ''
}

async function run() {
  if (!activePlugin.value || !context.value) return
  isRunning.value = true
  error.value = ''
  try {
    const result = await runPlugin(
      activePlugin.value,
      selectedOption.value,
      context.value,
      settings.value,
    )
    emit('result', result)
    closePopup()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
  } finally {
    isRunning.value = false
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }
</style>
