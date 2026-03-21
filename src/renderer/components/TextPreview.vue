<template>
  <div class="px-3 pt-2 pb-1">
    <p class="text-xs text-[#6b6b6b] mb-1 uppercase tracking-wider">Selection</p>
    <div class="bg-[#222] border border-[#3a3a3a] rounded px-3 py-2 min-h-[40px]">
      <p v-if="text" class="text-xs text-[#a0a0a0] leading-relaxed line-clamp-2 break-words">
        {{ preview }}
        <span v-if="isTruncated" class="text-[#6b6b6b]">…</span>
      </p>
      <p v-else class="text-xs text-[#6b6b6b] italic">
        Select text and press Ctrl+C twice to start
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  text: string
  maxChars: number
}>()

const isTruncated = computed(() => props.text.length > props.maxChars)
const preview = computed(() =>
  isTruncated.value ? props.text.slice(0, props.maxChars) : props.text
)
</script>
