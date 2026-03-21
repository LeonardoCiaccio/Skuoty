<template>
  <div class="px-3 pb-3 pt-1 border-t border-[#3a3a3a] mt-1">

    <!-- Plugin tabs -->
    <div class="flex gap-1 mb-2 flex-wrap">
      <button
        v-for="plugin in plugins"
        :key="plugin.id"
        @click="activePluginId = plugin.id"
        :class="[
          'px-2.5 py-1 rounded text-xs transition-colors',
          activePluginId === plugin.id
            ? 'bg-[#6366f1] text-white'
            : 'bg-[#3d3d3d] text-[#a0a0a0] hover:bg-[#4a4a4a] hover:text-[#f0f0f0]',
        ]"
      >
        {{ plugin.name }}
      </button>
    </div>

    <!-- Active plugin UI -->
    <div v-if="activePlugin" class="flex gap-2 items-end">
      <!-- Plugin fields -->
      <div class="flex gap-2 flex-1 flex-wrap">
        <template v-for="field in activePlugin.fields" :key="field.key">
          <div class="flex flex-col gap-0.5">
            <label class="text-xs text-[#6b6b6b]">{{ field.label }}</label>

            <select
              v-if="field.type === 'select'"
              v-model="localConfig[field.key]"
              class="bg-[#3d3d3d] border border-[#4a4a4a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#6366f1]"
            >
              <option v-for="opt in field.options" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>

            <input
              v-else-if="field.type === 'text' || field.type === 'number'"
              v-model="localConfig[field.key]"
              :type="field.type"
              :placeholder="field.placeholder"
              class="bg-[#3d3d3d] border border-[#4a4a4a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#6366f1] w-28"
            />

            <textarea
              v-else-if="field.type === 'textarea'"
              v-model="localConfig[field.key]"
              :placeholder="field.placeholder"
              class="bg-[#3d3d3d] border border-[#4a4a4a] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none focus:border-[#6366f1] resize-none w-full"
              rows="2"
            />
          </div>
        </template>
      </div>

      <!-- Run button -->
      <button
        @click="run"
        :disabled="isRunning || !inputText"
        class="flex items-center gap-1.5 px-3 py-1.5 bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded transition-colors font-medium shrink-0"
      >
        <ArrowPathIcon v-if="isRunning" class="w-3.5 h-3.5 animate-spin" />
        <BoltIcon v-else class="w-3.5 h-3.5" />
        {{ isRunning ? 'Running…' : 'Run' }}
      </button>
    </div>

    <!-- Error -->
    <p v-if="error" class="mt-1.5 text-xs text-red-400">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ArrowPathIcon, BoltIcon } from '@heroicons/vue/24/outline'
import { loadPlugins } from '../plugins/loader'
import type { SkuotyPlugin } from '../../shared/types'

const props = defineProps<{
  selectionText: string
  elaboratedText: string
  apiKey: string
  model: string
  pluginConfigs: Record<string, Record<string, string>>
}>()

const emit = defineEmits<{
  result: [text: string]
  'update:plugin-config': [pluginId: string, config: Record<string, string>]
}>()

const plugins = ref<SkuotyPlugin[]>([])
const activePluginId = ref('')
const isRunning = ref(false)
const error = ref('')

const activePlugin = computed(() =>
  plugins.value.find((p) => p.id === activePluginId.value)
)

const localConfig = ref<Record<string, string>>({})

// Sync localConfig from props when plugin changes
watch(activePluginId, (id) => {
  const plugin = plugins.value.find((p) => p.id === id)
  if (!plugin) return
  const saved = props.pluginConfigs[id] ?? {}
  const defaults: Record<string, string> = {}
  for (const field of plugin.fields) {
    defaults[field.key] = String(saved[field.key] ?? field.default ?? '')
  }
  localConfig.value = defaults
})

// Persist config changes upward
watch(localConfig, (cfg) => {
  if (activePluginId.value) {
    emit('update:plugin-config', activePluginId.value, { ...cfg })
  }
}, { deep: true })

const inputText = computed(() => {
  if (!activePlugin.value) return ''
  return activePlugin.value.inputSource === 'elaborated'
    ? props.elaboratedText
    : props.selectionText
})

async function run() {
  if (!activePlugin.value || !inputText.value) return
  isRunning.value = true
  error.value = ''
  try {
    const result = await activePlugin.value.run(
      inputText.value,
      localConfig.value,
      props.apiKey,
      props.model
    )
    emit('result', result)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
  } finally {
    isRunning.value = false
  }
}

onMounted(async () => {
  plugins.value = await loadPlugins()
  if (plugins.value.length > 0) {
    activePluginId.value = plugins.value[0].id
  }
})
</script>
