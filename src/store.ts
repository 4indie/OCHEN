import { create } from 'zustand'
import { compose } from './lib/composer.js'
import { selectObjects } from './lib/semantic/index.js'
import { frameTransform } from './lib/frame.js'
import { palettes } from './lib/figma-palettes.js'
import type { FrameTransform } from './lib/frame'
import type { SelectionResult } from './lib/semantic/index'
import type { Alignment, Asset, Detail, InputMode, PaletteId, PlacedObject } from './types'

export { palettes }

type Studio = {
  assets: Asset[]
  scene: PlacedObject[]
  selection?: SelectionResult
  selectedId?: string
  prompt: string
  mode: InputMode
  detail: Detail
  paletteId: PaletteId
  generation: number
  alignment: Alignment
  frame: FrameTransform
  addAssets: (assets: Asset[]) => void
  setPrompt: (prompt: string) => void
  setMode: (mode: InputMode) => void
  setDetail: (detail: Detail) => void
  setPalette: (id: PaletteId) => void
  setAlignment: (alignment: Alignment) => void
  generate: () => void
  select: (id?: string) => void
  patchObject: (id: string, patch: Partial<PlacedObject>) => void
  removeObject: (id: string) => void
}

export const useStudio = create<Studio>((set, get) => ({
  assets: [],
  scene: [],
  prompt: 'Музыка и концентрация',
  mode: 'metaphor',
  detail: 'rich',
  paletteId: 'violet',
  generation: 0,
  alignment: 'center',
  frame: { x: 0, y: 0, scale: 1 },

  addAssets: assets => set(state => ({ assets: [...state.assets, ...assets] })),
  setPrompt: prompt => set({ prompt }),
  setMode: mode => set({ mode }),
  setDetail: detail => set({ detail }),
  setPalette: paletteId => set({ paletteId }),
  setAlignment: alignment => set(state => ({
    alignment,
    frame: frameTransform(state.scene, state.assets, alignment),
  })),
  generate: () => {
    const state = get()
    const generation = state.generation + 1
    const selection = selectObjects(state.assets, state.prompt, { mode: state.mode, detail: state.detail })
    const scene = compose(state.assets, state.prompt, state.mode, state.detail, generation, selection)
    set({
      scene,
      selection,
      selectedId: scene.at(-1)?.id,
      generation,
      frame: frameTransform(scene, state.assets, state.alignment),
    })
  },
  select: selectedId => set({ selectedId }),
  patchObject: (id, patch) => set(state => ({
    scene: state.scene.map(object => object.id === id ? { ...object, ...patch } : object),
  })),
  removeObject: id => set(state => ({
    scene: state.scene.filter(object => object.id !== id),
    selectedId: state.selectedId === id ? undefined : state.selectedId,
  })),
}))
