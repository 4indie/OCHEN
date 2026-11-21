import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { createSemanticIndex } from '../work/test-build/lib/semantic/index.js'
import { test } from 'node:test'
import { palettes, useStudio } from '../work/test-build/store.js'
import { compose } from '../work/test-build/lib/composer.js'
import { renderScene } from '../work/test-build/lib/render-scene.js'

const manifest = JSON.parse(await readFile(new URL('../public/library/manifest.json', import.meta.url), 'utf8'))
const assets = await Promise.all(manifest.map(async entry => ({ ...entry, source: await readFile(new URL(`../public${entry.url}`, import.meta.url), 'utf8'), colorMap: {} })))

test('the published library contains only assets reachable in the editor', async () => {
  const files = await readdir(new URL('../public/library/', import.meta.url))
  assert.deepEqual(files.sort(), ['manifest.json', ...manifest.map(entry => entry.url.split('/').at(-1))].sort())
  const index = createSemanticIndex(assets)
  const selectedIds = new Set()
  for (const asset of assets.filter(a => a.role === 'main')) {
    const options = { mode: 'components', detail: asset.detail, strictVariants: true }
    for (const result of [
      index.select(asset.name, options),
      index.select(`${asset.canonicalId === 'book' ? 'Телефон' : 'Книга'}, ${asset.name}`, options),
    ]) {
      result.selectedObjects.forEach(object => selectedIds.add(object.id))
    }
  }
  assert.deepEqual([...selectedIds].sort(), manifest.map(entry => entry.id).sort())
})

test('Zustand generate uses retrieval, and generation changes placement only', () => {
  useStudio.setState({ assets, prompt: 'Дистанционное образование без наушников', mode: 'metaphor', detail: 'rich', generation: 0 })
  useStudio.getState().generate()
  const first = useStudio.getState()
  assert.deepEqual(new Set(first.selection.selectedObjects.map(a => a.canonicalId)), new Set(['book', 'phone']))
  assert.deepEqual(new Set(first.scene.map(a => a.assetId)), new Set(first.selection.selectedObjects.map(a => a.id)))
  useStudio.getState().generate()
  const next = useStudio.getState()
  assert.deepEqual(next.selection, first.selection)
  assert.notDeepEqual(next.scene.map(a => [a.x, a.y]), first.scene.map(a => [a.x, a.y]))
})

test('existing relation placement cannot discard additional explicit objects', () => {
  const scene = compose(assets, 'Лампа освещает книгу, добавь телефон и монету', 'metaphor', 'rich', 1)
  assert.deepEqual(new Set(scene.map(a => assets.find(asset => asset.id === a.assetId).canonicalId)), new Set(['lamp', 'book', 'phone', 'coin']))
  assert.ok(scene.every(a => [a.x, a.y, a.scale, a.rotation].every(Number.isFinite)))
})

test('the reading theme stages the lamp behind and above the book', () => {
  const scene = compose(assets, 'Вечернее чтение', 'metaphor', 'rich')
  const lamp = scene.find(a => a.assetId === 'lamp-echo')
  const book = scene.find(a => a.assetId === 'book')
  assert.equal(scene.length, 2)
  assert.equal(lamp?.role, 'background')
  assert.equal(book?.role, 'main')
  assert.ok(lamp.x < book.x && lamp.y < book.y && lamp.z < book.z)
})

test('the two sizes select actual monochrome backgrounds and original foregrounds', () => {
  for (const [detail, expected] of [['rich', ['lamp-echo', 'book']], ['minimal', ['lamp-s-echo', 'book-s']]]) {
    const scene = compose(assets, 'Вечернее чтение', 'metaphor', detail)
    assert.deepEqual(scene.map(object => object.assetId), expected)
    const lamp = assets.find(asset => asset.id === expected[0])
    assert.match(lamp.source, /#7864D7/)
    assert.doesNotMatch(lamp.source, /#181817/i)
  }
  assert.equal(assets.length, 40)
})

test('alignment moves a scene live and embeds the palette backdrop in the export', () => {
  useStudio.setState({ assets, prompt: 'Вечернее чтение', mode: 'metaphor', detail: 'rich', alignment: 'center' })
  useStudio.getState().generate()
  const { scene, setAlignment } = useStudio.getState()
  const positions = ['left', 'center', 'right'].map(alignment => {
    setAlignment(alignment)
    const { frame } = useStudio.getState()
    assert.equal(useStudio.getState().scene, scene)
    return frame.x + scene.at(-1).x * 12 * frame.scale
  })
  assert.ok(positions[0] < positions[1] && positions[1] < positions[2])
  for (const palette of palettes) {
    const svg = renderScene(scene, assets, palette, useStudio.getState().frame)
    assert.match(svg, /viewBox="0 0 1200 630"/)
    assert.ok(svg.indexOf(`data-figma-backdrop="${palette.id}"`) < svg.indexOf('data-object-id'))
    assert.match(svg, /data-figma-backdrop="[^"]+"[\s\S]+<line/)
  }
})

test('refusal clears previous generated scene, manual editor still works', () => {
  useStudio.setState({ assets, prompt: 'Книга', mode: 'metaphor', detail: 'rich' })
  useStudio.getState().generate()
  const object = useStudio.getState().scene[0]
  useStudio.getState().patchObject(object.id, { x: 25 })
  assert.equal(useStudio.getState().scene[0].x, 25)
  useStudio.getState().setPrompt('ывапыва мвыфыва')
  useStudio.getState().generate()
  assert.deepEqual(useStudio.getState().scene, [])
  assert.ok(useStudio.getState().selection.warnings.length)
})
