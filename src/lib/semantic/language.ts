/** Small, deterministic RU/EN normalizer, not a full morphological parser. */
export function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/ё/g, 'е')
}

const irregular: Record<string, string> = {
  children: 'child', people: 'person', studies: 'study', studying: 'study',
  reading: 'read', writing: 'write', written: 'write', wrote: 'write',
  learning: 'learn', learned: 'learn', listening: 'listen',
  сосредоточиться: 'концентрация', сосредоточение: 'концентрация', сосредоточенности: 'концентрация',
  учиться: 'обучение', учебы: 'учеба',
  денег: 'деньги', деньгами: 'деньги', деньги: 'деньги',
  пишу: 'писать', пишет: 'писать', писать: 'писать',
}

export function stem(raw: string): string {
  let word = normalize(raw)
  word = irregular[word] ?? word
  if (/^[a-z]+$/.test(word)) {
    if (word.length > 5 && word.endsWith('ies')) return word.slice(0, -3) + 'y'
    if (word.length > 4 && word.endsWith('s') && !/(ss|us|is)$/.test(word)) return word.slice(0, -1)
    return word
  }
  if (word.length < 4) return word
  // Long endings first; preserve >=3 letters to avoid tiny accidental matches.
  const suffix = word.match(/(иями|ями|ами|ого|его|ому|ему|ыми|ими|иях|иях|ием|ией|иям|ией|ия|ие|ию|ии|ий|ый|ой|ая|яя|ое|ее|ые|ие|ов|ев|ом|ем|ах|ях|ам|ям|ть|ы|и|а|я|у|ю|е|о|й)$/)?.[0]
  return suffix && word.length - suffix.length >= 3 ? word.slice(0, -suffix.length) : word
}

export type Token = { raw: string; key: string; position: number; negative: boolean; clause: number }
const negativeMarkers = new Set(['без', 'кроме', 'исключая', 'исключи', 'исключить', 'убери', 'удали', 'without', 'except', 'exclude', 'excluding', 'remove', 'no', 'not', 'не', 'dont'])
const positiveMarkers = new Set(['но', 'а', 'but', 'вместо', 'зато', 'добавь', 'добавить', 'add', 'include', 'включи', 'включить', 'оставь', 'используй', 'использовать', 'use', 'с', 'with'])

export function tokenize(text: string): Token[] {
  const words = normalize(text).replace(/don['’]t/g, 'dont').match(/[\p{L}\p{N}]+|[,.;:!?]/gu) ?? []
  let negative = false
  let clause = 0
  let segmentStart = 0
  let postfix = false
  const tokens: Token[] = []
  words.forEach((word, index) => {
    if (/^[.;!?]$/.test(word)) { negative = false; postfix = false; segmentStart = tokens.length; clause++; return }
    if (/^[,:]$/.test(word)) { if (postfix) { negative = false; postfix = false }; segmentStart = tokens.length; return }
    const notOnly = (word === 'не' && words[index + 1] === 'только') || (word === 'not' && words[index + 1] === 'only')
    const positiveIdiom = (word === 'без' && words[index + 1] === 'отвлечений') || (word === 'не' && words[index + 1] === 'отвлекаться') || (word === 'without' && words[index + 1] === 'distractions')
    if ((word === 'не' && /^нуж(?:ен|на|но|ны)$/.test(words[index + 1] ?? '')) || (word === 'not' && words[index + 1] === 'needed')) {
      tokens.slice(segmentStart).forEach(t => { t.negative = true })
      postfix = true
    }
    if (negativeMarkers.has(word) && !notOnly && !positiveIdiom) negative = true
    else if (positiveMarkers.has(word) && !negativeMarkers.has(words[index - 1])) negative = false
    tokens.push({ raw: word, key: stem(word), position: tokens.length, negative, clause })
  })
  return tokens
}

export function phraseKeys(text: string): string[] {
  return (normalize(text).match(/[\p{L}\p{N}]+/gu) ?? []).map(stem)
}

/** One insertion/deletion/substitution/transposition, only for nontrivial words. */
function near(a: string, b: string): boolean {
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false
  if (a.length === b.length) {
    const differences = [...a].flatMap((c, i) => c === b[i] ? [] : [i])
    return differences.length === 1 || (differences.length === 2 && differences[1] === differences[0] + 1 && a[differences[0]] === b[differences[1]] && a[differences[1]] === b[differences[0]])
  }
  const [short, long] = a.length < b.length ? [a, b] : [b, a]
  for (let i = 0; i < long.length; i++) if (long.slice(0, i) + long.slice(i + 1) === short) return true
  return false
}

export type PhraseHit = { start: number; end: number; quality: number; negative: boolean; phrase: string }
export function matchPhrase(tokens: Token[], keys: string[], phrase: string): PhraseHit[] {
  if (!keys.length) return []
  const hits: PhraseHit[] = []
  for (let start = 0; start <= tokens.length - keys.length; start++) {
    const slice = tokens.slice(start, start + keys.length)
    if (slice.some(t => t.negative !== slice[0].negative || t.clause !== slice[0].clause)) continue
    let errors = 0
    const matches = keys.every((key, i) => key === slice[i].key || (near(key, slice[i].key) && ++errors <= 1))
    if (matches) hits.push({ start, end: start + keys.length, quality: errors ? .86 : 1, negative: slice[0].negative, phrase })
  }
  return hits
}
