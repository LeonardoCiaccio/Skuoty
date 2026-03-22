import { ref } from 'vue'
import { pbkdf2Raw, aesEncryptRaw, aesDecryptRaw, b64, unb64 } from './useCrypto'
import type { AppSettings } from '../../shared/types'

export interface SessionMeta {
  id: string
  name: string
  created: number
  modified: number
}

interface SessionFile {
  name: string
  created: number
  modified: number
  salt: string
  iv: string
  enc: string
}

// module-level singleton
const _sessions = ref<SessionMeta[]>([])
const _current  = ref<SessionMeta | null>(null)
let   _keyBytes: Uint8Array<ArrayBuffer> | null = null
const _unlocked = ref(false)

function rnd16(): Uint8Array<ArrayBuffer> {
  return window.crypto.getRandomValues(new Uint8Array(16)) as unknown as Uint8Array<ArrayBuffer>
}

async function encryptSettings(settings: AppSettings, key: Uint8Array<ArrayBuffer>) {
  return aesEncryptRaw(JSON.stringify(settings), key)
}

async function decryptSettings(iv: string, enc: string, key: Uint8Array<ArrayBuffer>): Promise<AppSettings> {
  return JSON.parse(await aesDecryptRaw(iv, enc, key)) as AppSettings
}

export function useSessions() {
  async function list(): Promise<SessionMeta[]> {
    const metas = await window.skuoty.sessions.list() as SessionMeta[]
    _sessions.value = metas
    return metas
  }

  async function create(name: string, password: string, settings: AppSettings): Promise<string> {
    const id   = crypto.randomUUID()
    const salt = rnd16()
    const key  = await pbkdf2Raw(password, salt)
    const { iv, data: enc } = await encryptSettings(settings, key)
    const now  = Date.now()
    const file: SessionFile = { name, created: now, modified: now, salt: b64(salt), iv, enc }
    await window.skuoty.sessions.write(id, JSON.stringify(file))
    _keyBytes       = key
    _current.value  = { id, name, created: now, modified: now }
    _unlocked.value = true
    await list()
    return id
  }

  async function open(id: string, password: string): Promise<AppSettings> {
    const raw = await window.skuoty.sessions.read(id) as string | null
    if (!raw) throw new Error('not_found')
    const file = JSON.parse(raw) as SessionFile
    const key  = await pbkdf2Raw(password, unb64(file.salt))
    const settings = await decryptSettings(file.iv, file.enc, key) // throws on wrong pw
    _keyBytes       = key
    _current.value  = { id, name: file.name, created: file.created, modified: file.modified }
    _unlocked.value = true
    return settings
  }

  async function save(settings: AppSettings): Promise<void> {
    if (!_current.value || !_keyBytes) return
    const raw = await window.skuoty.sessions.read(_current.value.id) as string | null
    if (!raw) return
    const file = JSON.parse(raw) as SessionFile
    const { iv, data: enc } = await encryptSettings(settings, _keyBytes)
    const updated: SessionFile = { ...file, modified: Date.now(), iv, enc }
    await window.skuoty.sessions.write(_current.value.id, JSON.stringify(updated))
    _current.value.modified = updated.modified
  }

  async function rename(id: string, newName: string): Promise<void> {
    const raw = await window.skuoty.sessions.read(id) as string | null
    if (!raw) return
    const file = JSON.parse(raw) as SessionFile
    await window.skuoty.sessions.write(id, JSON.stringify({ ...file, name: newName }))
    if (_current.value?.id === id) _current.value.name = newName
    await list()
  }

  async function changePassword(id: string, oldPw: string, newPw: string): Promise<void> {
    const raw = await window.skuoty.sessions.read(id) as string | null
    if (!raw) throw new Error('not_found')
    const file     = JSON.parse(raw) as SessionFile
    const oldKey   = await pbkdf2Raw(oldPw, unb64(file.salt))
    const existing = await decryptSettings(file.iv, file.enc, oldKey) // verify + decrypt actual data
    const newSalt  = rnd16()
    const newKey   = await pbkdf2Raw(newPw, newSalt)
    const { iv, data: enc } = await encryptSettings(existing, newKey)
    await window.skuoty.sessions.write(id, JSON.stringify({ ...file, salt: b64(newSalt), iv, enc }))
    if (_current.value?.id === id) _keyBytes = newKey
  }

  async function deleteSession(id: string): Promise<void> {
    await window.skuoty.sessions.delete(id)
    if (_current.value?.id === id) logout()
    else await list()
  }

  function logout(): void {
    _keyBytes       = null
    _current.value  = null
    _unlocked.value = false
    _sessions.value = []
  }

  return {
    sessions: _sessions,
    current:  _current,
    unlocked: _unlocked,
    list, create, open, save, rename, changePassword, deleteSession, logout,
  }
}
