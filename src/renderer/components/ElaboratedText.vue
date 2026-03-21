<template>
  <div class="px-3 py-1 flex-1 flex flex-col min-h-0">
    <p class="text-xs text-[#6b6b6b] mb-1 uppercase tracking-wider">Output</p>
    <div class="relative flex-1 min-h-0">
      <textarea
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        class="w-full h-full bg-[#222] border border-[#3a3a3a] rounded px-3 py-2 text-sm text-[#f0f0f0] resize-none focus:outline-none focus:border-[#6366f1] transition-colors placeholder-[#4a4a4a]"
        placeholder="Processed text will appear here…"
        spellcheck="false"
      />

      <!-- Action buttons -->
      <div class="absolute bottom-2 right-2 flex gap-1">
        <button
          @click="$emit('copy')"
          :disabled="!modelValue"
          class="p-1.5 rounded bg-[#3d3d3d] hover:bg-[#4a4a4a] disabled:opacity-30 disabled:cursor-not-allowed text-[#a0a0a0] hover:text-[#f0f0f0] transition-colors"
          title="Copy output"
        >
          <ClipboardDocumentIcon class="w-3.5 h-3.5" />
        </button>
        <button
          @click="$emit('paste-back')"
          :disabled="!modelValue"
          class="p-1.5 rounded bg-[#3d3d3d] hover:bg-[#4a4a4a] disabled:opacity-30 disabled:cursor-not-allowed text-[#a0a0a0] hover:text-[#f0f0f0] transition-colors"
          title="Paste back to source"
        >
          <ArrowUturnLeftIcon class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ClipboardDocumentIcon, ArrowUturnLeftIcon } from '@heroicons/vue/24/outline'

defineProps<{ modelValue: string }>()
defineEmits<{
  'update:modelValue': [value: string]
  copy: []
  'paste-back': []
}>()
</script>
