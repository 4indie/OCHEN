import { assetFromSource } from './assets'
import type { Asset, ColorRole } from '../types'

type LibraryEntry = Omit<Asset, 'source' | 'colorMap'> & { url: string }

const colorMap: Record<string, ColorRole> = {
  '#181817': 'stroke',
  '#7864D7': 'primary',
  '#AA9BF0': 'shade',
  '#D7CDF5': 'shade',
  '#F9ECB0': 'accent',
  '#F9A3AA': 'accent2',
  '#FFE3E1': 'accent3',
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export async function loadLibrary(signal: AbortSignal) {
  const base = new URL(import.meta.env.BASE_URL, document.baseURI)
  const response = await fetch(new URL('library/manifest.json', base), { signal })
  if (!response.ok) throw new Error('Не удалось загрузить библиотеку SVG.')
  const entries: LibraryEntry[] = await response.json()
  const results = await Promise.allSettled(entries.map(async ({ url, ...entry }) => {
    try {
      const assetResponse = await fetch(new URL(url.replace(/^\//, ''), base), { signal })
      if (!assetResponse.ok) throw new Error()
      return assetFromSource({ ...entry, source: await assetResponse.text(), colorMap })
    } catch {
      throw new Error(`Не загрузился SVG «${entry.name}».`)
    }
  }))
  return {
    assets: results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []),
    warnings: results.flatMap(result => result.status === 'rejected' ? [errorMessage(result.reason)] : []),
  }
}

export function groupAssetVersions(assets: readonly Asset[]) {
  const library = new Map<string, Asset[]>()
  for (const asset of assets) {
    const id = asset.semantic?.id ?? asset.canonicalId ?? asset.id
    const versions = library.get(id)
    if (versions) versions.push(asset)
    else library.set(id, [asset])
  }
  return library
}
