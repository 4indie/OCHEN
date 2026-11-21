import type { Asset, Detail, InputMode, ObjectRole } from '../../types'
import { catalog, concepts } from './catalog.js'
import type { SemanticProfile } from './catalog'
import { matchPhrase, normalize, phraseKeys, tokenize } from './language.js'
import type { PhraseHit } from './language'

export interface SelectionOptions {
  mode: InputMode
  detail: Detail
  maxObjects?: number
  strictVariants?: boolean
}
export interface SelectedObject {
  id: string
  canonicalId: string
  role: ObjectRole
  relevance: number
  reason: string
  required: boolean
  staging?: { anchorId: string; verb: string }
}
export interface SelectionResult {
  selectedObjects: SelectedObject[]
  confidence: number
  warnings: string[]
  diagnostics: {
    query: { normalized: string; required: string[]; excluded: string[]; concepts: Array<{ id: string; weight: number; reason: string }>; unrecognized: string[] }
    candidates: Array<{ id: string; score: number; selected: boolean; reasons: string[] }>
    constraints: string[]
  }
}

type Term = { phrase: string; keys: string[] }
const terms = (values: string[]): Term[] => [...new Set(values.map(normalize))].map(phrase => ({ phrase, keys: phraseKeys(phrase) })).filter(t => t.keys.length)
const conceptIndex = concepts.map(concept => ({ ...concept, terms: terms(concept.terms) }))
const catalogById = new Map(catalog.map(profile => [profile.id, profile]))
const nameOf = (name: string) => normalize(name.replace(/\s+—\s+фон$/, '').replace(/\.svg$/i, ''))
const round = (n: number) => Math.round(n * 1000) / 1000

function validSvg(asset: Asset): boolean {
  const box = asset.viewBox.trim().split(/[ ,]+/).map(Number)
  return box.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0 && /<(path|g|rect|circle|ellipse|polygon|polyline|line|use|text)\b/i.test(asset.source)
}

const ignoredWords = terms([
  'и', 'или', 'а', 'но', 'с', 'со', 'в', 'во', 'на', 'к', 'из', 'для', 'по', 'о', 'об', 'за', 'от', 'до',
  'без', 'не', 'нет', 'только', 'кроме', 'добавь', 'добавить', 'используй', 'использовать', 'используя', 'нужен', 'нужна', 'нужны', 'обязательно', 'пожалуйста', 'нарисуй', 'покажи', 'сделай', 'убери', 'исключи', 'исключить', 'удали', 'оставь', 'хочу',
  'and', 'or', 'but', 'a', 'an', 'the', 'of', 'to', 'for', 'with', 'without', 'no', 'not', 'dont', 'only', 'add', 'include', 'use', 'using', 'remove', 'exclude', 'except', 'please', 'show', 'draw', 'want',
]).flatMap(t => t.keys)
const ignored = new Set(ignoredWords)

/** Build once per library revision. Names, phrases and runtime versions are indexed here. */
export function createSemanticIndex(assets: Asset[]) {
  const profiles = new Map(catalog.map(profile => [profile.id, profile]))
  const variants = new Map<string, Asset[]>()
  for (const asset of assets) {
    const canonicalId = asset.semantic?.id ?? asset.canonicalId ?? asset.id
    if (asset.semantic) profiles.set(canonicalId, asset.semantic)
    if (!profiles.has(canonicalId)) profiles.set(canonicalId, {
      id: canonicalId, category: 'custom', names: { ru: [nameOf(asset.name)], en: [] }, concepts: {}, metaphors: [], roles: ['main', 'background'],
    })
    variants.set(canonicalId, [...(variants.get(canonicalId) ?? []), asset])
  }
  const documents = [...profiles.values()].map(profile => ({
    profile, names: terms([...profile.names.ru, ...profile.names.en, ...(variants.get(profile.id) ?? []).map(a => nameOf(a.name))]),
    excludedPhrases: terms(profile.excludedPhrases ?? []),
    variants: (variants.get(profile.id) ?? []).filter(validSvg).sort((a, b) => a.id.localeCompare(b.id, 'en')),
    tagTerms: terms((variants.get(profile.id) ?? []).flatMap(asset => asset.tags)),
  })).sort((a, b) => a.profile.id.localeCompare(b.profile.id, 'en'))

  function select(prompt: string, options: SelectionOptions): SelectionResult {
    const tokens = tokenize(prompt)
    const warnings: string[] = []
    const constraints: string[] = []
    const limit = Math.min(options.detail === 'minimal' ? 4 : 6, Math.max(1, Math.floor(Number.isFinite(options.maxObjects) ? options.maxObjects! : 6)))
    const hits = (list: Term[]) => list.flatMap(t => matchPhrase(tokens, t.keys, t.phrase))
    const mentions = documents.map(doc => {
      const incompatible = hits(doc.excludedPhrases)
      if (incompatible.some(h => !h.negative)) warnings.push(`«${incompatible[0].phrase}» — другой предмет: подходящего SVG в библиотеке нет.`)
      return { doc, hits: hits(doc.names).filter(h => !incompatible.some(b => h.start >= b.start && h.end <= b.end)) }
    })
    // Prefer exact, longer literal names over a weaker fuzzy collision.
    const bestAt = new Map<number, number>()
    for (const { hits: found } of mentions) for (const hit of found) {
      const quality = hit.quality + (hit.end - hit.start) * .01
      for (let i = hit.start; i < hit.end; i++) bestAt.set(i, Math.max(bestAt.get(i) ?? 0, quality))
    }
    const literalTokens = new Set<number>()
    const explicit = new Map<string, PhraseHit>()
    const excluded = new Set<string>()
    for (const mention of mentions) {
      for (const hit of mention.hits) {
        if ((bestAt.get(hit.start) ?? 0) > hit.quality + (hit.end - hit.start) * .01) continue
        for (let i = hit.start; i < hit.end; i++) literalTokens.add(i)
        if (hit.negative) excluded.add(mention.doc.profile.id)
        else if (!explicit.has(mention.doc.profile.id) || explicit.get(mention.doc.profile.id)!.start > hit.start) explicit.set(mention.doc.profile.id, hit)
      }
    }
    for (const id of excluded) if (explicit.has(id)) warnings.push(`Противоречие: «${profiles.get(id)!.names.ru[0]}» запрошен и запрещён. Исключение имеет приоритет.`)
    const queryConcepts = new Map<string, { weight: number; reason: string }>()
    const negativeConcepts = new Set<string>()
    const conceptTokens = new Set<number>()
    const conceptHits = conceptIndex.map(concept => ({ concept, hits: hits(concept.terms) }))
    const exactConceptTokens = new Set(conceptHits.flatMap(c => c.hits.filter(h => h.quality === 1).flatMap(h => Array.from({ length: h.end - h.start }, (_, i) => h.start + i))))
    const protectedWords = new Set(['работа', 'работу', 'работы', 'дом', 'дома', 'красота', 'красоты', 'слово', 'слова'])
    for (const { concept, hits: found } of conceptHits) {
      for (const hit of found) {
        if (hit.quality < 1 && tokens.slice(hit.start, hit.end).some(t => exactConceptTokens.has(t.position) || literalTokens.has(t.position) || protectedWords.has(t.raw))) continue
        for (let i = hit.start; i < hit.end; i++) conceptTokens.add(i)
        if (hit.negative) { negativeConcepts.add(concept.id); continue }
        // Literal nouns are mandatory entities, not an invitation to add every related prop.
        if (Array.from({ length: hit.end - hit.start }, (_, i) => hit.start + i).every(i => literalTokens.has(i))) continue
        if ((queryConcepts.get(concept.id)?.weight ?? 0) < hit.quality) queryConcepts.set(concept.id, { weight: hit.quality, reason: `Понятие «${concept.label}»: ${hit.phrase}` })
      }
    }
    for (const id of negativeConcepts) queryConcepts.delete(id)
    const directConcepts = new Map(queryConcepts)
    // Single-hop expansion only. A weak neighbour cannot meet the admission threshold alone.
    for (const [id, evidence] of [...queryConcepts]) for (const related of concepts.find(c => c.id === id)?.related ?? []) {
      if (negativeConcepts.has(related.id)) continue
      const weight = evidence.weight * Math.min(.5, related.weight)
      if (weight > (queryConcepts.get(related.id)?.weight ?? 0)) queryConcepts.set(related.id, { weight, reason: `Связано с понятием «${id}»` })
    }

    const unrecognized = tokens.filter(t => !t.negative && !literalTokens.has(t.position) && !conceptTokens.has(t.position) && !ignored.has(t.key)).map(t => t.raw)
    const requiredIds = [...explicit].filter(([id]) => !excluded.has(id)).sort((a, b) => a[1].start - b[1].start || a[0].localeCompare(b[0], 'en')).map(([id]) => id)
    const explicitOnly = options.mode === 'components' || (explicit.size > 0 && !queryConcepts.size)
    if (options.mode === 'components' && unrecognized.length) warnings.push(`Не найдены названия объектов: ${[...new Set(unrecognized)].join(', ')}.`)
    else if (/\b(add|include|use)\b|добав|обязатель|использ/iu.test(prompt) && unrecognized.length && !queryConcepts.size) warnings.push(`Не распознана часть запроса: ${[...new Set(unrecognized)].join(', ')}.`)
    else {
      const requestedUnknown = tokens.filter(t => unrecognized.includes(t.raw) && /^(с|со|with|добавь|добавить|add|include|обязательно|и|and)$/.test(tokens[t.position - 1]?.raw ?? ''))
      if (requestedUnknown.length) warnings.push(`Не удалось сопоставить с библиотекой: ${requestedUnknown.map(t => t.raw).join(', ')}.`)
    }
    if (requiredIds.length > limit) warnings.push(`Запрошено ${requiredIds.length} объектов, в этом режиме помещается ${limit}. Сохранены первые доступные по порядку запроса.`)

    const candidates = documents.map(doc => {
      const id = doc.profile.id
      const required = requiredIds.includes(id)
      const reasons: string[] = []
      const evidence = [...queryConcepts].map(([concept, query]) => ({ concept, value: query.weight * (doc.profile.concepts[concept] ?? 0), reason: query.reason })).filter(e => e.value > 0)
      const strongest = Math.max(0, ...evidence.map(e => e.value))
      let score = strongest * .85 + Math.min(.15, evidence.reduce((n, e) => n + e.value, 0) * .075)
      if (required) { score = explicit.get(id)!.quality; reasons.push(`Обязательный объект: «${explicit.get(id)!.phrase}»${score < 1 ? ' (опечатка)' : ''}`) }
      else for (const item of evidence) reasons.push(`${item.reason}; соответствие ${round(item.value)}`)
      // Custom SVG tags provide literal metadata evidence without inventing metaphors.
      const tagHit = !catalogById.has(id) ? hits(doc.tagTerms).find(h => !h.negative) : undefined
      if (tagHit && !required) { score = Math.max(score, .7 * tagHit.quality); reasons.push(`Тег импортированного SVG: «${tagHit.phrase}»`) }
      const thematicExclusion = [...negativeConcepts].some(c => (doc.profile.concepts[c] ?? 0) >= .75)
      let eligible = required || (!explicitOnly && (strongest >= .6 || Boolean(tagHit)))
      const forbidden = excluded.has(id) || (thematicExclusion && !required)
      const available = doc.variants.some(a => !options.strictVariants || a.detail === options.detail)
      if (forbidden) { eligible = false; reasons.push('Исключён отрицанием') }
      if (!doc.variants.length) { reasons.push('Нет доступного корректного SVG'); if (required) warnings.push(`SVG для «${doc.profile.names.ru[0]}» отсутствует или не загрузился.`) }
      else if (!available) { reasons.push('Нет запрошенной версии SVG'); if (required) warnings.push(`Нет SVG «${doc.profile.names.ru[0]}» с запрошенной детализацией.`) }
      if (!required && strongest < .6 && !tagHit) reasons.push('Недостаточно прямых смысловых оснований')
      if (explicitOnly && !required) reasons.push('Не указан в явном списке')
      return { doc, id, required, score: round(score), evidence, reasons, eligible: eligible && available, available, forbidden }
    })

    type Candidate = typeof candidates[number]
    const selected: Candidate[] = []
    for (const id of requiredIds) {
      const candidate = candidates.find(c => c.id === id)!
      if (candidate.eligible && selected.length < limit) selected.push(candidate)
    }
    const covered = new Set(selected.flatMap(c => c.evidence.filter(e => e.value >= .6).map(e => e.concept)))
    while (!explicitOnly && selected.length < limit) {
      const ranked = candidates.filter(c => c.eligible && !selected.includes(c)).map(c => {
        const novelty = c.evidence.filter(e => e.value >= .6 && !covered.has(e.concept)).length
        const redundancy = selected.some(s => s.doc.profile.category === c.doc.profile.category) ? .13 : 0
        const compatibility = selected.some(s => s.doc.profile.relatedObjects?.includes(c.id) || c.doc.profile.relatedObjects?.includes(s.id)) ? .04 : 0
        return { c, novelty, utility: c.score + Math.min(.18, novelty * .12) + compatibility - redundancy }
      }).sort((a, b) => b.utility - a.utility || a.c.id.localeCompare(b.c.id, 'en'))
      const next = ranked.find(({ c, novelty, utility }) => utility >= .55 && (!selected.length || novelty > 0 || (c.score >= .78 && selected.length < 2)))
      if (!next) break
      next.c.reasons.push(`Выбран в набор: полезность ${round(next.utility)}, новых понятий ${next.novelty}`)
      selected.push(next.c)
      next.c.evidence.filter(e => e.value >= .6).forEach(e => covered.add(e.concept))
    }
    // Roles belong to the visual catalogue, not to whichever version happened to load.
    const mainIndex = selected.findIndex(c => c.doc.profile.roles.includes('main'))
    if (mainIndex === -1 && selected.length) {
      warnings.push('У выбранных объектов нет допустимой главной роли. Добавьте главный объект.')
      selected.forEach(c => c.reasons.push('Нет объекта с главной ролью')); selected.length = 0
    } else if (mainIndex > 0) {
      const [main] = selected.splice(mainIndex, 1); selected.unshift(main)
      constraints.push('Главным выбран первый объект с допустимой главной ролью')
    }
    for (let i = selected.length - 1; i > 0; i--) if (!selected[i].doc.profile.roles.includes('background')) {
      warnings.push(`«${selected[i].doc.profile.names.ru[0]}» не допускает фоновую роль.`)
      selected[i].reasons.push('Фоновая роль недопустима'); selected.splice(i, 1)
    }

    // Add a supporting object only when the prompt actually requests its context
    // and an already-selected object can give that prop a visible purpose.
    const contextual = new Map<string, { score: number; reason: string; staging?: SelectedObject['staging'] }>()
    if (options.mode === 'metaphor' && selected.length) {
      const anchors = new Set(selected.map(c => c.id))
      const supplements = candidates.flatMap(candidate => {
        if (anchors.has(candidate.id) || candidate.forbidden || !candidate.available || !candidate.doc.profile.roles.includes('background')) return []
        return (candidate.doc.profile.backgroundUses ?? []).flatMap(use => {
          const evidence = directConcepts.get(use.concept)
          const anchorId = use.anchors.find(id => anchors.has(id))
          if (!evidence || !anchorId || (use.richOnly && options.detail !== 'rich') || use.unless?.some(id => directConcepts.has(id))) return []
          const reason = `Фон по теме «${conceptIndex.find(c => c.id === use.concept)?.label ?? use.concept}»: ${use.purpose}`
          const staging = use.stagingVerb ? { anchorId, verb: use.stagingVerb } : undefined
          return [{ candidate, reason, staging, score: round(evidence.weight * .72) }]
        })
      }).sort((a, b) => b.score - a.score || a.candidate.id.localeCompare(b.candidate.id, 'en'))

      const budget = options.detail === 'rich' ? 2 : 1
      for (const { candidate, ...support } of supplements) {
        if (selected.length >= limit || contextual.size >= budget) break
        if (contextual.has(candidate.id)) continue
        contextual.set(candidate.id, support)
        selected.push(candidate)
      }
    }
    for (const c of candidates) if (c.eligible && !selected.includes(c)) c.reasons.push(selected.length >= limit ? 'Достигнут лимит объектов' : 'Не добавляет достаточной смысловой ценности набору')

    const selectedObjects: SelectedObject[] = selected.map((candidate, i) => {
      const role: ObjectRole = i === 0 ? 'main' : 'background'
      const support = contextual.get(candidate.id)
      const versions = candidate.doc.variants.filter(a => !options.strictVariants || a.detail === options.detail)
      const asset = [...versions].sort((a, b) => (Number(b.role === role) * 2 + Number(b.detail === options.detail)) - (Number(a.role === role) * 2 + Number(a.detail === options.detail)) || a.id.localeCompare(b.id, 'en'))[0]
      if (!versions.some(a => a.detail === options.detail)) constraints.push(`«${candidate.doc.profile.names.ru[0]}»: используется доступная версия ${asset.detail}; ${options.detail} отсутствует`)
      return { id: asset.id, canonicalId: candidate.id, role, relevance: support ? Math.max(support.score, candidate.score) : candidate.score, required: candidate.required, reason: support?.reason ?? candidate.reasons.join('; '), ...(support?.staging ? { staging: support.staging } : {}) }
    })
    if (!selected.length) warnings.push('Не найдено подходящих SVG. Уточните тему или укажите объекты из библиотеки.')
    else if (selected.every(c => !c.required) && selected[0].score < .8) warnings.push('Невысокая уверенность: подобрана ближайшая доступная визуальная метафора.')
    constraints.push(`Лимит ${limit}; уникальные объекты; запрещённые исключены; случайного заполнения нет`)
    return {
      selectedObjects,
      confidence: selected.length ? round(Math.min(...selected.filter(c => !contextual.has(c.id)).map(c => c.score)) * (warnings.length ? .8 : 1)) : 0,
      warnings: [...new Set(warnings)],
      diagnostics: {
        query: { normalized: normalize(prompt), required: requiredIds, excluded: [...excluded], concepts: [...queryConcepts].map(([id, data]) => ({ id, ...data })), unrecognized: [...new Set(unrecognized)] },
        candidates: candidates.map(c => {
          const support = contextual.get(c.id)
          return { id: c.id, score: support ? Math.max(support.score, c.score) : c.score, selected: selected.includes(c), reasons: support ? [...c.reasons, support.reason] : c.reasons }
        }), constraints,
      },
    }
  }
  return { select }
}

const indexCache = new WeakMap<Asset[], ReturnType<typeof createSemanticIndex>>()
export function selectObjects(assets: Asset[], prompt: string, options: SelectionOptions): SelectionResult {
  let index = indexCache.get(assets)
  if (!index) { index = createSemanticIndex(assets); indexCache.set(assets, index) }
  return index.select(prompt, options)
}
