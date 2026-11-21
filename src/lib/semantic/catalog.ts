/** Curated meanings for the actual library. This is a bounded concept graph,
 * not an embedding model. Only literal names make objects mandatory. */
export interface Concept {
  id: string
  label: string
  terms: string[]
  related?: Array<{ id: string; weight: number }>
}

export interface SemanticProfile {
  id: string
  category: string
  names: { ru: string[]; en: string[] }
  concepts: Record<string, number>
  metaphors: string[]
  roles: Array<'main' | 'background'>
  relatedObjects?: string[]
  /** Literal homonyms for which this drawing would be misleading. */
  excludedPhrases?: string[]
  backgroundUses?: BackgroundUse[]
}

export interface BackgroundUse {
  concept: string
  anchors: string[]
  purpose: string
  unless?: string[]
  richOnly?: boolean
  stagingVerb?: string
}

// Related edges provide weak context only. They must never make an unrelated
// object eligible without evidence in the user's query.
export const concepts: Concept[] = [
  { id: 'education', label: 'Образование', terms: ['образование', 'обучение', 'учеба', 'учёба', 'учиться', 'учиться новому', 'учебный', 'студент', 'урок', 'школа', 'университет', 'экзамен', 'подготовка к экзамену', 'education', 'learning', 'study', 'studying', 'student', 'school', 'lesson', 'teaching', 'exam', 'exam preparation'], related: [{ id: 'knowledge', weight: .4 }] },
  { id: 'distance-learning', label: 'Дистанционное обучение', terms: ['дистанционное образование', 'дистанционное обучение', 'удаленное обучение', 'удалённое образование', 'учеба онлайн', 'учиться онлайн', 'онлайн обучение', 'онлайн курс', 'онлайн урок', 'онлайн образование', 'обучение из дома', 'образование через интернет', 'remote learning', 'distance education', 'distance learning', 'online learning', 'online education', 'online course', 'e learning'], related: [{ id: 'education', weight: .45 }, { id: 'technology', weight: .3 }] },
  { id: 'knowledge', label: 'Знания', terms: ['знание', 'знания', 'познание', 'эрудиция', 'исследование', 'изучение', 'изучать', 'knowledge', 'research', 'discovery', 'understanding'], related: [{ id: 'education', weight: .4 }] },
  { id: 'reading', label: 'Чтение', terms: ['читать', 'чтение', 'читаю', 'читает', 'читают', 'литература', 'reading', 'read', 'reads', 'literature'], related: [{ id: 'knowledge', weight: .3 }] },
  { id: 'music', label: 'Музыка', terms: ['музыка', 'музыкальный', 'мелодия', 'песня', 'плейлист', 'music', 'musical', 'melody', 'song', 'playlist'], related: [{ id: 'audio', weight: .4 }] },
  { id: 'audio', label: 'Звук и прослушивание', terms: ['звук', 'аудио', 'слушать', 'слушаю', 'слушает', 'прослушивание', 'звукозапись', 'audio', 'sound', 'listen', 'listening', 'listens'], related: [{ id: 'music', weight: .25 }] },
  { id: 'podcast', label: 'Подкасты', terms: ['подкаст', 'подкасты', 'аудиокнига', 'podcast', 'podcasts', 'audiobook', 'audiobooks'], related: [{ id: 'audio', weight: .45 }] },
  { id: 'focus', label: 'Концентрация', terms: ['концентрация', 'сосредоточиться', 'сосредоточение', 'сосредоточенность', 'сосредоточенно', 'фокус внимания', 'фокус', 'без отвлечений', 'не отвлекаться', 'погружение в работу', 'focus', 'focused', 'concentration', 'concentrate', 'deep work', 'without distractions'], related: [{ id: 'audio', weight: .2 }] },
  { id: 'technology', label: 'Технологии', terms: ['технология', 'технологии', 'технологический', 'цифровой', 'цифровизация', 'интернет', 'инновации', 'гаджет', 'technology', 'technologies', 'tech', 'digital', 'innovation', 'internet', 'gadget'], related: [{ id: 'communication', weight: .25 }] },
  { id: 'communication', label: 'Общение', terms: ['общение', 'связь', 'коммуникация', 'звонок', 'позвонить', 'созвон', 'переговоры', 'видеозвонок', 'communication', 'conversation', 'call', 'calling', 'video call', 'stay connected'], related: [{ id: 'technology', weight: .25 }] },
  { id: 'remote-work', label: 'Удаленная работа', terms: ['удаленная работа', 'удалённая работа', 'работать удаленно', 'работа из дома', 'домашний офис', 'видеоконференция', 'remote work', 'working remotely', 'work from home', 'home office', 'video conference'], related: [{ id: 'communication', weight: .35 }, { id: 'organization', weight: .25 }] },
  { id: 'creativity', label: 'Творчество', terms: ['творчество', 'творческий', 'креативность', 'креатив', 'самовыражение', 'созидание', 'creative', 'creativity', 'creative thinking', 'self expression'], related: [{ id: 'inspiration', weight: .4 }] },
  { id: 'inspiration', label: 'Вдохновение', terms: ['вдохновение', 'вдохновлять', 'вдохновиться', 'вдохновляет', 'inspiration', 'inspire', 'inspired', 'inspiring'], related: [{ id: 'creativity', weight: .4 }] },
  { id: 'ideas', label: 'Идеи и озарение', terms: ['идея', 'идеи', 'озарение', 'придумать', 'придумывать', 'мозговой штурм', 'idea', 'ideas', 'insight', 'brainstorm', 'brainstorming'], related: [{ id: 'creativity', weight: .35 }] },
  { id: 'writing', label: 'Письмо и заметки', terms: ['писать', 'пишет', 'пишу', 'записывать', 'записать', 'записывает', 'запись', 'заметка', 'заметки', 'конспект', 'конспектировать', 'подпись', 'writing', 'write', 'writes', 'taking notes', 'notes', 'note taking', 'signature'], related: [{ id: 'knowledge', weight: .25 }] },
  { id: 'drawing', label: 'Рисование', terms: ['рисование', 'рисовать', 'рисует', 'рисую', 'эскиз', 'набросок', 'скетч', 'drawing', 'draw', 'draws', 'sketch', 'sketching'], related: [{ id: 'creativity', weight: .4 }] },
  { id: 'lighting', label: 'Освещение', terms: ['свет', 'освещение', 'освещает', 'осветить', 'освещать', 'подсветка', 'подсвечивает', 'light', 'lighting', 'illuminate', 'illuminates', 'shines', 'lights up'], related: [{ id: 'ideas', weight: .2 }] },
  { id: 'finance', label: 'Финансы', terms: ['финансы', 'финансовый', 'деньги', 'денег', 'экономика', 'бюджет', 'доход', 'finance', 'financial', 'money', 'economy', 'budget', 'income'], related: [{ id: 'saving', weight: .3 }] },
  { id: 'saving', label: 'Накопления', terms: ['накопления', 'накопить', 'сбережения', 'сберегать', 'экономить', 'экономия', 'копить', 'savings', 'saving money', 'save money', 'frugality'], related: [{ id: 'finance', weight: .4 }] },
  { id: 'payment', label: 'Оплата', terms: ['оплата', 'оплатить', 'оплачивает', 'платить', 'платеж', 'платёж', 'платежи', 'покупка', 'покупать', 'payment', 'pay', 'payments', 'paying', 'purchase', 'shopping'], related: [{ id: 'finance', weight: .35 }] },
  { id: 'value', label: 'Ценность и вознаграждение', terms: ['ценность', 'стоимость', 'вознаграждение', 'прибыль', 'инвестиции', 'инвестировать', 'value', 'worth', 'reward', 'profit', 'investment'], related: [{ id: 'finance', weight: .3 }] },
  { id: 'organization', label: 'Порядок и документы', terms: ['порядок', 'организация', 'упорядочить', 'организовать', 'документы', 'документооборот', 'архив', 'систематизация', 'организованность', 'organization', 'organize', 'organizing', 'documents', 'paperwork', 'archive', 'filing'], related: [{ id: 'planning', weight: .3 }] },
  { id: 'planning', label: 'Планирование', terms: ['планирование', 'планировать', 'план', 'расписание', 'список задач', 'planning', 'plan', 'schedule', 'task list', 'to do list'], related: [{ id: 'organization', weight: .35 }] },
  { id: 'teamwork', label: 'Совместная работа', terms: ['командная работа', 'команда', 'сотрудничество', 'взаимодействие', 'совместная работа', 'вместе', 'партнерство', 'партнёрство', 'teamwork', 'team', 'collaboration', 'cooperation', 'partnership', 'together'], related: [{ id: 'problem-solving', weight: .25 }] },
  { id: 'problem-solving', label: 'Решение задач', terms: ['решение', 'решение задач', 'решение проблемы', 'решить', 'решать', 'логика', 'головоломка', 'собрать целое', 'соединяет', 'соединить', 'solution', 'solve', 'solving', 'problem solving', 'logic', 'connects', 'connect'], related: [{ id: 'teamwork', weight: .25 }] },
  { id: 'growth', label: 'Рост и развитие', terms: ['рост', 'развитие', 'развиваться', 'расцвет', 'расцветать', 'growth', 'grow', 'development', 'bloom', 'flourish'], related: [{ id: 'care', weight: .2 }] },
  { id: 'care', label: 'Забота', terms: ['забота', 'заботиться', 'благодарность', 'нежность', 'care', 'caring', 'gratitude', 'kindness'], related: [{ id: 'gift', weight: .3 }] },
  { id: 'gift', label: 'Подарок и праздник', terms: ['подарок', 'подарить', 'дарить', 'праздник', 'поздравление', 'поздравить', 'день рождения', 'gift', 'present', 'celebration', 'birthday', 'congratulations'], related: [{ id: 'care', weight: .35 }] },
  { id: 'relaxation', label: 'Отдых и спокойствие', terms: ['отдых', 'расслабление', 'расслабиться', 'спокойствие', 'покой', 'медитация', 'relax', 'relaxation', 'rest', 'calm', 'peace', 'meditation'], related: [{ id: 'care', weight: .2 }] },
  { id: 'nature', label: 'Природа', terms: ['природа', 'весна', 'сад', 'растение', 'растения', 'зелень', 'nature', 'spring', 'garden', 'plant', 'plants', 'greenery'], related: [{ id: 'growth', weight: .3 }] },
]

// Weights are authored relevance judgements, not model probabilities. Weak
// associations stay below the eligibility threshold; direct metaphor fits >= .65.
// Rendering variants are resolved from loaded SVG assets, never fabricated here.
export const catalog: SemanticProfile[] = [
  {
    id: 'book', category: 'education',
    names: { ru: ['книга', 'книгу', 'книги', 'книгой', 'книге', 'учебник', 'открытая книга'], en: ['book', 'books', 'textbook', 'open book'] },
    concepts: { education: 1, 'distance-learning': .95, knowledge: 1, reading: 1, writing: .65, creativity: .3, inspiration: .3, planning: .3, focus: .35 },
    metaphors: ['знание', 'обучение', 'накопленный опыт'], roles: ['main', 'background'], relatedObjects: ['pen', 'lamp', 'headphones', 'phone'],
    backgroundUses: [{ concept: 'writing', anchors: ['pen'], purpose: 'показывает, куда записывают мысли и заметки' }],
  },
  {
    id: 'phone', category: 'technology',
    names: { ru: ['телефон', 'телефона', 'телефоном', 'телефоне', 'смартфон', 'смартфона', 'мобильник', 'мобильный телефон'], en: ['phone', 'phones', 'smartphone', 'smartphones', 'mobile phone', 'cellphone', 'cell phone'] },
    concepts: { technology: 1, communication: 1, 'distance-learning': .9, 'remote-work': .9, podcast: .7, payment: .8, music: .3, finance: .25, education: .3 },
    metaphors: ['цифровые технологии', 'доступ на расстоянии', 'связь'], roles: ['main', 'background'], relatedObjects: ['headphones', 'book', 'wallet'],
  },
  {
    id: 'puzzle', category: 'thinking',
    names: { ru: ['пазл', 'пазлы', 'пазла', 'пазлов', 'пазлами', 'детали пазла', 'головоломка'], en: ['puzzle', 'puzzles', 'jigsaw', 'puzzle pieces'] },
    concepts: { teamwork: 1, 'problem-solving': 1, knowledge: .3, ideas: .3, creativity: .3, organization: .25 },
    metaphors: ['части целого', 'сотрудничество', 'поиск решения'], roles: ['main', 'background'], relatedObjects: ['phone', 'book', 'pen'],
  },
  {
    id: 'coin', category: 'finance',
    names: { ru: ['монета', 'монету', 'монеты', 'монетой', 'монет', 'монетка'], en: ['coin', 'coins'] },
    concepts: { finance: 1, saving: .85, payment: .8, value: 1, gift: .25, planning: .2 },
    metaphors: ['ценность', 'вознаграждение', 'денежные средства'], roles: ['main', 'background'], relatedObjects: ['wallet', 'phone'],
  },
  {
    id: 'headphones', category: 'audio',
    names: { ru: ['наушники', 'наушников', 'наушниками', 'наушниках', 'наушник', 'гарнитура'], en: ['headphones', 'headphone', 'headset', 'headsets'] },
    concepts: { music: 1, audio: 1, podcast: 1, focus: .95, 'distance-learning': .8, communication: .75, 'remote-work': .85, relaxation: .8, education: .3 },
    metaphors: ['музыка', 'погружение', 'защита внимания'], roles: ['main', 'background'], relatedObjects: ['phone', 'book'],
    backgroundUses: [
      { concept: 'distance-learning', anchors: ['book', 'phone'], purpose: 'передают аудио онлайн-урока', richOnly: true },
      { concept: 'remote-work', anchors: ['phone'], purpose: 'показывают участие в рабочих звонках', richOnly: true },
    ],
  },
  {
    id: 'lamp', category: 'workspace',
    names: { ru: ['лампа', 'лампу', 'лампы', 'лампой', 'лампе', 'настольная лампа', 'светильник'], en: ['lamp', 'lamps', 'desk lamp', 'table lamp'] },
    concepts: { lighting: 1, ideas: .95, inspiration: .8, creativity: .7, reading: .35, focus: .3, 'remote-work': .25 },
    metaphors: ['озарение', 'ясность', 'вдохновение'], roles: ['main', 'background'], relatedObjects: ['book', 'pen'],
    backgroundUses: [
      { concept: 'reading', anchors: ['book'], purpose: 'освещает страницу', stagingVerb: 'освещ' },
      { concept: 'inspiration', anchors: ['pen'], purpose: 'выражает озарение, с которого начинается работа' },
    ],
  },
  {
    id: 'flowers', category: 'nature',
    names: { ru: ['цветы', 'цветов', 'цветами', 'цветок', 'букет', 'букет цветов', 'тюльпаны', 'ваза с цветами'], en: ['flowers', 'flower', 'bouquet', 'tulips', 'vase of flowers'] },
    concepts: { nature: 1, growth: .9, care: 1, gift: 1, relaxation: .7, inspiration: .65, creativity: .25 },
    metaphors: ['забота', 'рост', 'благодарность'], roles: ['main', 'background'], relatedObjects: ['book'],
  },
  {
    id: 'wallet', category: 'finance',
    names: { ru: ['кошелек', 'кошелёк', 'кошелька', 'кошельком', 'кошельке', 'портмоне'], en: ['wallet', 'wallets', 'purse'] },
    concepts: { finance: .95, saving: 1, payment: 1, value: .7, planning: .3, gift: .2 },
    metaphors: ['личные финансы', 'бережливость', 'покупка'], roles: ['main', 'background'], relatedObjects: ['coin', 'phone'],
  },
  {
    id: 'folder', category: 'organization',
    names: { ru: ['папка', 'папку', 'папки', 'папкой', 'папке', 'папка для бумаг'], en: ['folder', 'folders', 'file folder'] },
    concepts: { organization: 1, planning: .8, 'remote-work': .65, knowledge: .25, finance: .2 },
    metaphors: ['порядок', 'систематизация', 'структура'], roles: ['main', 'background'], relatedObjects: ['pen', 'book', 'phone'],
    backgroundUses: [{ concept: 'remote-work', anchors: ['phone', 'headphones'], purpose: 'представляет рабочие материалы', richOnly: true }],
  },
  {
    id: 'pen', category: 'creativity',
    excludedPhrases: ['дверная ручка', 'оконная ручка', 'ручка двери', 'door handle', 'window handle'],
    names: { ru: ['ручка', 'ручку', 'ручки', 'ручкой', 'ручке', 'шариковая ручка'], en: ['pen', 'pens', 'ballpoint', 'ballpoint pen'] },
    concepts: { writing: 1, drawing: .95, creativity: 1, inspiration: .8, ideas: .75, planning: .8, education: .3, organization: .25 },
    metaphors: ['самовыражение', 'авторство', 'фиксация мысли'], roles: ['main', 'background'], relatedObjects: ['book', 'folder', 'lamp'],
    backgroundUses: [
      { concept: 'education', anchors: ['book'], purpose: 'обозначает конспектирование и практику', unless: ['distance-learning'] },
      { concept: 'planning', anchors: ['folder'], purpose: 'обозначает запись плана' },
    ],
  },
]
