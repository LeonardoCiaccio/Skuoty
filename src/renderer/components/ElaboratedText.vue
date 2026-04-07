<template>
  <div class="px-3 py-1 flex-1 flex flex-col min-h-0">
    <div class="flex items-baseline gap-2 mb-1">
      <p class="text-xs text-[var(--text-muted)] uppercase tracking-wider">{{ t('output') }}</p>
      <span v-if="modelValue" class="text-xs text-[var(--text-faint)]">
        {{ modelValue.length }} {{ t('chars') }} · {{ wordCount }} {{ t('words') }}
      </span>
    </div>
    <div class="relative flex-1 min-h-0">
      <textarea
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        class="w-full h-full bg-[var(--bg-deep)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:border-[#6366f1] transition-colors placeholder-[var(--text-faint)]"
        :placeholder="t('outputPlaceholder')"
        spellcheck="false"
      />

      <div class="absolute bottom-2 right-2 flex gap-1">
        <button
          v-if="modelValue || hasTarget"
          @click="$emit('refine')"
          class="p-1.5 rounded bg-[var(--bg-element)] hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-second)] hover:text-[#6366f1]"
          :title="t('refine')"
        >
          <ChatBubbleLeftEllipsisIcon class="w-3.5 h-3.5" />
        </button>
        <button
          v-if="modelValue"
          @click="$emit('update:modelValue', '')"
          class="p-1.5 rounded bg-[var(--bg-element)] hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-second)] hover:text-[var(--color-danger)]"
          :title="t('clearOutput')"
        >
          <BackspaceIcon class="w-3.5 h-3.5" />
        </button>
        <button
          @click="copy"
          :disabled="!modelValue"
          class="p-1.5 rounded bg-[var(--bg-element)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[var(--text-second)] hover:text-[var(--text-primary)]"
          :title="t('copyOutput')"
        >
          <ClipboardDocumentIcon class="w-3.5 h-3.5" />
        </button>
        <button
          v-if="hasTarget"
          @click="$emit('paste-back')"
          :disabled="!modelValue"
          class="p-1.5 rounded bg-[var(--bg-element)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-second)] hover:text-[var(--text-primary)] transition-colors"
          :title="t('pasteBack')"
        >
          <ArrowUturnLeftIcon class="w-3.5 h-3.5" />
        </button>
        <button
          @click="$emit('reset')"
          :disabled="!modelValue && !hasTarget"
          class="p-1.5 rounded bg-[var(--bg-element)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-second)] hover:text-[var(--text-primary)] transition-colors"
          :title="t('clearSession')"
        >
          <XMarkIcon class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { computed } from 'vue'
import { ClipboardDocumentIcon, ArrowUturnLeftIcon, XMarkIcon, BackspaceIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/vue/24/outline'
import { useI18n } from '../composables/useI18n'

const props = defineProps<{ modelValue: string; hasTarget: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'paste-back': []
  'copy-done': []
  'reset': []
  'refine': []
}>()

const { t } = useI18n()

const wordCount = computed(() => props.modelValue.trim() ? props.modelValue.trim().split(/\s+/).length : 0)


function copy() {
  navigator.clipboard.writeText(props.modelValue).then(() => {
    emit('copy-done')
  }).catch((err: unknown) => {
    console.error('[ElaboratedText] clipboard write failed:', err)
  })
}
</script>
