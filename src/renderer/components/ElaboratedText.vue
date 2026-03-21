<template>
  <div class="px-3 py-1 flex-1 flex flex-col min-h-0">
    <p class="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">{{ t('output') }}</p>
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
          @click="copy"
          :disabled="!modelValue"
          class="p-1.5 rounded bg-[var(--bg-element)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          :class="copied ? 'text-emerald-500' : 'text-[var(--text-second)] hover:text-[var(--text-primary)]'"
          :title="t('copyOutput')"
        >
          <ClipboardDocumentCheckIcon v-if="copied" class="w-3.5 h-3.5" />
          <ClipboardDocumentIcon v-else class="w-3.5 h-3.5" />
        </button>
        <button
          @click="$emit('paste-back')"
          :disabled="!modelValue"
          class="p-1.5 rounded bg-[var(--bg-element)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-second)] hover:text-[var(--text-primary)] transition-colors"
          :title="t('pasteBack')"
        >
          <ArrowUturnLeftIcon class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ClipboardDocumentIcon, ClipboardDocumentCheckIcon, ArrowUturnLeftIcon } from '@heroicons/vue/24/outline'
import { useI18n } from '../composables/useI18n'

const props = defineProps<{ modelValue: string }>()
defineEmits<{
  'update:modelValue': [value: string]
  'paste-back': []
}>()

const { t } = useI18n()

const copied = ref(false)

function copy() {
  navigator.clipboard.writeText(props.modelValue).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  })
}
</script>
