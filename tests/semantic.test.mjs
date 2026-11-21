import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createSemanticIndex } from '../work/test-build/lib/semantic/index.js'
import { semanticCases } from './semantic-cases.mjs'

const project = new URL('../', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('public/library/manifest.json', project), 'utf8'))
const assets = await Promise.all(manifest.map(async (entry) => ({
  ...entry,
  source: await readFile(new URL(`public${entry.url}`, project), 'utf8'),
  colorMap: {},
})))
const index = createSemanticIndex(assets)
const options = { mode: 'metaphor', detail: 'rich' }
const ids = (result) => result.selectedObjects.map((object) => object.canonicalId)
const evaluate = (fixture) => index.select(fixture.prompt, { ...options, mode: fixture.mode ?? options.mode })

for (const fixture of semanticCases) {
  test(`relevance: ${fixture.mode ?? 'metaphor'} / ${fixture.prompt || '<empty>'}`, () => {
    const result = evaluate(fixture)
    const actual = ids(result)
    for (const id of fixture.required) assert.ok(actual.includes(id), `${id} must be selected; got ${actual.join(', ')}`)
    for (const id of actual) assert.ok(fixture.allowed.includes(id), `${id} is unrelated to ${fixture.prompt}`)
    if (fixture.warning) assert.ok(result.warnings.length > 0, 'Expected an actionable warning')
    assert.equal(new Set(actual).size, actual.length, 'Visual echoes must not duplicate an object')
    assert.ok(result.confidence >= 0 && result.confidence <= 1)
    assert.ok(actual.length <= 6)
    assert.equal(result.selectedObjects.filter((object) => object.role === 'main').length, actual.length ? 1 : 0)
    for (const object of result.selectedObjects) {
      assert.ok(assets.some((asset) => asset.id === object.id), 'Selected SVG id must actually exist')
      assert.ok(object.reason.length > 0, 'Every selected object needs an explanation')
      assert.ok(Number.isFinite(object.relevance))
    }
  })
}

test('selection is deterministic, including ties and a reversed manifest', () => {
  const prompt = 'книга, телефон, наушники'
  const first = index.select(prompt, options)
  assert.deepEqual(index.select(prompt, options), first)
  const reordered = createSemanticIndex([...assets].reverse()).select(prompt, options)
  assert.deepEqual(reordered.selectedObjects, first.selectedObjects)
})

test('all named objects remain mandatory, with input order defining the primary in list mode', () => {
  const result = index.select('монета, книга, наушники', { mode: 'components', detail: 'rich' })
  assert.deepEqual(new Set(ids(result)), new Set(['coin', 'book', 'headphones']))
  assert.equal(result.selectedObjects.find((object) => object.role === 'main')?.canonicalId, 'coin')
  assert.ok(result.selectedObjects.every((object) => object.required))
})

test('capacity truncation is explicit and preserves the user list priority', () => {
  const result = index.select('книга, телефон, наушники, лампа, папка, кошелек, монета', { mode: 'components', detail: 'minimal' })
  assert.equal(result.selectedObjects.length, 4)
  assert.deepEqual(new Set(ids(result)), new Set(['book', 'phone', 'headphones', 'lamp']))
  assert.ok(result.warnings.length > 0)
})

test('maxObjects is respected without filling weak matches', () => {
  const limited = index.select('книга, телефон, наушники', { ...options, maxObjects: 2 })
  assert.equal(limited.selectedObjects.length, 2)
  assert.ok(limited.warnings.length > 0)
  const one = index.select('наушники', options)
  assert.deepEqual(ids(one), ['headphones'])
})

test('an entirely absent requested resource gives a warning and retains the other explicit object', () => {
  const reduced = assets.filter((asset) => asset.canonicalId !== 'phone')
  const result = createSemanticIndex(reduced).select('книга, телефон', { mode: 'components', detail: 'rich' })
  assert.deepEqual(ids(result), ['book'])
  assert.ok(result.warnings.length > 0)
})

test('broken SVG resource cannot be selected as a usable asset', () => {
  const reduced = assets.map((asset) => asset.canonicalId === 'phone' ? { ...asset, source: '' } : asset)
  const result = createSemanticIndex(reduced).select('телефон', options)
  assert.deepEqual(ids(result), [])
  assert.ok(result.warnings.length > 0)
})

test('invalid viewport dimensions are excluded', () => {
  const broken = assets.map((asset) => asset.canonicalId === 'book' ? { ...asset, viewBox: '0 0 0 NaN' } : asset)
  const result = createSemanticIndex(broken).select('книга', options)
  assert.deepEqual(ids(result), [])
  assert.ok(result.warnings.length > 0)
})

test('strict variant requests do not invent an unavailable SVG detail version', () => {
  const richBook = assets.filter((asset) => asset.id === 'book')
  const result = createSemanticIndex(richBook).select('книга', { ...options, detail: 'minimal', strictVariants: true })
  assert.deepEqual(ids(result), [])
  assert.ok(result.warnings.length > 0)
})

test('empty libraries refuse safely', () => {
  const result = createSemanticIndex([]).select('книга', options)
  assert.deepEqual(ids(result), [])
  assert.ok(result.warnings.length > 0)
})

test('negative themes cannot leak through graph expansion', () => {
  const result = index.select('образование без технологий и музыки', options)
  assert.ok(ids(result).includes('book'))
  assert.ok(!ids(result).includes('phone'))
  assert.ok(!ids(result).includes('headphones'))
})

test('a background-only profile cannot be silently promoted to main', () => {
  const decoration = {
    ...assets.find((asset) => asset.id === 'pen'),
    id: 'decoration', name: 'Декор', role: 'background', tags: ['декор'],
    semantic: {
      id: 'decoration', category: 'decoration', names: { ru: ['декор'], en: ['decoration'] },
      concepts: {}, metaphors: [], roles: ['background'],
    },
  }
  const result = createSemanticIndex([decoration]).select('декор', { mode: 'components', detail: 'rich' })
  assert.ok(!result.selectedObjects.some((object) => object.canonicalId === 'decoration' && object.role === 'main'))
  assert.ok(result.warnings.length > 0, 'A requested scene without a permitted primary requires an explanation')
})

test('a background-only mandatory item stays secondary even when requested first', () => {
  const decoration = {
    ...assets.find((asset) => asset.id === 'pen'),
    id: 'decoration', name: 'Декор', role: 'background', tags: ['декор'],
    semantic: {
      id: 'decoration', category: 'decoration', names: { ru: ['декор'], en: ['decoration'] },
      concepts: {}, metaphors: [], roles: ['background'],
    },
  }
  const result = createSemanticIndex([...assets, decoration]).select('декор, книга', { mode: 'components', detail: 'rich' })
  assert.deepEqual(new Set(ids(result)), new Set(['decoration', 'book']))
  assert.equal(result.selectedObjects.find((object) => object.canonicalId === 'decoration')?.role, 'background')
  assert.equal(result.selectedObjects.find((object) => object.canonicalId === 'book')?.role, 'main')
})

test('diagnostics expose candidate scores and reasons for selection and rejection', () => {
  const result = index.select('музыка без телефона', options)
  assert.ok(result.diagnostics.query)
  assert.ok(result.diagnostics.candidates.length >= 10)
  for (const candidate of result.diagnostics.candidates) {
    assert.equal(typeof candidate.id, 'string')
    assert.equal(typeof candidate.selected, 'boolean')
    assert.ok(Number.isFinite(candidate.score))
    assert.ok(candidate.reasons.length > 0)
  }
})

test('distance learning adds lesson audio as context only in rich detail', () => {
  const theme = 'Дистанционное образование'
  const rich = index.select(theme, options)
  const audio = rich.selectedObjects.find(a => a.canonicalId === 'headphones')
  assert.equal(audio?.role, 'background')
  assert.equal(audio.required, false)
  assert.match(audio.reason, /аудио онлайн-урока/)
  assert.deepEqual(ids(index.select(theme, { ...options, detail: 'minimal' })), ['book', 'phone'])
  assert.equal(index.select(theme, { ...options, maxObjects: 2 }).selectedObjects.length, 2)
})

test('thematic background needs a visible anchor and an available SVG', () => {
  assert.deepEqual(ids(index.select('Чтение без книги', options)), [])
  const withoutLamp = createSemanticIndex(assets.filter(a => a.canonicalId !== 'lamp'))
  assert.deepEqual(ids(withoutLamp.select('Вечернее чтение', options)), ['book'])
})

test('measured fixture precision and required-set recall', (context) => {
  let predicted = 0
  let acceptablePredictions = 0
  let required = 0
  let retrievedRequired = 0
  let expectedRefusals = 0
  let correctRefusals = 0
  for (const fixture of semanticCases) {
    const actual = ids(evaluate(fixture))
    predicted += actual.length
    acceptablePredictions += actual.filter((id) => fixture.allowed.includes(id)).length
    required += fixture.required.length
    retrievedRequired += fixture.required.filter((id) => actual.includes(id)).length
    if (!fixture.allowed.length) {
      expectedRefusals += 1
      if (!actual.length) correctRefusals += 1
    }
  }
  const metrics = {
    scenarios: semanticCases.length,
    predictedObjects: predicted,
    precisionAtSelectedK: predicted ? acceptablePredictions / predicted : 0,
    requiredSetRecall: required ? retrievedRequired / required : 0,
    refusalAccuracy: expectedRefusals ? correctRefusals / expectedRefusals : 0,
  }
  context.diagnostic(JSON.stringify(metrics))
  assert.equal(acceptablePredictions, predicted, 'Acceptance fixtures must not contain irrelevant results')
  assert.equal(retrievedRequired, required, 'All minimum relevant sets must be covered')
  assert.equal(correctRefusals, expectedRefusals, 'Unsupported requests must refuse')
})
