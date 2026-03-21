<template>
  <div class="flex flex-col h-screen bg-[var(--bg-base)] text-[var(--text-primary)] select-none overflow-hidden rounded-lg border border-[var(--border)]">

    <!-- Title bar (draggable) -->
    <div class="flex items-center justify-between px-3 py-2 bg-[var(--bg-deep)] border-b border-[var(--border)]" style="-webkit-app-region: drag">
      <span class="text-xs font-semibold tracking-widest text-[var(--text-muted)] uppercase">Skuoty</span>
      <div class="flex gap-1" style="-webkit-app-region: no-drag">
        <button
          @click="showSettings = !showSettings"
          class="p-1 rounded hover:bg-[var(--bg-element)] text-[var(--text-second)] hover:text-[var(--text-primary)] transition-colors"
          title="Settings"
        >
          <Cog6ToothIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Settings panel -->
    <SettingsPanel v-if="showSettings" @close="showSettings = false" />

    <!-- Main content -->
    <template v-else>
      <TextPreview :text="selectionText" :max-chars="settings.previewMaxChars" />
      <ElaboratedText v-model="elaboratedText" @copy="copyElaborated" @paste-back="pasteBack" />
      <PluginPanel
        :selection-text="selectionText"
        :elaborated-text="elaboratedText"
        @result="elaboratedText = $event"
      />
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Cog6ToothIcon } from '@heroicons/vue/24/outline'
import TextPreview    from './components/TextPreview.vue'
import ElaboratedText from './components/ElaboratedText.vue'
import PluginPanel    from './components/PluginPanel.vue'
import SettingsPanel  from './components/SettingsPanel.vue'
import { useSettings } from './composables/useSettings'

const { settings } = useSettings()

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

onMounted(() => {
  window.skuoty.onClipboardCaptured((text) => {
    selectionText.value  = text
    elaboratedText.value = ''
    showSettings.value   = false
  })
  window.skuoty.signalReady()
  window.skuoty.setLanguage(settings.value.language)
})

function copyElaborated() {
  window.skuoty.copyToClipboard(elaboratedText.value)
}

function pasteBack() {
  window.skuoty.pasteBack(elaboratedText.value)
}
</script>
