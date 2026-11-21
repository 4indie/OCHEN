export type Detail = 'minimal' | 'rich'
export type InputMode = 'metaphor' | 'components'
export type Alignment = 'left' | 'center' | 'right'
export type ObjectRole = 'main' | 'background'
export type PaletteId = 'violet' | 'coral' | 'ocean'
export type ColorRole = 'primary' | 'accent' | 'accent2' | 'accent3' | 'shade' | 'stroke'

export interface Asset {
  id: string
  canonicalId?: string
  name: string
  source: string
  viewBox: string
  tags: string[]
  role: ObjectRole
  detail: Detail
  /** Explicit mapping only. Empty map preserves every original colour. */
  colorMap: Record<string, ColorRole>
  /** Optional explicit semantics for new/imported assets; known library IDs have a built-in profile. */
  semantic?: import('./lib/semantic/catalog').SemanticProfile
}

export interface Pose {
  x: number
  y: number
  scale: number
  rotation: number
}

export interface PlacedObject extends Pose {
  id: string
  assetId: string
  role: ObjectRole
  z: number
}

export interface Palette {
  id: PaletteId
  name: string
  background: string
  primary: string
  accent: string
  accent2: string
  accent3: string
  shade: string
  stroke: string
  backdrop: string
}
