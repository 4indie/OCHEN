import type { Asset, Detail, InputMode, PlacedObject, Pose } from '../types'
import { relationLayout, relationRules } from './relations.js'
import { selectObjects } from './semantic/index.js'
import type { SelectionResult } from './semantic/index'
import { normalize, tokenize } from './semantic/language.js'

const hash = (value: string) => [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 17)
const rand = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)

// A compact editorial still life: one anchor, a counterweight, two overlaps,
// and a small diagonal accent. Unlike corner decoration, objects can touch.
const arrangements: { hero: Pose; supports: Pose[] }[] = [
  {
    hero: { x: 53, y: 55, scale: .43, rotation: -3 },
    supports: [
      { x: 24, y: 55, scale: .30, rotation: -5 },
      { x: 80, y: 32, scale: .28, rotation: 4 },
      { x: 76, y: 74, scale: .21, rotation: 14 },
      { x: 34, y: 38, scale: .19, rotation: -10 },
      { x: 20, y: 77, scale: .13, rotation: 8 },
    ],
  },
  {
    hero: { x: 55, y: 50, scale: .45, rotation: 3 },
    supports: [
      { x: 78, y: 55, scale: .31, rotation: 6 },
      { x: 25, y: 31, scale: .27, rotation: -3 },
      { x: 25, y: 74, scale: .22, rotation: -14 },
      { x: 79, y: 27, scale: .17, rotation: 10 },
      { x: 80, y: 79, scale: .12, rotation: -8 },
    ],
  },
  {
    hero: { x: 47, y: 57, scale: .44, rotation: -5 },
    supports: [
      { x: 72, y: 52, scale: .32, rotation: 4 },
      { x: 25, y: 28, scale: .26, rotation: -2 },
      { x: 78, y: 26, scale: .20, rotation: 12 },
      { x: 25, y: 77, scale: .17, rotation: -12 },
      { x: 84, y: 77, scale: .12, rotation: 8 },
    ],
  },
]

function vary(pose: Pose, random: () => number): Pose {
  return {
    x: pose.x + (random() - .5) * 2.5,
    y: pose.y + (random() - .5) * 2.5,
    scale: pose.scale * (.95 + random() * .10),
    rotation: pose.rotation + (random() - .5) * 4,
  }
}

function relationForSelection(selection: SelectionResult, prompt: string, generation: number) {
  // Pair layouts position the chosen objects without changing the selection.
  if (selection.selectedObjects.length !== 2) return undefined
  const [firstObject, secondObject] = selection.selectedObjects
  const positiveWords = tokenize(prompt).filter(token => !token.negative).map(token => token.raw)
  const directions = [[firstObject, secondObject], [secondObject, firstObject]] as const
  const matches = directions.flatMap(([source, target]) =>
    relationRules(source.canonicalId).flatMap(([verbs, targetId]) => {
      if (targetId !== target.canonicalId) return []
      const staging = source.staging
      const contextual = staging?.anchorId === targetId && verbs.includes(staging.verb)
      const mentioned = verbs.some(verb => positiveWords.some(word => word.startsWith(normalize(verb))))
      return contextual || mentioned ? [{ source, target, verbs, contextual }] : []
    }),
  )

  // Generation chooses a pose variant after the matching relation is resolved.
  const [first] = matches.sort((a, b) =>
    Number(b.contextual) - Number(a.contextual)
    || a.source.id.localeCompare(b.source.id, 'en')
    || a.target.id.localeCompare(b.target.id, 'en')
    || a.verbs.join().localeCompare(b.verbs.join(), 'en'),
  )
  if (!first) return undefined
  return {
    sourceId: first.source.id,
    targetId: first.target.id,
    ...relationLayout(first.source.canonicalId, first.target.canonicalId, hash(`${prompt}:${generation}`)),
  }
}

export function compose(
  assets: Asset[],
  prompt: string,
  mode: InputMode,
  detail: Detail,
  generation = 0,
  selection = selectObjects(assets, prompt, { mode, detail }),
): PlacedObject[] {
  const chosen = selection.selectedObjects
  const hero = chosen.find(item => item.role === 'main')
  if (!hero) return []
  const supports = chosen.filter(item => item !== hero)
  const random = rand(hash(`${prompt}:${generation}:${chosen.map(item => item.id).join(':')}`))
  const relation = relationForSelection(selection, prompt, generation)
  const arrangement = arrangements[Math.floor(random() * arrangements.length)]
  const poseFor = (id: string, fallback: Pose) => {
    if (id === relation?.sourceId) return relation.sourcePose
    if (id === relation?.targetId) return relation.targetPose
    return fallback
  }
  const placedHero: PlacedObject = {
    id: crypto.randomUUID(),
    assetId: hero.id,
    role: hero.role,
    z: 10,
    ...vary(poseFor(hero.id, arrangement.hero), random),
  }
  const placedSupports = supports.map((item, index): PlacedObject => ({
    id: crypto.randomUUID(),
    assetId: item.id,
    role: item.role,
    z: index + 1,
    ...vary(poseFor(item.id, arrangement.supports[index]), random),
  }))
  return [...placedSupports, placedHero]
}
