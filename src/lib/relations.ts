import type { Pose } from '../types'

type RelationRule = readonly [verbs: readonly string[], target: string]
type PairLayout = { sourcePose: Pose; targetPose: Pose }

// Directed pairs keyed by the canonical library ID. Verb stems match inflected
// Russian forms. Only pairs already selected by the semantic index can match.
const relationPairs: Record<string, readonly RelationRule[]> = {
  book: [
    [['чита', 'изуч'], 'headphones'],
    [['объяс', 'уч'], 'puzzle'],
    [['хран', 'иде'], 'folder'],
    [['вдохнов'], 'pen'],
    [['поддерж', 'концентр'], 'lamp'],
    [['связыв'], 'phone'],
    [['раскрыв', 'развив'], 'flowers'],
    [['цен', 'знан'], 'coin'],
    [['планир'], 'wallet'],
    [['открыва'], 'lamp'],
  ],
  phone: [
    [['соедин', 'связ'], 'puzzle'],
    [['звон', 'общ'], 'headphones'],
    [['чита', 'смотр'], 'book'],
    [['оплач', 'плат'], 'wallet'],
    [['подсвеч', 'свет'], 'lamp'],
    [['фиксир', 'запис'], 'pen'],
    [['организ'], 'folder'],
    [['показыв', 'иде'], 'flowers'],
    [['реша'], 'puzzle'],
    [['цен', 'деньг'], 'coin'],
  ],
  puzzle: [
    [['реша', 'собира'], 'phone'],
    [['объяс', 'поним'], 'book'],
    [['тренир', 'концентр'], 'headphones'],
    [['подсвеч', 'освещ'], 'lamp'],
    [['фиксир', 'запис'], 'pen'],
    [['структурир'], 'folder'],
    [['цен', 'вклад'], 'coin'],
    [['планир'], 'wallet'],
    [['вдохнов'], 'flowers'],
    [['соедин'], 'phone'],
  ],
  coin: [
    [['оплач', 'плат'], 'wallet'],
    [['финансир', 'цен'], 'book'],
    [['поддерж', 'инвест'], 'phone'],
    [['вознагражд'], 'puzzle'],
    [['подсвеч', 'блест'], 'lamp'],
    [['отмеч', 'фиксир'], 'pen'],
    [['хран'], 'folder'],
    [['дар', 'забот'], 'flowers'],
    [['цен', 'музык'], 'headphones'],
    [['обмен'], 'wallet'],
  ],
  headphones: [
    [['концентр', 'слуш'], 'book'],
    [['фокусир'], 'puzzle'],
    [['соедин', 'связ'], 'phone'],
    [['изолир', 'тишин'], 'lamp'],
    [['вдохнов'], 'pen'],
    [['сопровожд'], 'folder'],
    [['цен', 'поддерж'], 'coin'],
    [['расслаб'], 'flowers'],
    [['слуш'], 'phone'],
    [['погруж'], 'book'],
  ],
  lamp: [
    [['освещ', 'подсвет'], 'book'],
    [['освещ', 'подсвет'], 'puzzle'],
    [['освещ', 'подсвет'], 'phone'],
    [['освещ', 'подсвет'], 'pen'],
    [['освещ', 'подсвет'], 'folder'],
    [['освещ', 'подсвет'], 'wallet'],
    [['освещ', 'подсвет'], 'coin'],
    [['освещ', 'подсвет'], 'headphones'],
    [['освещ', 'подсвет'], 'flowers'],
    [['направ'], 'book'],
  ],
  flowers: [
    [['вдохнов', 'украш'], 'book'],
    [['смягч', 'забот'], 'phone'],
    [['вдохнов'], 'pen'],
    [['украш'], 'folder'],
    [['поддерж', 'раст'], 'puzzle'],
    [['подсвеч', 'свет'], 'lamp'],
    [['дар', 'цен'], 'wallet'],
    [['вознагражд'], 'coin'],
    [['расслаб'], 'headphones'],
    [['цвет', 'ожив'], 'book'],
  ],
  wallet: [
    [['хран', 'оплач'], 'coin'],
    [['финансир', 'покуп'], 'phone'],
    [['планир', 'бюджет'], 'book'],
    [['вознагражд'], 'puzzle'],
    [['оплач'], 'lamp'],
    [['хран'], 'pen'],
    [['организ'], 'folder'],
    [['дар'], 'flowers'],
    [['цен', 'подпис'], 'headphones'],
    [['сберег'], 'coin'],
  ],
  folder: [
    [['организ', 'хран'], 'pen'],
    [['собир', 'хран'], 'book'],
    [['упорядоч'], 'phone'],
    [['собир'], 'puzzle'],
    [['хран'], 'coin'],
    [['хран'], 'wallet'],
    [['подсвеч', 'свет'], 'lamp'],
    [['сохраня'], 'flowers'],
    [['собир'], 'headphones'],
    [['планир'], 'book'],
  ],
  pen: [
    [['пиш', 'запис'], 'book'],
    [['отмеч', 'реша'], 'puzzle'],
    [['фиксир', 'звон'], 'phone'],
    [['планир', 'бюджет'], 'wallet'],
    [['рис', 'свет'], 'lamp'],
    [['подпис'], 'coin'],
    [['маркир', 'организ'], 'folder'],
    [['рис', 'вдохнов'], 'flowers'],
    [['пиш', 'музык'], 'headphones'],
    [['пиш', 'иде'], 'book'],
  ],
}

const sourcePoses: Record<string, Pose> = {
  book: { x: 52, y: 58, scale: .45, rotation: -3 },
  phone: { x: 59, y: 55, scale: .38, rotation: 3 },
  puzzle: { x: 56, y: 55, scale: .36, rotation: -4 },
  coin: { x: 58, y: 55, scale: .35, rotation: -3 },
  headphones: { x: 54, y: 51, scale: .43, rotation: -2 },
  lamp: { x: 31, y: 29, scale: .34, rotation: 0 },
  flowers: { x: 53, y: 54, scale: .42, rotation: 2 },
  wallet: { x: 57, y: 55, scale: .39, rotation: -3 },
  folder: { x: 54, y: 56, scale: .42, rotation: -3 },
  pen: { x: 62, y: 61, scale: .35, rotation: 12 },
}

const relationVariants: readonly Pose[] = [
  { x: 0, y: 0, scale: 1, rotation: 0 },
  { x: 3, y: -2, scale: .96, rotation: 4 },
  { x: -3, y: 2, scale: 1.04, rotation: -4 },
  { x: 5, y: 1, scale: .93, rotation: 7 },
  { x: -5, y: -1, scale: 1.07, rotation: -7 },
  { x: 2, y: 4, scale: .98, rotation: 3 },
  { x: -2, y: -4, scale: 1.02, rotation: -3 },
  { x: 4, y: -3, scale: .95, rotation: 6 },
  { x: -4, y: 3, scale: 1.05, rotation: -6 },
  { x: 1, y: -5, scale: 1, rotation: 2 },
]

// Use authored choreography when positioning the objects relative to each other matters.
const relationLayouts: Record<string, PairLayout> = {
  'lamp:book': { sourcePose: { x: 32, y: 29, scale: .35, rotation: 0 }, targetPose: { x: 58, y: 60, scale: .48, rotation: -3 } },
  'pen:book': { sourcePose: { x: 77, y: 73, scale: .20, rotation: 14 }, targetPose: { x: 53, y: 57, scale: .46, rotation: -3 } },
  'phone:puzzle': { sourcePose: { x: 55, y: 55, scale: .47, rotation: 2 }, targetPose: { x: 51, y: 54, scale: .34, rotation: -8 } },
  'wallet:coin': { sourcePose: { x: 56, y: 56, scale: .46, rotation: -3 }, targetPose: { x: 34, y: 43, scale: .24, rotation: -9 } },
  'headphones:book': { sourcePose: { x: 57, y: 53, scale: .47, rotation: -2 }, targetPose: { x: 32, y: 59, scale: .33, rotation: -5 } },
}

export function relationRules(source: string): readonly RelationRule[] {
  return relationPairs[source] ?? []
}

export function relationLayout(source: string, target: string, seed: number): PairLayout {
  const layout = relationLayouts[`${source}:${target}`] ?? {
    sourcePose: sourcePoses[source],
    targetPose: sourcePoses[target],
  }
  const index = seed % relationVariants.length
  return {
    sourcePose: varyPose(layout.sourcePose, relationVariants[index]),
    targetPose: varyPose(layout.targetPose, relationVariants[(index + 4) % relationVariants.length]),
  }
}

function varyPose(pose: Pose, variant: Pose): Pose {
  return {
    x: pose.x + variant.x,
    y: pose.y + variant.y,
    scale: pose.scale * variant.scale,
    rotation: pose.rotation + variant.rotation,
  }
}
