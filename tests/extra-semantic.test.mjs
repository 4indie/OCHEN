import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createSemanticIndex } from '../work/test-build/lib/semantic/index.js'

test('imported SVG tags work without a built-in catalogue entry', () => {
  const assets = [{ id: 'custom', name: 'Лист', source: '<path d="M0 0H10V10Z"/>', viewBox: '0 0 10 10', role: 'main', detail: 'rich', tags: ['бухгалтерия'], colorMap: {} }]
  const result = createSemanticIndex(assets).select('бухгалтерия', { mode: 'metaphor', detail: 'rich' })
  assert.deepEqual(result.selectedObjects.map(a => a.id), ['custom'])
  assert.match(result.selectedObjects[0].reason, /Тег импортированного/)
})
