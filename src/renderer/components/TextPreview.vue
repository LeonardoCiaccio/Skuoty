<template>
  <div class="px-3 pt-2 pb-1">
    <div class="flex items-baseline gap-2 mb-1">
      <p class="text-xs text-[var(--text-muted)] uppercase tracking-wider">{{ t('selection') }}</p>
      <span v-if="text" class="text-xs text-[var(--text-faint)]">
        {{ charCount }} {{ t('chars') }} · {{ wordCount }} {{ t('words') }}
      </span>
    </div>
    <div class="bg-[var(--bg-deep)] border border-[var(--border)] rounded px-3 py-2 min-h-[40px]">
      <p v-if="text" class="text-xs text-[var(--text-second)] leading-relaxed line-clamp-2 break-words">
        {{ preview }}
        <span v-if="isTruncated" class="text-[var(--text-muted)]">…</span>
      </p>
      <p v-else class="text-xs text-[var(--text-muted)] italic">
        {{ t('selectionHint') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../composables/useI18n'

const props = defineProps<{
  text: string
  maxChars: number
}>()

const { t } = useI18n()

const isTruncated = computed(() => props.text.length > props.maxChars)
const preview     = computed(() => isTruncated.value ? props.text.slice(0, props.maxChars) : props.text)
const charCount   = computed(() => props.text.length)
const wordCount   = computed(() => props.text.trim() ? props.text.trim().split(/\s+/).length : 0)
</script>
