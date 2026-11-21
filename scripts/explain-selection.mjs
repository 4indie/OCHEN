import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'

const result = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.test.json'], { stdio: 'inherit' })
if (result.status !== 0) process.exit(result.status ?? 1)
const { createSemanticIndex } = await import('../work/test-build/lib/semantic/index.js')
const manifest = JSON.parse(await readFile(new URL('../public/library/manifest.json', import.meta.url), 'utf8'))
const assets = await Promise.all(manifest.map(async entry => {
  const source = await readFile(new URL(`../public${entry.url}`, import.meta.url), 'utf8').catch(() => '')
  return { ...entry, source, colorMap: {} }
}))
const start = performance.now()
const index = createSemanticIndex(assets)
const indexMs = performance.now() - start
const args = process.argv.slice(2)
const mode = args.includes('--components') ? 'components' : 'metaphor'
const detail = args.includes('--minimal') ? 'minimal' : 'rich'
const query = args.filter(arg => !arg.startsWith('--')).join(' ') || 'Дистанционное образование'
const queryStart = performance.now()
const selection = index.select(query, { mode, detail })
console.log(JSON.stringify({ query, mode, detail, indexMs, queryMs: performance.now() - queryStart, ...selection }, null, 2))
