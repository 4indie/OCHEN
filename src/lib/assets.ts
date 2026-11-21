import DOMPurify from 'dompurify'
import type { Asset, ColorRole, Detail, ObjectRole } from '../types'

const svgNamespace = 'http://www.w3.org/2000/svg'
const localUrl = /url\(\s*['"]?#([\w:.-]+)['"]?\s*\)/gi
const maxUploadBytes = 2 * 1024 * 1024

function parseSvg(source: string) {
  const document = new DOMParser().parseFromString(source, 'image/svg+xml')
  const svg = document.documentElement
  if (document.querySelector('parsererror') || svg.localName !== 'svg' || (svg.namespaceURI && svg.namespaceURI !== svgNamespace)) {
    throw new Error('SVG не удалось прочитать.')
  }
  return svg
}

function readViewBox(svg: Element, override?: string): string {
  const width = Number.parseFloat(svg.getAttribute('width') ?? '512')
  const height = Number.parseFloat(svg.getAttribute('height') ?? '512')
  const values = (override ?? svg.getAttribute('viewBox') ?? `0 0 ${width} ${height}`).trim().split(/[ ,]+/).map(Number)
  if (values.length !== 4 || !values.every(Number.isFinite) || values[2] <= 0 || values[3] <= 0) {
    throw new Error('У SVG некорректный viewBox.')
  }
  return values.join(' ')
}

// The editor and export inline several SVGs in a single document, so every
// drawing needs its own clip paths, gradients and other local references.
function scopeSvgIds(svg: Element, assetId: string, requireLocalTarget = false) {
  const ids = new Map<string, string>()
  for (const element of svg.querySelectorAll('[id]')) {
    const original = element.getAttribute('id')!
    if (!ids.has(original)) ids.set(original, `asset-${assetId}-${ids.size}`)
    element.setAttribute('id', ids.get(original)!)
  }
  for (const element of svg.querySelectorAll('*')) {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.localName === 'href') {
        const id = attribute.value.startsWith('#') ? ids.get(attribute.value.slice(1)) : undefined
        if (id) attribute.value = `#${id}`
        else if (requireLocalTarget) element.removeAttributeNode(attribute)
      } else {
        let unresolved = false
        const rewritten = attribute.value.replace(localUrl, (match, id: string) => {
          const replacement = ids.get(id)
          if (replacement) return `url(#${replacement})`
          unresolved = true
          return match
        })
        if (unresolved && requireLocalTarget) element.removeAttributeNode(attribute)
        else attribute.value = rewritten
      }
    }
  }
}

function sanitizeUpload(source: string): Element {
  parseSvg(source)
  if (!DOMPurify.isSupported) throw new Error('Этот браузер не поддерживает импорт SVG.')
  const clean = DOMPurify.sanitize(source, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['style', 'foreignobject', 'image', 'feimage', 'a', 'animate', 'animatetransform', 'animatemotion', 'set'],
    FORBID_ATTR: ['style', 'xml:base', 'src', 'data-object-id'],
    ALLOW_DATA_ATTR: false,
  })
  const svg = parseSvg(clean)
  for (const element of svg.querySelectorAll('*')) {
    for (const attribute of Array.from(element.attributes)) {
      if (/url|\\|\/\*/i.test(attribute.value.replace(localUrl, ''))) {
        element.removeAttributeNode(attribute)
      }
    }
  }
  return svg
}

export async function importAsset(file: File, role: ObjectRole, detail: Detail): Promise<Asset> {
  if (!file.name.toLowerCase().endsWith('.svg')) throw new Error('Выберите файл SVG.')
  if (file.size > maxUploadBytes) throw new Error('Размер SVG не должен превышать 2 МБ.')
  const svg = sanitizeUpload(await file.text())
  if (!svg.querySelector('path,rect,circle,ellipse,line,polyline,polygon,use,text')) {
    throw new Error('В SVG нет поддерживаемых векторных элементов.')
  }
  const id = crypto.randomUUID()
  const name = file.name.replace(/\.svg$/i, '')
  scopeSvgIds(svg, id, true)
  return {
    id,
    name,
    source: svg.innerHTML,
    viewBox: readViewBox(svg),
    tags: name.toLowerCase().split(/[\s_\-.,]+/).filter(Boolean),
    role,
    detail,
    colorMap: {},
  }
}

export function assetFromSource(input: Omit<Asset, 'source' | 'viewBox'> & { source: string; viewBox?: string }): Asset {
  const svg = parseSvg(input.source)
  scopeSvgIds(svg, input.id)
  return { ...input, source: svg.innerHTML, viewBox: readViewBox(svg, input.viewBox) }
}

export function assetMarkup(asset: Asset, values: Record<ColorRole, string>) {
  const source = asset.source.replace(/#[0-9a-f]{6}\b/gi, hex => values[asset.colorMap[hex.toUpperCase()]] ?? hex)
  const [, , width, height] = asset.viewBox.split(/[ ,]+/).map(Number)
  // Imported files can be cropped from a shared Figma artboard. Keep that viewport
  // when their inner vector nodes are embedded into the composition SVG.
  return `<svg x="0" y="0" width="${width}" height="${height}" viewBox="${asset.viewBox}" overflow="hidden">${source}</svg>`
}
