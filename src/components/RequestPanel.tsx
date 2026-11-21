import { useMemo } from 'react'
import { groupAssetVersions } from '../lib/library'
import { useStudio } from '../store'
import type { Alignment, Detail, InputMode } from '../types'

const modeOptions = [
  ['metaphor', 'Идея / заголовок'],
  ['components', 'Список объектов'],
] as const satisfies ReadonlyArray<readonly [InputMode, string]>

const detailOptions = [
  ['minimal', 'Минимум'],
  ['rich', 'Больше деталей'],
] as const satisfies ReadonlyArray<readonly [Detail, string]>

const alignmentOptions = [
  ['left', 'Слева'],
  ['center', 'По центру'],
  ['right', 'Справа'],
] as const satisfies ReadonlyArray<readonly [Alignment, string]>

function OptionButtons<T extends string>({ label, options, value, onChange, className = 'segmented' }: {
  label: string
  options: ReadonlyArray<readonly [T, string]>
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={className} role="group" aria-label={label}>
      {options.map(([id, name]) => (
        <button
          key={id}
          type="button"
          className={value === id ? 'active' : ''}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          {name}
        </button>
      ))}
    </div>
  )
}

export function RequestPanel({ importing, onImport }: { importing: boolean; onImport: () => void }) {
  const { assets, mode, detail, alignment, prompt, setMode, setDetail, setAlignment, setPrompt } = useStudio()
  const library = useMemo(() => groupAssetVersions(assets), [assets])
  const metaphor = mode === 'metaphor'

  return (
    <aside className="left-panel" aria-label="Запрос и библиотека">
      <h2 className="panel-title">01 / Запрос</h2>
      <OptionButtons className="mode-switch" label="Режим запроса" options={modeOptions} value={mode} onChange={setMode} />
      <label className="field-label" htmlFor="prompt">
        {metaphor ? 'Что иллюстрация должна сказать?' : 'Какие объекты использовать?'}
      </label>
      <textarea
        id="prompt"
        value={prompt}
        onChange={event => setPrompt(event.target.value)}
        placeholder={metaphor ? 'Например: музыка помогает сосредоточиться' : 'Например: наушники, книга, монета'}
      />
      <p className="input-hint">
        {metaphor ? 'Инструмент выберет подходящий главный объект по смыслу сам.' : 'Перечисли названия через запятую — первый станет главным.'}
      </p>
      <span className="field-label">Детализация сцены</span>
      <OptionButtons label="Детализация сцены" options={detailOptions} value={detail} onChange={setDetail} />
      <span className="field-label">Положение объектов в кадре</span>
      <OptionButtons label="Положение объектов в кадре" options={alignmentOptions} value={alignment} onChange={setAlignment} />
      <p className="microcopy">
        {metaphor ? 'Фоновые объекты подбираются по теме. «Без …» исключает указанный предмет.' : 'В сцену попадут только перечисленные объекты.'}
        {' '}До {detail === 'minimal' ? 4 : 6} объектов в сцене.
      </p>
      <h2 className="library-head"><span>02 / Объекты в базе</span><span>{library.size}</span></h2>
      <ul className="asset-list">
        {[...library].map(([id, variants]) => (
          <li className="asset-row" key={id}>
            <span className={`asset-dot ${variants[0].role}`} />
            <span>{variants[0].name}</span>
            <span className="library-variants">
              {variants.some(asset => asset.role === 'background') && <small>фон</small>}
              {new Set(variants.map(asset => asset.detail)).size > 1 && <small>S / L</small>}
            </span>
          </li>
        ))}
      </ul>
      <button className="asset-empty" type="button" disabled={importing} onClick={onImport}>
        {importing ? 'Импортирую SVG…' : '+ Добавить SVG'}
      </button>
    </aside>
  )
}
