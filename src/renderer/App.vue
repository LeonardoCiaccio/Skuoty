<template>
  <div class="flex flex-col h-screen bg-[#2a2a2a] text-[#f0f0f0] select-none overflow-hidden rounded-lg border border-[#4a4a4a]">

    <!-- Title bar (draggable) -->
    <div class="flex items-center justify-between px-3 py-2 bg-[#222] border-b border-[#3a3a3a]" style="-webkit-app-region: drag">
      <span class="text-xs font-semibold tracking-widest text-[#a0a0a0] uppercase">Skuoty</span>
      <div class="flex gap-1" style="-webkit-app-region: no-drag">
        <button
          @click="showSettings = !showSettings"
          class="p-1 rounded hover:bg-[#3d3d3d] text-[#a0a0a0] hover:text-[#f0f0f0] transition-colors"
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
import { ref, onMounted } from 'vue'
import { Cog6ToothIcon } from '@heroicons/vue/24/outline'
import TextPreview    from './components/TextPreview.vue'
import ElaboratedText from './components/ElaboratedText.vue'
import PluginPanel    from './components/PluginPanel.vue'
import SettingsPanel  from './components/SettingsPanel.vue'
import { useSettings } from './composables/useSettings'

const { settings } = useSettings()

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
})

function copyElaborated() {
  window.skuoty.copyToClipboard(elaboratedText.value)
}

function pasteBack() {
  window.skuoty.pasteBack(elaboratedText.value)
}
</script>
