import { ref } from 'vue'

const GITHUB_API   = 'https://api.github.com/repos/LeonardoCiaccio/Skuoty/releases/latest'
const RELEASES_URL = 'https://github.com/LeonardoCiaccio/Skuoty/releases/latest'

// Module-level singleton — shared across all components
const updateAvailableVersion = ref('')
const updateChecking         = ref(false)
const updateError            = ref(false)

let checked = false

/** True if version `a` is strictly greater than `b` (numeric compare of x.y.z, suffixes ignored). */
function isNewer(a: string, b: string): boolean {
  const parse = (v: string) => v.split('-')[0].split('.').map((n) => parseInt(n, 10) || 0)
  const pa = parse(a), pb = parse(b)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d > 0
  }
  return false
}

export function useUpdateCheck() {
  async function checkUpdate(): Promise<void> {
    if (updateChecking.value) return
    updateChecking.value    = true
    updateAvailableVersion.value = ''
    updateError.value       = false
    try {
      const res  = await fetch(GITHUB_API, { headers: { Accept: 'application/vnd.github+json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { tag_name: string }
      const latest  = data.tag_name.replace(/^v/, '')
      const current = __APP_VERSION__
      if (isNewer(latest, current)) updateAvailableVersion.value = latest
    } catch {
      updateError.value = true
    } finally {
      updateChecking.value = false
    }
  }

  // Runs once automatically on first mount
  function checkOnStartup(): void {
    if (checked) return
    checked = true
    checkUpdate()
  }

  function openReleasePage(): void {
    window.skuoty.openExternal(RELEASES_URL)
  }

  return { updateAvailableVersion, updateChecking, updateError, checkUpdate, checkOnStartup, openReleasePage }
}
