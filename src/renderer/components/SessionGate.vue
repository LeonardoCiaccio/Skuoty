<template>
  <div class="session-gate">
    <!-- Loading -->
    <div v-if="phase === 'loading'" class="gate-card center-content">
      <div class="spinner" />
    </div>

    <!-- Create first session -->
    <div v-else-if="phase === 'create'" class="gate-card">
      <h1 class="gate-title">{{ t('createFirstSession') }}</h1>
      <p class="gate-desc">{{ t('sessionWelcomeDesc') }}</p>

      <form @submit.prevent="doCreate" class="gate-form">
        <div class="field-group">
          <label class="field-label">{{ t('sessionName') }}</label>
          <input
            v-model="form.name"
            type="text"
            class="field-input"
            :placeholder="t('sessionName')"
            autocomplete="off"
            autofocus
          />
        </div>

        <div class="field-group">
          <label class="field-label">{{ t('passwordLabel') }}</label>
          <input
            v-model="form.password"
            type="password"
            class="field-input"
            autocomplete="new-password"
          />
        </div>

        <div class="field-group">
          <label class="field-label">{{ t('confirmPassword') }}</label>
          <input
            v-model="form.confirm"
            type="password"
            class="field-input"
            autocomplete="new-password"
          />
        </div>

        <p v-if="errorMsg" class="gate-error">{{ errorMsg }}</p>

        <button type="submit" :disabled="busy" class="gate-btn-primary">
          <span v-if="busy" class="spinner-sm" />
          <span v-else>{{ t('createBtn') }}</span>
        </button>
      </form>
    </div>

    <!-- Select + unlock session -->
    <div v-else-if="phase === 'select'" class="gate-card gate-card-wide">
      <div class="gate-inner">
        <!-- Session list (shown when multiple) -->
        <div v-if="sessions.length > 1" class="session-list-col">
          <p class="field-label mb-2">{{ t('selectSession') }}</p>
          <div class="session-list">
            <button
              v-for="s in sessions"
              :key="s.id"
              @click="selectedId = s.id"
              :class="['session-item', selectedId === s.id ? 'session-item-active' : '']"
            >
              <span class="session-item-name">{{ s.name }}</span>
            </button>
          </div>

          <button @click="phase = 'create'" class="gate-btn-secondary mt-3">
            + {{ t('addSession') }}
          </button>
        </div>

        <!-- Password unlock -->
        <div class="unlock-col">
          <h1 class="gate-title">{{ selectedSessionName }}</h1>

          <form @submit.prevent="doUnlock" class="gate-form">
            <div class="field-group">
              <label class="field-label">{{ t('passwordLabel') }}</label>
              <input
                v-model="form.password"
                type="password"
                class="field-input"
                autocomplete="current-password"
                autofocus
                ref="passwordInput"
              />
            </div>

            <p v-if="errorMsg" class="gate-error">{{ errorMsg }}</p>

            <button type="submit" :disabled="busy" class="gate-btn-primary">
              <span v-if="busy" class="spinner-sm" />
              <span v-else>{{ t('unlockBtn') }}</span>
            </button>

            <button
              v-if="sessions.length === 1"
              type="button"
              @click="phase = 'create'"
              class="gate-btn-secondary"
            >
              + {{ t('addSession') }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useSessions } from '../composables/useSessions'
import { useSettings }  from '../composables/useSettings'
import { useI18n }      from '../composables/useI18n'
import type { AppSettings } from '../../shared/types'

const emit = defineEmits<{ unlocked: [settings: AppSettings] }>()

const { t } = useI18n()
const { settings } = useSettings()
const { sessions, list, create, open } = useSessions()

type Phase = 'loading' | 'create' | 'select'
const phase       = ref<Phase>('loading')
const selectedId  = ref<string>('')
const busy        = ref(false)
const errorMsg    = ref('')
const passwordInput = ref<HTMLInputElement | null>(null)

const form = ref({ name: '', password: '', confirm: '' })

const selectedSessionName = computed(() => {
  const s = sessions.value.find(s => s.id === selectedId.value)
  return s?.name ?? ''
})

onMounted(async () => {
  const metas = await list()
  if (metas.length === 0) {
    phase.value = 'create'
  } else {
    selectedId.value = metas[0].id
    phase.value = 'select'
  }
})

// Focus password input when entering select phase
watch(phase, async (p) => {
  if (p === 'select') {
    await nextTick()
    passwordInput.value?.focus()
  }
})

// Reset password when switching session
watch(selectedId, () => {
  form.value.password = ''
  errorMsg.value = ''
  nextTick(() => passwordInput.value?.focus())
})

async function doCreate() {
  errorMsg.value = ''
  if (!form.value.name.trim()) {
    errorMsg.value = t.value('sessionNameRequired')
    return
  }
  if (form.value.password.length < 6) {
    errorMsg.value = t.value('passwordTooShort')
    return
  }
  if (form.value.password !== form.value.confirm) {
    errorMsg.value = t.value('passwordMismatch')
    return
  }
  busy.value = true
  try {
    // Use current settings as starting data for the new session
    await create(form.value.name.trim(), form.value.password, settings.value)
    emit('unlocked', settings.value)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}

async function doUnlock() {
  errorMsg.value = ''
  if (!selectedId.value) return
  busy.value = true
  try {
    const loadedSettings = await open(selectedId.value, form.value.password)
    emit('unlocked', loadedSettings)
  } catch {
    errorMsg.value = t.value('wrongPassword')
    form.value.password = ''
    nextTick(() => passwordInput.value?.focus())
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.session-gate {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--bg-base);
  display: flex;
  align-items: center;
  justify-content: center;
}

.gate-card {
  background: var(--bg-deep);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 28px 32px;
  width: 340px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.gate-card-wide {
  width: auto;
  min-width: 320px;
  max-width: 600px;
}

.center-content {
  align-items: center;
  justify-content: center;
  min-height: 120px;
}

.gate-inner {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.session-list-col {
  display: flex;
  flex-direction: column;
  min-width: 160px;
}

.unlock-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-width: 240px;
}

.gate-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.gate-desc {
  font-size: 12px;
  color: var(--text-second);
  line-height: 1.5;
  margin: 0;
}

.gate-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 11px;
  color: var(--text-muted);
}

.field-input {
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 12px;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}

.field-input:focus {
  border-color: var(--accent, #6366f1);
}

.gate-error {
  font-size: 11px;
  color: var(--color-danger);
  margin: 0;
}

.gate-btn-primary {
  background: var(--accent, #6366f1);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.gate-btn-primary:hover:not(:disabled) {
  background: #4f46e5;
}

.gate-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gate-btn-secondary {
  background: var(--bg-element);
  color: var(--text-second);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
}

.gate-btn-secondary:hover {
  background: var(--bg-hover, var(--bg-element));
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.session-item {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
  color: var(--text-second);
  font-size: 12px;
}

.session-item:hover {
  background: var(--bg-element);
}

.session-item-active {
  border-color: var(--accent, #6366f1);
  background: color-mix(in srgb, var(--accent, #6366f1) 10%, transparent);
  color: var(--text-primary);
}

.session-item-name {
  font-weight: 500;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border);
  border-top-color: var(--accent, #6366f1);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.spinner-sm {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.mb-2 { margin-bottom: 8px; }
.mt-3 { margin-top: 12px; }

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
