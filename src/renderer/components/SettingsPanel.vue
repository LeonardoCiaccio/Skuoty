<template>
  <div class="flex flex-col flex-1 px-3 py-2 overflow-y-auto">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-sm font-semibold">Settings</h2>
      <button @click="$emit('close')" class="text-[#6b6b6b] hover:text-[#f0f0f0] transition-colors">
        <XMarkIcon class="w-4 h-4" />
      </button>
    </div>

    <div class="flex flex-col gap-4">

      <!-- Gemini API Key -->
      <div class="flex flex-col gap-1">
        <label class="text-xs text-[#a0a0a0]">Gemini API Key</label>
        <input
          v-model="settings.geminiApiKey"
          type="password"
          placeholder="AIza…"
          class="bg-[#222] border border-[#3a3a3a] rounded px-3 py-1.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#6366f1] transition-colors"
        />
      </div>

      <!-- Model -->
      <div class="flex flex-col gap-1">
        <label class="text-xs text-[#a0a0a0]">Model</label>
        <select
          v-model="settings.geminiModel"
          class="bg-[#222] border border-[#3a3a3a] rounded px-3 py-1.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#6366f1] transition-colors"
        >
          <option v-for="m in GEMINI_MODELS" :key="m.value" :value="m.value">
            {{ m.label }}
          </option>
        </select>
      </div>

      <!-- Preview max chars -->
      <div class="flex flex-col gap-1">
        <label class="text-xs text-[#a0a0a0]">Preview max characters</label>
        <input
          v-model.number="settings.previewMaxChars"
          type="number"
          min="50"
          max="1000"
          class="bg-[#222] border border-[#3a3a3a] rounded px-3 py-1.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#6366f1] transition-colors w-28"
        />
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { GEMINI_MODELS } from '../../shared/types'
import { useSettings } from '../composables/useSettings'

defineEmits<{ close: [] }>()

const { settings } = useSettings()
</script>
