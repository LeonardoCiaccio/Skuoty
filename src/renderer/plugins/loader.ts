import type { SkuotyPlugin } from '../../shared/types'

/**
 * Auto-discovers all plugins via Vite's import.meta.glob.
 * Scans: src/renderer/plugins/{name}/index.ts
 *
 * To add a new plugin: create src/renderer/plugins/<name>/index.ts
 * exporting a default object that satisfies SkuotyPlugin.
 */
export async function loadPlugins(): Promise<SkuotyPlugin[]> {
  const modules = import.meta.glob<{ default: SkuotyPlugin }>(
    './**/index.ts',
    { eager: false }
  )

  const plugins: SkuotyPlugin[] = []

  for (const path in modules) {
    // Skip the loader itself
    if (path === './loader.ts') continue
    try {
      const mod = await modules[path]()
      if (mod.default && mod.default.name) {
        plugins.push(mod.default)
      }
    } catch (e) {
      console.error(`Failed to load plugin at ${path}:`, e)
    }
  }

  return plugins
}
