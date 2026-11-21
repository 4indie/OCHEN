import { useMemo } from 'react'
import { renderScene } from '../lib/render-scene'
import { palettes, useStudio } from '../store'

export function sceneSvg() {
  const state = useStudio.getState()
  return renderScene(state.scene, state.assets, palettes.find(item => item.id === state.paletteId)!, state.frame)
}

export function Canvas() {
  const scene = useStudio((state) => state.scene)
  const selectedId = useStudio((state) => state.selectedId)
  const select = useStudio((state) => state.select)
  const paletteId = useStudio((state) => state.paletteId)
  const assets = useStudio((state) => state.assets)
  const frame = useStudio((state) => state.frame)
  const markup = useMemo(() => renderScene(scene, assets, palettes.find(item => item.id === paletteId)!, frame), [scene, paletteId, assets, frame])
  return (
    <div className="canvas-wrap">
      <div
        className="canvas-frame"
        // renderScene receives bundled artwork or SVG sanitized during import.
        dangerouslySetInnerHTML={{ __html: markup }}
        onClick={event => {
          const target = (event.target as Element).closest('[data-object-id]')
          select(target?.getAttribute('data-object-id') ?? undefined)
        }}
      />
      {scene.length === 0 && (
        <div className="canvas-empty">
          <strong>Здесь появится композиция</strong>
          <span>Введи тему или перечисли объекты.</span>
        </div>
      )}
      {selectedId && <div className="selection-hint">Параметры выбранного объекта справа</div>}
    </div>
  )
}
