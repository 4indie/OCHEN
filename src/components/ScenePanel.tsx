import { palettes, useStudio } from '../store'
import type { Asset, PlacedObject } from '../types'

const controls = [
  { key: 'x', label: 'По X', min: 0, max: 100, step: 1 },
  { key: 'y', label: 'По Y', min: 0, max: 100, step: 1 },
  { key: 'scale', label: 'Масштаб', min: .1, max: 1.4, step: .01 },
  { key: 'rotation', label: 'Поворот', min: -180, max: 180, step: 1 },
] as const

function Inspector({ object, asset }: { object: PlacedObject; asset: Asset }) {
  const patchObject = useStudio(state => state.patchObject)
  const removeObject = useStudio(state => state.removeObject)

  return (
    <div className="inspector">
      <strong>{asset.name}</strong>
      <span className="inspector-role">{object.role === 'main' ? 'Главный' : 'Фоновый'} объект</span>
      {controls.map(({ key, label, min, max, step }) => {
        const value = object[key]
        const displayValue = key === 'scale' ? `${Math.round(value * 100)}%` : `${Math.round(value)}${key === 'rotation' ? '°' : ''}`
        return (
          <label className="range" key={key}>
            <span>{label}<b>{displayValue}</b></span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={event => patchObject(object.id, { [key]: event.target.valueAsNumber })}
            />
          </label>
        )
      })}
      <button className="danger" type="button" onClick={() => removeObject(object.id)}>Убрать со сцены</button>
    </div>
  )
}

export function ScenePanel({ libraryWarnings }: { libraryWarnings: string[] }) {
  const { assets, scene, paletteId, selectedId, selection, select, setPalette, generate } = useStudio()
  const selected = scene.find(object => object.id === selectedId)
  const selectedAsset = assets.find(asset => asset.id === selected?.assetId)
  const warnings = [...libraryWarnings, ...(selection?.warnings ?? [])]

  return (
    <aside className="right-panel" aria-label="Палитра и сцена">
      <h2 className="panel-title">03 / Цветовая гамма</h2>
      <div className="palette-list">
        {palettes.map(palette => (
          <button
            type="button"
            key={palette.id}
            className={`palette ${paletteId === palette.id ? 'selected' : ''}`}
            aria-label={palette.name}
            aria-pressed={paletteId === palette.id}
            title={palette.name}
            onClick={() => setPalette(palette.id)}
          >
            {[palette.primary, palette.accent, palette.shade].map((color, index) => <i key={index} style={{ background: color }} />)}
          </button>
        ))}
      </div>
      <div className="rule" />
      <h2 className="panel-title">04 / {selectedAsset ? 'Параметры объекта' : 'Объекты в кадре'}</h2>
      {selected && selectedAsset ? <Inspector object={selected} asset={selectedAsset} /> : (
        <div className="layer-list">
          {scene.length ? [...scene].sort((a, b) => b.z - a.z).map(object => (
            <button className="layer" type="button" key={object.id} onClick={() => select(object.id)}>
              <span className={`asset-dot ${object.role}`} />
              {assets.find(asset => asset.id === object.assetId)?.name}
            </button>
          )) : <p className="empty-note">После сборки здесь появятся слои и тонкая настройка каждого объекта.</p>}
        </div>
      )}
      <div className="generation-actions">
        <button type="button" className="generate" disabled={!assets.length} onClick={generate}>
          {assets.length ? 'Собрать композицию ↗' : 'Сначала добавь SVG'}
        </button>
        {warnings.length > 0 && <p className="microcopy" role="status">{warnings.join(' ')}</p>}
      </div>
      <footer className="author-credit">Разработано Артёмом Черным</footer>
    </aside>
  )
}
