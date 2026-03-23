<template>
  <div class="flex flex-1 min-h-0">

    <!-- ── Sidebar ── -->
    <nav class="w-28 bg-[var(--bg-deep)] border-r border-[var(--border)] flex flex-col py-3 shrink-0">
      <button
        v-for="s in sections"
        :key="s.id"
        @click="active = s.id"
        :class="[
          'relative px-5 py-3.5 text-left text-xs transition-colors',
          active === s.id ? 'text-[#6366f1] font-medium' : 'text-[var(--text-muted)] hover:text-[var(--text-second)]',
        ]"
      >
        <span v-if="active === s.id" class="absolute left-0 top-0 bottom-0 w-0.5 bg-[#6366f1] rounded-r" />
        {{ s.label[settings.language] ?? s.label['en'] }}
      </button>
    </nav>

    <!-- ── Content ── -->
    <div class="flex-1 overflow-y-auto p-4">

      <!-- ══ GENERAL ══ -->
      <template v-if="active === 'general'">
        <h2 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{{ t('general') }}</h2>

        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[var(--text-muted)]">{{ t('language') }}</label>
            <select v-model="settings.language" class="field w-40">
              <option value="en">English</option>
              <option value="it">Italiano</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs text-[var(--text-muted)]">{{ t('theme') }}</label>
            <div class="flex gap-2">
              <button
                @click="settings.theme = 'dark'"
                :class="['px-3 py-1.5 text-xs rounded-lg border transition-colors', settings.theme === 'dark' ? 'border-[#6366f1] bg-[#6366f1]/10 text-white' : 'border-[var(--border)] text-[var(--text-second)] hover:border-[var(--text-muted)]']"
              ><span class="flex items-center gap-1.5"><MoonIcon class="w-3.5 h-3.5" />{{ t('themeDark') }}</span></button>
              <button
                @click="settings.theme = 'light'"
                :class="['px-3 py-1.5 text-xs rounded-lg border transition-colors', settings.theme === 'light' ? 'border-[#6366f1] bg-[#6366f1]/10 text-[#6366f1]' : 'border-[var(--border)] text-[var(--text-second)] hover:border-[var(--text-muted)]']"
              ><span class="flex items-center gap-1.5"><SunIcon class="w-3.5 h-3.5" />{{ t('themeLight') }}</span></button>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs text-[var(--text-muted)]">{{ t('previewMaxChars') }}</label>
            <input
              v-model.number="settings.previewMaxChars"
              type="number" min="50" max="2000" step="50"
              class="field w-28"
            />
          </div>
        </div>
      </template>

      <!-- ══ AI ══ -->
      <template v-if="active === 'ai'">
        <h2 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{{ t('aiProvider') }}</h2>

        <div class="flex flex-col gap-3">
          <div
            v-for="p in aiProviders"
            :key="p.id"
            :class="[
              'rounded-lg border p-3 transition-colors',
              settings.aiProvider === p.id ? 'border-[#6366f1]/60 bg-[#6366f1]/5' : 'border-[var(--border)]',
            ]"
          >
            <!-- Provider header -->
            <div class="flex items-center gap-2 mb-2">
              <input type="radio" :value="p.id" v-model="settings.aiProvider" class="accent-[#6366f1]" />
              <span class="text-xs font-medium text-[var(--text-primary)] flex-1">{{ p.name }}</span>

              <!-- Reset button -->
              <button
                @click="resetProvider(p.id)"
                :disabled="settings.aiProvider !== p.id"
                class="px-2 py-0.5 text-xs rounded bg-[var(--bg-element)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors"
                :title="t('reset')"
              ><ArrowPathIcon class="w-3.5 h-3.5" /></button>

              <!-- Test button — disabled when provider not selected -->
              <button
                @click="runTest(p.id)"
                :disabled="settings.aiProvider !== p.id || testState[p.id] === 'testing'"
                :class="[
                  'px-2 py-0.5 text-xs rounded bg-[var(--bg-element)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium',
                  testState[p.id] === 'ok'    ? 'text-[var(--color-success)]' :
                  testState[p.id] === 'error' ? 'text-[var(--color-danger)]'  : 'text-[var(--text-second)]',
                ]"
              >
                <ArrowPathIcon v-if="testState[p.id] === 'testing'" class="w-3.5 h-3.5 animate-spin" />
                <span v-else>{{ t('test') }}</span>
              </button>
            </div>

            <!-- Test error message -->
            <p v-if="testState[p.id] === 'error' && testMsg[p.id]" class="text-xs text-[var(--color-danger)] mb-2">
              {{ testMsg[p.id] }}
            </p>

            <!-- Ollama fields -->
            <template v-if="p.id === 'ollama'">
              <div class="flex flex-col gap-2" :class="settings.aiProvider !== p.id ? 'opacity-40 pointer-events-none' : ''">
                <div class="flex flex-col gap-0.5">
                  <label class="text-xs text-[var(--text-muted)]">{{ t('baseUrl') }}</label>
                  <input v-model="settings.providers.ollama.baseUrl" type="text" class="field" :disabled="settings.aiProvider !== p.id" />
                </div>
                <div class="flex flex-col gap-0.5">
                  <label class="text-xs text-[var(--text-muted)]">{{ t('model') }}</label>
                  <div class="flex gap-1.5">
                    <select v-if="ollamaModels.length" v-model="settings.providers.ollama.model" class="field flex-1" :disabled="settings.aiProvider !== p.id">
                      <option v-for="m in ollamaModels" :key="m" :value="m">{{ m }}</option>
                    </select>
                    <input v-else v-model="settings.providers.ollama.model" type="text" class="field flex-1" :disabled="settings.aiProvider !== p.id" />
                    <button
                      @click="refreshOllamaModels"
                      :disabled="settings.aiProvider !== p.id || ollamaFetching"
                      class="px-2 py-0.5 text-xs rounded bg-[var(--bg-element)] hover:bg-[var(--bg-hover)] text-[var(--text-second)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                      :title="t('refreshModels')"
                    ><ArrowPathIcon class="w-3.5 h-3.5" :class="ollamaFetching ? 'animate-spin' : ''" /></button>
                  </div>
                  <p v-if="ollamaFetchError" class="text-xs text-[var(--color-danger)]">{{ ollamaFetchError }}</p>
                </div>
              </div>
            </template>

            <!-- Other providers -->
            <template v-else>
              <div class="flex flex-col gap-2" :class="settings.aiProvider !== p.id ? 'opacity-40 pointer-events-none' : ''">
                <div class="flex flex-col gap-0.5">
                  <label class="text-xs text-[var(--text-muted)]">{{ t('apiKey') }}</label>
                  <input v-model="settings.providers[p.id].apiKey" type="password" class="field" :disabled="settings.aiProvider !== p.id" />
                </div>
                <div class="flex flex-col gap-0.5">
                  <label class="text-xs text-[var(--text-muted)]">{{ t('model') }}</label>
                  <input v-model="settings.providers[p.id].model" type="text" class="field" :disabled="settings.aiProvider !== p.id" />
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- ══ PLUGINS ══ -->
      <template v-if="active === 'plugins'">
        <h2 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{{ t('plugins') }}</h2>

        <!-- Load new plugin (first) -->
        <div class="mb-4">
          <p class="text-xs text-[var(--text-muted)] mb-2">{{ t('loadPlugin') }}</p>
          <textarea
            v-model="loadJson"
            rows="5"
            placeholder='{&#10;  "name": "my-plugin",&#10;  "label": [{"en":"My Plugin"}],&#10;  "options": "...",&#10;  "prompt": "{{option}} {{context}}"&#10;}'
            class="field w-full resize-none font-mono text-xs"
          />
          <p v-if="loadError" class="text-xs text-[var(--color-danger)] mt-1">{{ loadError }}</p>
          <button @click="loadPlugin" class="mt-2 btn-primary text-xs px-3 py-1.5">{{ t('load') }}</button>
        </div>

        <!-- Installed plugins (after) -->
        <div class="border-t border-[var(--border)] pt-3 flex flex-col gap-2">
          <div
            v-for="(plugin, idx) in settings.plugins"
            :key="plugin.name"
            class="flex items-center gap-2 bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg px-3 py-2"
          >
            <button
              @click="plugin.enabled = !plugin.enabled"
              :class="['w-7 h-4 rounded-full transition-colors shrink-0', plugin.enabled ? 'bg-[#6366f1]' : 'bg-[var(--bg-hover)]']"
            >
              <span :class="['block w-3 h-3 rounded-full bg-white transition-transform mx-0.5', plugin.enabled ? 'translate-x-3' : 'translate-x-0']" />
            </button>

            <span class="text-xs text-[var(--text-primary)] flex-1 truncate">
              {{ getLabel(plugin.label, settings.language) }}
            </span>

            <button @click="openEditor(idx)" class="text-xs text-[var(--text-muted)] hover:text-[var(--text-second)] transition-colors px-1" :title="t('edit')"><PencilIcon class="w-3.5 h-3.5" /></button>
            <button @click="deletePlugin(idx)" class="text-xs text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors px-1" :title="t('delete')"><XMarkIcon class="w-3.5 h-3.5" /></button>
          </div>

          <p v-if="!settings.plugins.length" class="text-xs text-[var(--text-faint)] italic">
            {{ t('noPluginsList') }}
          </p>
        </div>
      </template>

      <!-- ══ SESSIONS ══ -->
      <template v-if="active === 'sessions'">
        <h2 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{{ t('sessions') }}</h2>

        <div class="flex flex-col gap-4">
          <!-- Current session -->
          <div v-if="current" class="bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg px-3 py-2">
            <p class="text-xs text-[var(--text-muted)] mb-1">{{ t('currentSession') }}</p>
            <p class="text-xs font-semibold text-[var(--text-primary)]">{{ current.name }}</p>
          </div>

          <!-- Session list -->
          <div class="flex flex-col gap-2">
            <div
              v-for="s in sessions"
              :key="s.id"
              class="flex items-center gap-2 bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg px-3 py-2"
            >
              <span class="text-xs text-[var(--text-primary)] flex-1 truncate font-medium">{{ s.name }}</span>
              <CheckIcon v-if="s.id === current?.id" class="w-3.5 h-3.5 text-[#6366f1] shrink-0" />

              <!-- Switch to session (non-current only) -->
              <button
                v-if="s.id !== current?.id"
                @click="openSwitchModal(s.id, s.name)"
                class="text-xs text-[var(--text-muted)] hover:text-[#6366f1] transition-colors px-1"
                :title="t('switchSession')"
              ><ArrowsRightLeftIcon class="w-3.5 h-3.5" /></button>

              <!-- Rename -->
              <button
                @click="openRenameModal(s.id, s.name)"
                class="text-xs text-[var(--text-muted)] hover:text-[var(--text-second)] transition-colors px-1"
                :title="t('renameSession')"
              ><PencilIcon class="w-3.5 h-3.5" /></button>

              <!-- Change password (all sessions) -->
              <button
                @click="openChangePasswordModal(s.id)"
                class="text-xs text-[var(--text-muted)] hover:text-[var(--text-second)] transition-colors px-1"
                :title="t('sessionChangePassword')"
              ><KeyIcon class="w-3.5 h-3.5" /></button>

              <!-- Delete (all sessions) -->
              <button
                @click="doDeleteSession(s.id)"
                class="text-xs text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors px-1"
                :title="t('deleteSession')"
              ><XMarkIcon class="w-3.5 h-3.5" /></button>
            </div>
          </div>

          <p v-if="sessionActionMsg" class="text-xs text-[var(--color-success)]">{{ sessionActionMsg }}</p>
          <p v-if="sessionActionError" class="text-xs text-[var(--color-danger)]">{{ sessionActionError }}</p>

          <!-- New session button -->
          <button @click="openNewSessionModal" class="btn-primary text-xs px-3 py-1.5 self-start flex items-center gap-1.5">
            <PlusIcon class="w-3.5 h-3.5" />{{ t('addSession') }}
          </button>
        </div>
      </template>

      <!-- ══ BACKUP ══ -->
      <template v-if="active === 'backup'">
        <h2 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Backup</h2>

        <div class="flex flex-col gap-4">
          <div>
            <p class="text-xs text-[var(--text-muted)] mb-1">{{ t('exportDesc') }}</p>
            <p class="text-xs text-[var(--text-muted)] opacity-70 mb-2">{{ t('exportEncryptedDesc') }}</p>
            <button @click="openExportModal" :disabled="exporting" class="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">{{ t('export') }}</button>
            <p v-if="exportDone" class="text-xs text-[var(--color-success)] mt-1">{{ t('exportedToFile') }}</p>
          </div>

          <div class="border-t border-[var(--border)] pt-3">
            <p class="text-xs text-[var(--text-muted)] mb-2">{{ t('importDesc') }}</p>
            <p v-if="importError" class="text-xs text-[var(--color-danger)] mb-1">{{ importError }}</p>
            <button @click="doImport" :disabled="importing" class="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">{{ t('import') }}</button>
            <p v-if="importDone" class="text-xs text-[var(--color-success)] mt-1">{{ t('importedFromFile') }}</p>
          </div>
        </div>
      </template>

      <!-- ══ INFO ══ -->
      <template v-if="active === 'info'">
        <h2 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{{ t('info') }}</h2>

        <div class="flex flex-col gap-5">
          <!-- Version -->
          <div class="flex items-center justify-between bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg px-4 py-3">
            <span class="text-xs text-[var(--text-muted)]">{{ t('version') }}</span>
            <span class="text-xs font-mono font-semibold text-[var(--text-primary)]">v{{ appVersion }}</span>
          </div>

          <!-- Factory reset -->
          <div class="flex flex-col gap-2">
            <p class="text-xs text-[var(--text-muted)]">{{ t('factoryResetDesc') }}</p>
            <button
              @click="factoryReset"
              class="btn-secondary text-xs px-3 py-1.5 self-start text-[var(--color-danger)] hover:text-[var(--color-danger-hover)]"
            ><span class="flex items-center gap-1.5"><ArrowPathIcon class="w-3.5 h-3.5" />{{ t('factoryReset') }}</span></button>
            <p v-if="factoryResetDone" class="flex items-center gap-1 text-xs text-[var(--color-success)]"><CheckIcon class="w-3.5 h-3.5" />{{ t('applied') }}</p>
          </div>

          <!-- Update (placeholder) -->
          <div class="flex flex-col gap-2 border-t border-[var(--border)] pt-4">
            <p class="text-xs text-[var(--text-muted)]">{{ t('updateDesc') }}</p>
            <button
              @click="checkUpdate"
              :disabled="updateChecking"
              class="btn-primary text-xs px-3 py-1.5 self-start disabled:opacity-50"
            ><ArrowPathIcon v-if="updateChecking" class="w-3.5 h-3.5 animate-spin" /><span v-else>{{ t('checkUpdate') }}</span></button>
            <p v-if="updateMsg" class="text-xs text-[var(--text-second)]">{{ updateMsg }}</p>
          </div>
        </div>
      </template>

    </div>
  </div>

  <!-- Plugin JSON editor modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="editorIdx !== null"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        @click.self="closeEditor"
      >
        <div class="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 w-[480px] shadow-2xl flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-[var(--text-primary)]">{{ t('editPlugin') }}</span>
            <button @click="closeEditor" class="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><XMarkIcon class="w-3.5 h-3.5" /></button>
          </div>
          <textarea v-model="editorJson" rows="14" class="field w-full resize-none font-mono text-xs" />
          <p v-if="editorError" class="text-xs text-[var(--color-danger)]">{{ editorError }}</p>
          <div class="flex justify-end gap-2">
            <button @click="closeEditor" class="btn-secondary text-xs px-3 py-1.5">{{ t('cancel') }}</button>
            <button @click="saveEditor"  class="btn-primary  text-xs px-3 py-1.5">{{ t('save') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Export password modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showExportModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        @click.self="showExportModal = false"
      >
        <div class="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 w-[340px] shadow-2xl flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-[var(--text-primary)]">{{ t('export') }}</span>
            <button @click="showExportModal = false" class="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><XMarkIcon class="w-3.5 h-3.5" /></button>
          </div>
          <p class="text-xs text-[var(--text-muted)]">{{ t('exportEncryptedDesc') }}</p>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[var(--text-muted)]">{{ t('exportPassword') }}</label>
            <input v-model="exportPassword" type="password" class="field" autocomplete="new-password" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[var(--text-muted)]">{{ t('confirmPassword') }}</label>
            <input v-model="exportPasswordConfirm" type="password" class="field" autocomplete="new-password" />
          </div>
          <p v-if="exportModalError" class="text-xs text-[var(--color-danger)]">{{ exportModalError }}</p>
          <div class="flex justify-end gap-2">
            <button @click="showExportModal = false" class="btn-secondary text-xs px-3 py-1.5">{{ t('cancel') }}</button>
            <button @click="doExport" :disabled="exporting" class="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">{{ t('export') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Import password modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showImportModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        @click.self="showImportModal = false"
      >
        <div class="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 w-[340px] shadow-2xl flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-[var(--text-primary)]">{{ t('import') }}</span>
            <button @click="showImportModal = false" class="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><XMarkIcon class="w-3.5 h-3.5" /></button>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[var(--text-muted)]">{{ t('exportPassword') }}</label>
            <input v-model="importPassword" type="password" class="field" autocomplete="current-password" />
          </div>
          <p v-if="importModalError" class="text-xs text-[var(--color-danger)]">{{ importModalError }}</p>
          <div class="flex justify-end gap-2">
            <button @click="showImportModal = false" class="btn-secondary text-xs px-3 py-1.5">{{ t('cancel') }}</button>
            <button @click="confirmImport" :disabled="importing" class="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">{{ t('import') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Switch session modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showSwitchModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="showSwitchModal = false">
        <div class="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 w-[320px] shadow-2xl flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-[var(--text-primary)]">{{ t('switchSession') }}: <span class="text-[#6366f1]">{{ switchTargetName }}</span></span>
            <button @click="showSwitchModal = false" class="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><XMarkIcon class="w-3.5 h-3.5" /></button>
          </div>
          <input v-model="switchPw" type="password" :placeholder="t('password')" class="field" @keyup.enter="doSwitch" autocomplete="current-password" />
          <p v-if="switchError" class="text-xs text-[var(--color-danger)]">{{ switchError }}</p>
          <div class="flex justify-end gap-2">
            <button @click="showSwitchModal = false" class="btn-secondary text-xs px-3 py-1.5">{{ t('cancel') }}</button>
            <button @click="doSwitch" :disabled="switchBusy" class="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">{{ t('switchSession') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- New session modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showNewSessionModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        @click.self="showNewSessionModal = false"
      >
        <div class="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 w-[340px] shadow-2xl flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-[var(--text-primary)]">{{ t('addSession') }}</span>
            <button @click="showNewSessionModal = false" class="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><XMarkIcon class="w-3.5 h-3.5" /></button>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[var(--text-muted)]">{{ t('sessionName') }}</label>
            <input v-model="newSessionName" type="text" class="field" autocomplete="off" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[var(--text-muted)]">{{ t('passwordLabel') }}</label>
            <input v-model="newSessionPassword" type="password" class="field" autocomplete="new-password" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[var(--text-muted)]">{{ t('confirmPassword') }}</label>
            <input v-model="newSessionPasswordConfirm" type="password" class="field" autocomplete="new-password" />
          </div>
          <p v-if="newSessionError" class="text-xs text-[var(--color-danger)]">{{ newSessionError }}</p>
          <div class="flex justify-end gap-2">
            <button @click="showNewSessionModal = false" class="btn-secondary text-xs px-3 py-1.5">{{ t('cancel') }}</button>
            <button @click="doCreateSession" :disabled="newSessionBusy" class="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">{{ t('createBtn') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Rename session modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showRenameModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        @click.self="showRenameModal = false"
      >
        <div class="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 w-[340px] shadow-2xl flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-[var(--text-primary)]">{{ t('renameSession') }}</span>
            <button @click="showRenameModal = false" class="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><XMarkIcon class="w-3.5 h-3.5" /></button>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[var(--text-muted)]">{{ t('newSessionName') }}</label>
            <input v-model="renameValue" type="text" class="field" autocomplete="off" />
          </div>
          <p v-if="renameError" class="text-xs text-[var(--color-danger)]">{{ renameError }}</p>
          <div class="flex justify-end gap-2">
            <button @click="showRenameModal = false" class="btn-secondary text-xs px-3 py-1.5">{{ t('cancel') }}</button>
            <button @click="doRename" :disabled="renameBusy" class="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">{{ t('save') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Change password modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showChangePwModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        @click.self="showChangePwModal = false"
      >
        <div class="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 w-[340px] shadow-2xl flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-[var(--text-primary)]">{{ t('sessionChangePassword') }}</span>
            <button @click="showChangePwModal = false" class="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><XMarkIcon class="w-3.5 h-3.5" /></button>
          </div>
          <template v-if="!changePwDone">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-[var(--text-muted)]">{{ t('oldPassword') }}</label>
              <input v-model="changePwOld" type="password" class="field" autocomplete="current-password" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-[var(--text-muted)]">{{ t('newPassword') }}</label>
              <input v-model="changePwNew" type="password" class="field" autocomplete="new-password" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-[var(--text-muted)]">{{ t('confirmPassword') }}</label>
              <input v-model="changePwConfirm" type="password" class="field" autocomplete="new-password" />
            </div>
            <p v-if="changePwError" class="text-xs text-[var(--color-danger)]">{{ changePwError }}</p>
            <div class="flex justify-end gap-2">
              <button @click="showChangePwModal = false" class="btn-secondary text-xs px-3 py-1.5">{{ t('cancel') }}</button>
              <button @click="doChangePassword" :disabled="changePwBusy" class="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">{{ t('save') }}</button>
            </div>
          </template>
          <template v-else>
            <p class="text-sm text-[var(--color-success)]">{{ t('passwordChanged') }}</p>
            <div class="flex justify-end">
              <button @click="showChangePwModal = false" class="btn-primary text-xs px-3 py-1.5">{{ t('close') }}</button>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Confirm delete session modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showConfirmDeleteModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        @click.self="showConfirmDeleteModal = false"
      >
        <div class="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 w-[340px] shadow-2xl flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-[var(--color-danger)]">{{ t('deleteSession') }}</span>
            <button @click="showConfirmDeleteModal = false" class="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><XMarkIcon class="w-3.5 h-3.5" /></button>
          </div>
          <p class="text-sm text-[var(--text-primary)]">{{ confirmDeleteMsg }}</p>
          <div class="flex justify-end gap-2">
            <button @click="showConfirmDeleteModal = false" class="btn-secondary text-xs px-3 py-1.5">{{ t('cancel') }}</button>
            <button @click="confirmDeleteSession" class="btn-danger text-xs px-3 py-1.5">{{ t('deleteSession') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  XMarkIcon, ArrowPathIcon, ArrowsRightLeftIcon,
  PencilIcon, KeyIcon, CheckIcon, MoonIcon, SunIcon, PlusIcon,
} from '@heroicons/vue/24/outline'
import { useSettings } from '../composables/useSettings'
import { useSessions } from '../composables/useSessions'
import { useI18n } from '../composables/useI18n'
import { testProvider, fetchOllamaModels, AIError } from '../composables/useAI'
import { encryptData, decryptData, isEncryptedBlob } from '../composables/useCrypto'
import { getLabel, DEFAULT_SETTINGS } from '../../shared/types'
import type { AIProvider, SkuotyPlugin } from '../../shared/types'

const appVersion = __APP_VERSION__

const emit = defineEmits<{ close: []; logout: [] }>()

const { settings, exportSettings, importSettings } = useSettings()
const { sessions, current, list: listSessions, create: createSession, open: openSession, rename, changePassword, deleteSession, save: saveSession, logout } = useSessions()
const { load: loadSettings } = useSettings()
const { t } = useI18n()

const sections = [
  { id: 'general',   label: { en: 'General',   it: 'Generale',   es: 'General',   fr: 'Général',    de: 'Allgemein'  } },
  { id: 'ai',        label: { en: 'AI',         it: 'AI',         es: 'IA',         fr: 'IA',         de: 'KI'         } },
  { id: 'plugins',   label: { en: 'Plugins',    it: 'Plugin',     es: 'Plugins',    fr: 'Plugins',    de: 'Plugins'    } },
  { id: 'sessions',  label: { en: 'Sessions',   it: 'Sessioni',   es: 'Sesiones',   fr: 'Sessions',   de: 'Sitzungen'  } },
  { id: 'backup',    label: { en: 'Backup',     it: 'Backup',     es: 'Copia',      fr: 'Sauvegarde', de: 'Sicherung'  } },
  { id: 'info',      label: { en: 'Info',       it: 'Info',       es: 'Info',       fr: 'Info',       de: 'Info'       } },
]
const active = ref('general')

const aiProviders = [
  { id: 'ollama',     name: 'Ollama'     },
  { id: 'gemini',     name: 'Gemini'     },
  { id: 'openrouter', name: 'OpenRouter' },
  { id: 'anthropic',  name: 'Anthropic'  },
  { id: 'openai',     name: 'OpenAI'     },
] as const

// ── AI test ───────────────────────────────────────────────────────────────────
const testState = ref<Record<string, 'idle' | 'testing' | 'ok' | 'error'>>({
  gemini: 'idle', ollama: 'idle', openrouter: 'idle', anthropic: 'idle', openai: 'idle',
})
const testMsg = ref<Record<string, string>>({
  gemini: '', ollama: '', openrouter: '', anthropic: '', openai: '',
})

function resetProvider(provider: AIProvider) {
  const def = DEFAULT_SETTINGS.providers[provider]
  settings.value.providers[provider] = { ...def }
  testState.value[provider] = 'idle'
  testMsg.value[provider] = ''
}

async function runTest(provider: AIProvider) {
  testState.value[provider] = 'testing'
  testMsg.value[provider] = ''
  try {
    await testProvider(provider, settings.value)
    testState.value[provider] = 'ok'
  } catch (e) {
    testState.value[provider] = 'error'
    if (e instanceof AIError) {
      testMsg.value[provider] = t.value(e.code) + (e.message && e.message !== e.code ? ` (${e.message})` : '')
    } else {
      testMsg.value[provider] = e instanceof Error ? e.message : t.value('errApi')
    }
  }
}

// ── Ollama model refresh ──────────────────────────────────────────────────────
const ollamaModels    = ref<string[]>([])
const ollamaFetching  = ref(false)
const ollamaFetchError = ref('')

async function refreshOllamaModels() {
  ollamaFetching.value = true
  ollamaFetchError.value = ''
  try {
    const models = await fetchOllamaModels(settings.value.providers.ollama.baseUrl)
    ollamaModels.value = models
    if (models.length && !models.includes(settings.value.providers.ollama.model)) {
      settings.value.providers.ollama.model = models[0]
    }
  } catch (e) {
    ollamaFetchError.value = e instanceof AIError
      ? t.value(e.code)
      : e instanceof Error ? e.message : t.value('errNetwork')
  } finally {
    ollamaFetching.value = false
  }
}

// ── Plugin editor ─────────────────────────────────────────────────────────────
const editorIdx   = ref<number | null>(null)
const editorJson  = ref('')
const editorError = ref('')

function openEditor(idx: number) {
  editorIdx.value = idx
  const { enabled: _enabled, ...rest } = settings.value.plugins[idx]
  editorJson.value = JSON.stringify(rest, null, 2)
  editorError.value = ''
}
function closeEditor() { editorIdx.value = null; editorError.value = '' }
function saveEditor() {
  if (editorIdx.value === null) return
  const v = validatePlugin(editorJson.value)
  if (!v) { editorError.value = 'Invalid plugin JSON.'; return }
  const enabled = settings.value.plugins[editorIdx.value].enabled
  settings.value.plugins[editorIdx.value] = { ...v, enabled }
  closeEditor()
}

// ── Plugin delete ─────────────────────────────────────────────────────────────
function deletePlugin(idx: number) { settings.value.plugins.splice(idx, 1) }

// ── Load new plugin ───────────────────────────────────────────────────────────
const loadJson  = ref('')
const loadError = ref('')

function loadPlugin() {
  loadError.value = ''
  const v = validatePlugin(loadJson.value)
  if (!v) { loadError.value = 'Invalid plugin. Required: name, label (array with "en" entry), options (string or array), prompt.'; return }
  const idx = settings.value.plugins.findIndex((p) => p.name === v.name)
  if (idx >= 0) settings.value.plugins[idx] = v
  else settings.value.plugins.push(v)
  loadJson.value = ''
}

// ── Backup ────────────────────────────────────────────────────────────────────
const importError = ref('')
const importDone  = ref(false)
const exportDone  = ref(false)
const exporting   = ref(false)
const importing   = ref(false)

// Export modal
const showExportModal         = ref(false)
const exportPassword          = ref('')
const exportPasswordConfirm   = ref('')
const exportModalError        = ref('')

function openExportModal() {
  exportPassword.value = ''
  exportPasswordConfirm.value = ''
  exportModalError.value = ''
  showExportModal.value = true
}

async function doExport() {
  exportModalError.value = ''
  if (exportPassword.value.length < 6) {
    exportModalError.value = t.value('passwordTooShort')
    return
  }
  if (exportPassword.value !== exportPasswordConfirm.value) {
    exportModalError.value = t.value('passwordMismatch')
    return
  }
  exporting.value = true
  showExportModal.value = false
  try {
    const encrypted = await encryptData(exportSettings(), exportPassword.value)
    const saved = await window.skuoty.exportToFile(encrypted)
    if (saved) {
      exportDone.value = true
      setTimeout(() => { exportDone.value = false }, 3000)
    }
  } finally {
    exporting.value = false
    exportPassword.value = ''
    exportPasswordConfirm.value = ''
  }
}

// Import modal
const showImportModal  = ref(false)
const importPassword   = ref('')
const importModalError = ref('')
let   pendingImportJson: string | null = null

async function doImport() {
  importing.value = true
  importError.value = ''
  importDone.value = false
  const json = await window.skuoty.importFromFile()
  importing.value = false
  if (!json) return

  // Try plain JSON first
  try {
    const parsed = JSON.parse(json)
    if (!isEncryptedBlob(parsed)) {
      // Plain JSON — import directly
      const err = importSettings(json)
      if (err) { importError.value = err; return }
      importDone.value = true
      setTimeout(() => { importDone.value = false }, 3000)
      return
    }
  } catch {
    importError.value = 'Invalid file.'
    return
  }

  // Encrypted blob — ask for password
  pendingImportJson = json
  importPassword.value = ''
  importModalError.value = ''
  showImportModal.value = true
}

async function confirmImport() {
  if (!pendingImportJson) return
  importModalError.value = ''
  importing.value = true
  try {
    const plain = await decryptData(pendingImportJson, importPassword.value)
    const err = importSettings(plain)
    if (err) { importModalError.value = err; return }
    showImportModal.value = false
    importDone.value = true
    setTimeout(() => { importDone.value = false }, 3000)
  } catch {
    importModalError.value = t.value('wrongPassword')
  } finally {
    importing.value = false
  }
}

// ── Sessions management ───────────────────────────────────────────────────────
const sessionActionMsg   = ref('')
const sessionActionError = ref('')

function flashSessionMsg(msg: string) {
  sessionActionMsg.value = msg
  setTimeout(() => { sessionActionMsg.value = '' }, 2500)
}

// New session modal
const showNewSessionModal          = ref(false)
const newSessionName               = ref('')
const newSessionPassword           = ref('')
const newSessionPasswordConfirm    = ref('')
const newSessionError              = ref('')
const newSessionBusy               = ref(false)

function openNewSessionModal() {
  newSessionName.value = ''
  newSessionPassword.value = ''
  newSessionPasswordConfirm.value = ''
  newSessionError.value = ''
  showNewSessionModal.value = true
}

async function doCreateSession() {
  newSessionError.value = ''
  if (!newSessionName.value.trim()) { newSessionError.value = t.value('sessionNameRequired'); return }
  if (newSessionPassword.value.length < 6) { newSessionError.value = t.value('passwordTooShort'); return }
  if (newSessionPassword.value !== newSessionPasswordConfirm.value) { newSessionError.value = t.value('passwordMismatch'); return }
  newSessionBusy.value = true
  try {
    await createSession(newSessionName.value.trim(), newSessionPassword.value, settings.value)
    showNewSessionModal.value = false
    flashSessionMsg(t.value('applied'))
  } catch (e) {
    newSessionError.value = e instanceof Error ? e.message : String(e)
  } finally {
    newSessionBusy.value = false
  }
}

// Rename modal
const showRenameModal  = ref(false)
const renameTargetId   = ref('')
const renameValue      = ref('')
const renameError      = ref('')
const renameBusy       = ref(false)

function openRenameModal(id: string, currentName: string) {
  renameTargetId.value = id
  renameValue.value = currentName
  renameError.value = ''
  showRenameModal.value = true
}

async function doRename() {
  if (!renameValue.value.trim()) { renameError.value = t.value('sessionNameRequired'); return }
  renameBusy.value = true
  try {
    await rename(renameTargetId.value, renameValue.value.trim())
    showRenameModal.value = false
    flashSessionMsg(t.value('sessionRenamed'))
  } catch (e) {
    renameError.value = e instanceof Error ? e.message : String(e)
  } finally {
    renameBusy.value = false
  }
}

// Switch session
const showSwitchModal  = ref(false)
const switchTargetId   = ref('')
const switchTargetName = ref('')
const switchPw         = ref('')
const switchError      = ref('')
const switchBusy       = ref(false)

function openSwitchModal(id: string, name: string) {
  switchTargetId.value   = id
  switchTargetName.value = name
  switchPw.value         = ''
  switchError.value      = ''
  showSwitchModal.value  = true
}

async function doSwitch() {
  switchError.value = ''
  if (!switchPw.value) return
  switchBusy.value = true
  try {
    const newSettings = await openSession(switchTargetId.value, switchPw.value)
    loadSettings(newSettings)
    showSwitchModal.value = false
    flashSessionMsg(t.value('sessionSwitched'))
  } catch {
    switchError.value = t.value('wrongPassword')
  } finally {
    switchBusy.value = false
  }
}

// Delete session
const showConfirmDeleteModal = ref(false)
const confirmDeleteTargetId  = ref('')
const confirmDeleteMsg       = ref('')

function doDeleteSession(id: string) {
  const sess = sessions.value.find(s => s.id === id)
  confirmDeleteTargetId.value = id
  confirmDeleteMsg.value = t.value('confirmDeleteSession').replace('{name}', sess?.name ?? id)
  showConfirmDeleteModal.value = true
}

async function confirmDeleteSession() {
  const id = confirmDeleteTargetId.value
  showConfirmDeleteModal.value = false
  sessionActionError.value = ''
  const wasCurrent = id === current.value?.id
  try {
    await deleteSession(id)
    if (wasCurrent) {
      emit('logout')
    } else {
      flashSessionMsg(t.value('sessionDeleted'))
    }
  } catch (e) {
    sessionActionError.value = e instanceof Error ? e.message : String(e)
  }
}

// Change password modal
const showChangePwModal  = ref(false)
const changePwTargetId   = ref('')
const changePwOld        = ref('')
const changePwNew        = ref('')
const changePwConfirm    = ref('')
const changePwError      = ref('')
const changePwDone       = ref(false)
const changePwBusy       = ref(false)

function openChangePasswordModal(id: string) {
  changePwTargetId.value = id
  changePwOld.value = ''
  changePwNew.value = ''
  changePwConfirm.value = ''
  changePwError.value = ''
  changePwDone.value = false
  showChangePwModal.value = true
}

async function doChangePassword() {
  changePwError.value = ''
  changePwDone.value = false
  if (changePwNew.value.length < 6) { changePwError.value = t.value('passwordTooShort'); return }
  if (changePwNew.value !== changePwConfirm.value) { changePwError.value = t.value('passwordMismatch'); return }
  changePwBusy.value = true
  try {
    await changePassword(changePwTargetId.value, changePwOld.value, changePwNew.value)
    changePwDone.value = true
    changePwOld.value = ''
    changePwNew.value = ''
    changePwConfirm.value = ''
    setTimeout(() => { showChangePwModal.value = false; changePwDone.value = false }, 1500)
  } catch {
    changePwError.value = t.value('wrongPassword')
  } finally {
    changePwBusy.value = false
  }
}

// ── Info / factory reset / update ─────────────────────────────────────────────
const factoryResetDone = ref(false)
const updateChecking   = ref(false)
const updateMsg        = ref('')

function factoryReset() {
  settings.value = structuredClone(DEFAULT_SETTINGS)
  saveSession(settings.value)
  factoryResetDone.value = true
  setTimeout(() => { factoryResetDone.value = false }, 2000)
}

async function checkUpdate() {
  updateChecking.value = true
  updateMsg.value = ''
  await new Promise(r => setTimeout(r, 1200))
  updateChecking.value = false
  updateMsg.value = t.value('upToDate')
}

// ── Plugin validation ─────────────────────────────────────────────────────────
function validatePlugin(raw: string): SkuotyPlugin | null {
  try {
    const p = JSON.parse(raw) as Record<string, unknown>
    if (typeof p.name !== 'string' || !p.name) return null
    if (!Array.isArray(p.label)) return null
    if (!p.label.some((l: unknown) => typeof l === 'object' && l !== null && typeof (l as Record<string, string>)['en'] === 'string')) return null
    if (typeof p.options !== 'string' && !Array.isArray(p.options)) return null
    if (typeof p.prompt !== 'string' || !p.prompt) return null
    return { name: p.name, label: p.label as SkuotyPlugin['label'], options: p.options as SkuotyPlugin['options'], prompt: p.prompt, enabled: p.enabled !== false }
  } catch { return null }
}

// Load sessions list when sessions tab is activated
watch(active, (a) => { if (a === 'sessions') listSessions() })
</script>

<style scoped>
.field {
  @apply bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)]
         focus:outline-none focus:border-[#6366f1] transition-colors;
}
.btn-primary   { @apply bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-lg transition-colors font-medium; }
.btn-secondary { @apply bg-[var(--bg-element)] hover:bg-[var(--bg-hover)] text-[var(--text-second)] rounded-lg transition-colors; }
.btn-danger    { @apply bg-[var(--color-danger)] hover:opacity-90 text-white rounded-lg transition-colors font-medium; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }
</style>
