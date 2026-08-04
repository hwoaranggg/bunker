const tg = window.Telegram?.WebApp;
const $ = id => document.getElementById(id);

const I18N = {
  en: {
    authKicker: 'BUILD YOUR INTELLIGENCE NETWORK', authTitle: 'Catch the signal before the market does.', authText: 'Scan live anomalies, upgrade your technology and earn a place in the seasonal airdrop ranking.', enter: 'Enter network', connecting: 'Establishing secure uplink…',
    intel: 'Intel', energy: 'Energy', chips: 'Chips', scan: 'SCAN', networkOnline: 'NETWORK ONLINE', signalsDetected: 'SIGNALS DETECTED', dailyCombo: 'DAILY COMBO', seasonScore: 'SEASON SCORE', ready: 'Ready', completed: 'Completed', waiting: 'waiting',
    networkTech: 'NETWORK TECHNOLOGY', upgradeTitle: 'Build your edge', upgradeText: 'Every module increases passive Intel and unlocks stronger market signals.', passiveIncome: 'PASSIVE INCOME', offlineStorage: 'OFFLINE STORAGE',
    marketIntel: 'MARKET INTELLIGENCE', signalTitle: 'Intercepted signals', signalText: 'Read the evidence, make a call and build an accuracy streak.',
    dailyOps: 'DAILY OPERATIONS', missionTitle: 'Return with a purpose', missionText: 'Daily puzzles, signal forecasts and network objectives grow your season score.', resetsDaily: 'RESETS DAILY', comboTitle: 'Module Combo', comboText: "Select today's secret set of three technologies.", checkCombo: 'Check combination', oneCodeDaily: 'ONE CODE DAILY', cipherTitle: 'Signal Cipher', cipherText: 'Decode the five-letter market word shared by the community.', decode: 'Decode',
    seasonNetwork: 'SEASON NETWORK', networkText: 'Climb the leagues. Build a verified record. Prepare for the seasonal snapshot.', estimated: 'ESTIMATED', airdropTitle: 'Airdrop score', growNetwork: 'GROW THE NETWORK', referralTitle: 'Qualified referrals', referralText: 'A referral qualifies only after real play and a completed signal assessment.', share: 'Share', connect: 'Connect', refPlaceholder: 'Referral code', language: 'LANGUAGE', interfaceLanguage: 'Interface language', fullAnalysis: 'Full market analysis', open: 'Open ↗',
    navRadar: 'Radar', navUpgrades: 'Upgrade', navSignals: 'Signals', navMissions: 'Missions', navNetwork: 'Network',
    income: 'Intel/h', level: 'Level', upgrade: 'Upgrade', unlock: 'Unlock', locked: 'Locked', max: 'MAX', building: 'Installing', cost: 'Cost', parts: 'Chips', unlockReq: 'Upgrade prerequisite modules',
    noSignals: 'Radar is quiet', noSignalsText: 'New market anomalies will appear when the scanner refreshes.', signalLocked: 'Complete the launch sequence to unlock market signals.', scanAvailable: 'signals ready',
    accuracy: 'Accuracy', attempts: 'Calls', correct: 'Correct', activity: 'Activity', liquidity: 'Liquidity', concentration: 'Top holders', change24h: '24h move', analyze: 'TRACK SIGNAL', skip: 'IGNORE RISK', signalEvidence: 'SIGNAL EVIDENCE', signalAssessment: 'Assessment complete', correctCall: 'Signal confirmed. Your read was correct.', wrongCall: 'Signal reviewed. Use the new evidence on your next call.',
    currentDirective: 'CURRENT DIRECTIVE', launchSequence: 'Launch sequence', operationRunning: 'Operation running', completeSetup: 'Complete network initialization', goSignals: 'Analyze first signal', goUpgrade: 'Install the Power Cell', taskUpgrade: 'Upgrade technology', taskSignal: 'Assess a market signal', taskSupply: 'Claim the chip drop', taskCalibrate: 'Calibrate the radar core',
    selectThree: 'Select three modules', comboHint: 'The combination is global for every operator and resets each day.', submitCombo: 'Use selected modules', wrongCombo: 'Wrong combination. The network signature does not match.', comboSuccess: 'Daily Combo complete: +1,500 Intel, +2 Chips and +40 SP.', cipherSuccess: 'Cipher decoded: +500 Intel, +1 Chip and +20 SP.', cipherWrong: 'Incorrect code. Check the community clue and try again.',
    streak: 'Day streak', dailyCalls: 'Daily calls', signalPoints: 'Signal Points', season: 'Season', nextLeague: 'Next league', topLeague: 'Maximum league reached',
    scoreNetwork: 'Network', scoreAccuracy: 'Accuracy', scoreActivity: 'Activity', scoreXradar: 'XRadar', scoreReferrals: 'Referrals', scoreSignalPoints: 'Signal Points',
    reportKicker: 'NETWORK REPORT', reportTitle: 'Scout kept scanning', collect: 'Collect report', reportText: (intel, hours) => `Your network generated ${intel} Intel during ${hours} productive hours.`,
    resourceIntel: 'Intel funds module upgrades. It is produced actively by scanning and passively by your network.', resourceEnergy: 'Energy powers active scans. Power Cell upgrades increase capacity and regeneration.', resourceChips: 'Chips are a rare upgrade material earned from signals, daily puzzles and qualified referrals.',
    copied: 'Referral code copied.', connected: 'Referral connected.', languageSaved: 'Language changed.', notConfigured: 'Connect XRADAR_BASE_URL to enable the full analysis.', shareText: 'Join my XRadar intelligence network.',
    observer: 'Observer', scout: 'Scout', analyst: 'Analyst', hunter: 'Signal Hunter', detective: 'Market Detective', operator: 'Alpha Operator', oracle: 'Oracle'
  },
  ru: {
    authKicker: 'ПОСТРОЙ СЕТЬ КРИПТОРАЗВЕДКИ', authTitle: 'Поймай сигнал раньше рынка.', authText: 'Сканируй аномалии, улучшай технологии и поднимайся в сезонном рейтинге airdrop.', enter: 'Войти в сеть', connecting: 'Устанавливаем защищённое соединение…',
    intel: 'Интел', energy: 'Энергия', chips: 'Чипы', scan: 'СКАН', networkOnline: 'СЕТЬ АКТИВНА', signalsDetected: 'ОБНАРУЖЕНО СИГНАЛОВ', dailyCombo: 'КОМБО ДНЯ', seasonScore: 'СЕЗОННЫЙ СЧЁТ', ready: 'Готово', completed: 'Выполнено', waiting: 'ожидают',
    networkTech: 'ТЕХНОЛОГИИ СЕТИ', upgradeTitle: 'Создай преимущество', upgradeText: 'Каждый модуль увеличивает пассивный Интел и открывает более сильные сигналы.', passiveIncome: 'ПАССИВНЫЙ ДОХОД', offlineStorage: 'ОФЛАЙН-ХРАНИЛИЩЕ',
    marketIntel: 'РЫНОЧНАЯ РАЗВЕДКА', signalTitle: 'Перехваченные сигналы', signalText: 'Изучи данные, прими решение и собирай серию точных прогнозов.',
    dailyOps: 'ЕЖЕДНЕВНЫЕ ОПЕРАЦИИ', missionTitle: 'Возвращайся с целью', missionText: 'Загадки, прогнозы и задания сети увеличивают сезонный счёт.', resetsDaily: 'СБРОС КАЖДЫЙ ДЕНЬ', comboTitle: 'Комбо модулей', comboText: 'Выбери секретную комбинацию из трёх технологий.', checkCombo: 'Проверить комбинацию', oneCodeDaily: 'ОДИН КОД В ДЕНЬ', cipherTitle: 'Шифр сигнала', cipherText: 'Расшифруй слово из пяти букв, которое ищет сообщество.', decode: 'Расшифровать',
    seasonNetwork: 'СЕЗОННАЯ СЕТЬ', networkText: 'Поднимайся по лигам, создавай подтверждённую историю и готовься к snapshot.', estimated: 'ПРЕДВАРИТЕЛЬНО', airdropTitle: 'Airdrop-рейтинг', growNetwork: 'РАСШИРЯЙ СЕТЬ', referralTitle: 'Активные рефералы', referralText: 'Реферал засчитывается только после реальной игры и оценки сигнала.', share: 'Поделиться', connect: 'Подключить', refPlaceholder: 'Реферальный код', language: 'ЯЗЫК', interfaceLanguage: 'Язык интерфейса', fullAnalysis: 'Полный анализ рынка', open: 'Открыть ↗',
    navRadar: 'Радар', navUpgrades: 'Модули', navSignals: 'Сигналы', navMissions: 'Задания', navNetwork: 'Сеть',
    income: 'Интел/ч', level: 'Уровень', upgrade: 'Улучшить', unlock: 'Открыть', locked: 'Закрыто', max: 'МАКС', building: 'Установка', cost: 'Цена', parts: 'Чипы', unlockReq: 'Улучши необходимые модули',
    noSignals: 'Радар молчит', noSignalsText: 'Новые рыночные аномалии появятся после обновления сканера.', signalLocked: 'Заверши запуск сети, чтобы открыть рыночные сигналы.', scanAvailable: 'сигналов готово',
    accuracy: 'Точность', attempts: 'Прогнозы', correct: 'Верные', activity: 'Активность', liquidity: 'Ликвидность', concentration: 'Топ-холдеры', change24h: 'Изменение 24ч', analyze: 'ОТСЛЕЖИВАТЬ', skip: 'ИГНОРИРОВАТЬ РИСК', signalEvidence: 'ДАННЫЕ СИГНАЛА', signalAssessment: 'Анализ завершён', correctCall: 'Сигнал подтверждён. Твой прогноз оказался верным.', wrongCall: 'Сигнал изучен. Используй новые данные в следующем прогнозе.',
    currentDirective: 'ТЕКУЩАЯ ДИРЕКТИВА', launchSequence: 'Запуск сети', operationRunning: 'Операция выполняется', completeSetup: 'Заверши инициализацию сети', goSignals: 'Оцени первый сигнал', goUpgrade: 'Установи Энергоячейку', taskUpgrade: 'Улучши технологию', taskSignal: 'Оцени рыночный сигнал', taskSupply: 'Забери поставку чипов', taskCalibrate: 'Откалибруй ядро радара',
    selectThree: 'Выбери три модуля', comboHint: 'Комбинация одинакова для всех операторов и меняется каждый день.', submitCombo: 'Использовать выбранные', wrongCombo: 'Неверная комбинация. Сигнатура сети не совпала.', comboSuccess: 'Комбо выполнено: +1 500 Интел, +2 Чипа и +40 SP.', cipherSuccess: 'Шифр разгадан: +500 Интел, +1 Чип и +20 SP.', cipherWrong: 'Код неверный. Проверь подсказку сообщества и попробуй ещё раз.',
    streak: 'Серия дней', dailyCalls: 'Прогнозы сегодня', signalPoints: 'Signal Points', season: 'Сезон', nextLeague: 'Следующая лига', topLeague: 'Максимальная лига достигнута',
    scoreNetwork: 'Развитие сети', scoreAccuracy: 'Точность', scoreActivity: 'Активность', scoreXradar: 'XRadar', scoreReferrals: 'Рефералы', scoreSignalPoints: 'Signal Points',
    reportKicker: 'ОТЧЁТ СЕТИ', reportTitle: 'Scout продолжал сканирование', collect: 'Забрать отчёт', reportText: (intel, hours) => `Сеть произвела ${intel} Интел за ${hours} активных часов.`,
    resourceIntel: 'Интел нужен для улучшения модулей. Он добывается сканированием и пассивной работой сети.', resourceEnergy: 'Энергия расходуется на сканирование. Энергоячейка увеличивает запас и восстановление.', resourceChips: 'Чипы — редкий материал для улучшений. Их дают сигналы, ежедневные задания и активные рефералы.',
    copied: 'Реферальный код скопирован.', connected: 'Реферал подключён.', languageSaved: 'Язык изменён.', notConfigured: 'Подключи XRADAR_BASE_URL, чтобы открыть полный анализ.', shareText: 'Присоединяйся к моей сети крипторазведки XRadar.',
    observer: 'Наблюдатель', scout: 'Разведчик', analyst: 'Аналитик', hunter: 'Охотник за сигналами', detective: 'Рыночный детектив', operator: 'Альфа-оператор', oracle: 'Оракул'
  }
};

Object.assign(I18N.en, {
  authKicker: 'XRADAR SIGNAL INTELLIGENCE',
  authTitle: 'See the market before it moves.',
  authText: 'Detect anomalies, develop your intelligence stack and turn verified market behavior into an edge.',
  enter: 'Access the network',
  scan: 'PULSE',
  networkOnline: 'LIVE INTELLIGENCE',
  signalsDetected: 'SIGNAL QUEUE',
  liveMarket: 'LIVE MARKET',
  globalSignalMap: 'GLOBAL SIGNAL MAP',
  nextSignal: 'NEXT SIGNAL',
  pulses: 'pulses',
  liveFeed: 'LIVE FEED',
  marketQuiet: 'Awaiting market telemetry',
  price: 'Price',
  volume24h: '24h volume',
  marketCap: 'Market cap',
  holders: 'Holders',
  tokenAge: 'Token age',
  hoursShort: 'h',
  encrypted: 'Encrypted',
  signalActionHelp: 'Review the complete market structure before choosing an action. Your accuracy affects league progress and airdrop score.',
  onboardingProgress: 'NETWORK SETUP',
  setup0Title: 'Restore emergency power',
  setup0Text: 'Bring the intelligence deck online and unlock the first systems.',
  setup1Title: 'Initialize Radar Core',
  setup1Text: 'Connect the terminal and calibrate the market scanner.',
  setup2Title: 'Assess the first signal',
  setup2Text: 'Read the evidence and make your first verified market call.',
  setup3Title: 'Stabilize the energy grid',
  setup3Text: 'Restore the power reserve required for continuous scanning.',
  setup4Title: 'Install the Power Cell',
  setup4Text: 'Complete the network setup and unlock persistent progression.',
  reportTitle: 'Your network stayed active',
  buildHypothesis: 'BUILD YOUR HYPOTHESIS',
  factorsMarked: 'factors marked',
  chooseEvidence: 'Mark at least one evidence factor before submitting your thesis.',
  factorThin: 'Thin liquidity',
  factorThinText: 'Pool depth may not support a safe exit.',
  factorConcentration: 'Holder concentration',
  factorConcentrationText: 'A small wallet group controls too much supply.',
  factorMutable: 'Mutable contract',
  factorMutableText: 'Critical contract permissions are still active.',
  factorActivity: 'Abnormal activity',
  factorActivityText: 'Transaction pressure is outside its normal range.',
  factorClear: 'No critical flags',
  factorClearText: 'Visible market structure appears balanced.',
  outcomeReport: 'ANALYSIS REPORT',
  thesisConfirmed: 'Thesis confirmed',
  thesisRevised: 'Thesis needs revision',
  evidenceScore: 'Evidence score',
  riskScore: 'Calculated risk',
  relevantEvidence: 'Relevant evidence',
  unsupportedEvidence: 'Unsupported assumptions',
  rewardEarned: 'Reward earned',
  insightBonus: 'insight bonus',
  dailyBrief: "TODAY'S COMMAND BRIEF",
  briefProgress: 'Daily completion',
  scanTarget: 'Run 100 market pulses',
  assessTarget: 'Assess 5 signals',
  comboTarget: 'Solve Module Combo',
  cipherTarget: 'Decode Signal Cipher',
  daysLeft: 'days left',
  continue: 'Continue',
  scanHint: 'TAP · 1 ENERGY',
  marketEvent: 'MARKET EVENT',
  eventAlert: 'LIVE MARKET ANOMALY',
  eventChoose: 'Choose a countermeasure. Every response has a different cost and reward.',
  energyCost: 'Energy cost',
  eventResolved: 'Market event contained.',
  newSignalFound: 'New signal discovered:',
  loginStreak: 'LOGIN STREAK',
  streakDays: 'consecutive days',
  nextReward: 'Next reward',
  dayShort: 'D',
  cipherHint: 'Community hint'
});

Object.assign(I18N.ru, {
  authKicker: 'СИГНАЛЬНАЯ РАЗВЕДКА XRADAR',
  authTitle: 'Увидь движение рынка до того, как оно начнётся.',
  authText: 'Находи аномалии, развивай аналитическую систему и превращай подтверждённые данные рынка в преимущество.',
  enter: 'Войти в систему',
  scan: 'ИМПУЛЬС',
  networkOnline: 'РАЗВЕДКА АКТИВНА',
  signalsDetected: 'ОЧЕРЕДЬ СИГНАЛОВ',
  liveMarket: 'РЫНОК ОНЛАЙН',
  globalSignalMap: 'ГЛОБАЛЬНАЯ КАРТА',
  nextSignal: 'СЛЕДУЮЩИЙ СИГНАЛ',
  pulses: 'импульсов',
  liveFeed: 'ЖИВОЙ ПОТОК',
  marketQuiet: 'Ожидание рыночной телеметрии',
  price: 'Цена',
  volume24h: 'Объём за 24ч',
  marketCap: 'Капитализация',
  holders: 'Холдеры',
  tokenAge: 'Возраст токена',
  hoursShort: 'ч',
  encrypted: 'Зашифровано',
  signalActionHelp: 'Изучи структуру рынка перед решением. Точность влияет на лигу и рейтинг airdrop.',
  onboardingProgress: 'НАСТРОЙКА СЕТИ',
  setup0Title: 'Восстанови аварийное питание',
  setup0Text: 'Запусти аналитический контур и открой первые системы.',
  setup1Title: 'Инициализируй ядро радара',
  setup1Text: 'Подключи терминал и откалибруй рыночный сканер.',
  setup2Title: 'Оцени первый сигнал',
  setup2Text: 'Изучи данные и сделай первый проверяемый рыночный прогноз.',
  setup3Title: 'Стабилизируй энергосистему',
  setup3Text: 'Восстанови запас энергии для непрерывного сканирования.',
  setup4Title: 'Установи энергоячейку',
  setup4Text: 'Заверши настройку сети и открой постоянное развитие.',
  reportTitle: 'Сеть продолжала работать',
  buildHypothesis: 'СОБЕРИ АНАЛИТИЧЕСКУЮ ГИПОТЕЗУ',
  factorsMarked: 'факторов отмечено',
  chooseEvidence: 'Перед решением отметь хотя бы один фактор.',
  factorThin: 'Низкая ликвидность',
  factorThinText: 'Глубины пула может не хватить для безопасного выхода.',
  factorConcentration: 'Концентрация холдеров',
  factorConcentrationText: 'Небольшая группа кошельков контролирует слишком много.',
  factorMutable: 'Изменяемый контракт',
  factorMutableText: 'Критические разрешения контракта остаются активными.',
  factorActivity: 'Аномальная активность',
  factorActivityText: 'Давление транзакций вышло за обычный диапазон.',
  factorClear: 'Критических флагов нет',
  factorClearText: 'Видимая структура рынка выглядит сбалансированной.',
  outcomeReport: 'ОТЧЁТ АНАЛИЗА',
  thesisConfirmed: 'Гипотеза подтверждена',
  thesisRevised: 'Гипотезу нужно пересмотреть',
  evidenceScore: 'Качество аргументов',
  riskScore: 'Расчётный риск',
  relevantEvidence: 'Значимые факторы',
  unsupportedEvidence: 'Неподтверждённые предположения',
  rewardEarned: 'Полученная награда',
  insightBonus: 'бонус за анализ',
  dailyBrief: 'ОПЕРАЦИОННЫЙ ПЛАН НА СЕГОДНЯ',
  briefProgress: 'Дневной прогресс',
  scanTarget: 'Выполнить 100 импульсов',
  assessTarget: 'Оценить 5 сигналов',
  comboTarget: 'Решить комбо модулей',
  cipherTarget: 'Расшифровать код сигнала',
  daysLeft: 'дней осталось',
  continue: 'Продолжить',
  scanHint: 'НАЖИМАЙ · 1 ЭНЕРГИЯ',
  marketEvent: 'РЫНОЧНОЕ СОБЫТИЕ',
  eventAlert: 'РЫНОЧНАЯ АНОМАЛИЯ',
  eventChoose: 'Выбери контрмеру. У каждого решения своя цена и награда.',
  energyCost: 'Расход энергии',
  eventResolved: 'Рыночное событие устранено.',
  newSignalFound: 'Обнаружен новый сигнал:',
  loginStreak: 'СЕРИЯ ВХОДОВ',
  streakDays: 'дней подряд',
  nextReward: 'Следующая награда',
  dayShort: 'Д',
  cipherHint: 'Подсказка сообщества'
});

const MODULES = {
  lab: { icon: '◎', color: '#3ce3ff', en: ['Radar Core', 'Powers every active scan and sets the base Intel yield.'], ru: ['Ядро радара', 'Усиливает каждое сканирование и базовую добычу Интела.'] },
  power: { icon: 'ϟ', color: '#ffb84d', en: ['Power Cell', 'Expands Energy capacity and speeds up regeneration.'], ru: ['Энергоячейка', 'Увеличивает запас Энергии и ускоряет восстановление.'] },
  workshop: { icon: '◆', color: '#9c87ff', en: ['Chip Forge', 'Extends offline storage and improves rare hardware drops.'], ru: ['Фабрика чипов', 'Расширяет офлайн-хранилище и добычу редких деталей.'] },
  comms: { icon: '⌁', color: '#60b9ff', en: ['Market Feed', 'Boosts network income and scan power.'], ru: ['Рыночный поток', 'Увеличивает доход сети и мощность сканирования.'] },
  automation: { icon: '∞', color: '#65f3ae', en: ['Auto Scan', 'Keeps part of the network running while you are away.'], ru: ['Автосканер', 'Поддерживает работу сети, пока тебя нет в игре.'] },
  antenna: { icon: '↗', color: '#ff779c', en: ['Whale Tracker', 'Unlocks stronger signals and smart-wallet activity.'], ru: ['Трекер китов', 'Открывает сильные сигналы и активность смарт-кошельков.'] },
  analysis: { icon: '△', color: '#b39cff', en: ['Risk Decoder', 'Reveals more evidence before a market decision.'], ru: ['Декодер риска', 'Показывает больше данных перед решением по сигналу.'] },
  interceptor: { icon: '✦', color: '#ffd166', en: ['Alpha Interceptor', 'Captures rare anomalies and premium signal rewards.'], ru: ['Альфа-перехватчик', 'Ловит редкие аномалии и премиальные награды.'] }
};

const state = {
  config: null, game: null, screen: 'radar', language: 'en',
  selectedCombo: [], pendingScans: 0, scanTimer: null, scanBusy: false,
  pollTimer: null, toastTimer: null, sheet: null, lastFocus: null,
  actionBusy: false, decisionBusy: false, selectedFactors: [], activeSignalId: null
};

const t = key => I18N[state.language]?.[key] ?? I18N.en[key] ?? key;
const fmt = value => new Intl.NumberFormat(state.language === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 0, notation: Number(value) >= 1_000_000 ? 'compact' : 'standard' }).format(Number(value) || 0);
const pct = value => `${Math.round(Number(value) || 0)}%`;
const money = (value, compact = true) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return t('encrypted');
  if (number > 0 && number < 0.01) return `$${number.toFixed(6).replace(/0+$/, '')}`;
  return new Intl.NumberFormat(state.language === 'ru' ? 'ru-RU' : 'en-US', { style:'currency', currency:'USD', maximumFractionDigits:number < 1 ? 4 : 0, notation:compact && number >= 10_000 ? 'compact' : 'standard' }).format(number);
};
const signedPct = value => {
  const number = Number(value);
  return Number.isFinite(number) ? `${number > 0 ? '+' : ''}${number.toFixed(1)}%` : '—';
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const duration = ms => {
  const seconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || payload.error || 'Network operation failed.');
    error.code = payload.error;
    throw error;
  }
  return payload;
}

function haptic(type = 'light') {
  try {
    if (!tg?.isVersionAtLeast?.('6.1')) return;
    if (['success','warning','error'].includes(type)) tg.HapticFeedback?.notificationOccurred(type);
    else if (type === 'select') tg.HapticFeedback?.selectionChanged();
    else tg.HapticFeedback?.impactOccurred(type);
  } catch {}
}

function notify(message, error = false) {
  clearTimeout(state.toastTimer);
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.toggle('error', error);
  toast.classList.add('show');
  state.toastTimer = setTimeout(() => toast.classList.remove('show'), error ? 4200 : 2600);
}

function applyLanguage() {
  document.documentElement.lang = state.language;
  document.querySelectorAll('[data-i18n]').forEach(node => {
    const value = t(node.dataset.i18n);
    if (typeof value === 'string') node.textContent = value;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => node.placeholder = t(node.dataset.i18nPlaceholder));
  document.querySelectorAll('[data-language]').forEach(button => button.classList.toggle('active', button.dataset.language === state.language));
}

function moduleCopy(id) {
  const module = MODULES[id];
  const copy = module?.[state.language] || module?.en || [id, ''];
  return { ...module, name: copy[0], description: copy[1] };
}

function leagueName(id) { return t(id || 'observer'); }

function taskView(task) {
  if (!task) return { title: t('launchSequence'), description: t('completeSetup') };
  if (String(task.id).startsWith('build_')) {
    const id = String(task.id).slice(6);
    return { title: `${t('taskUpgrade')}: ${moduleCopy(id).name}`, description: moduleCopy(id).description };
  }
  if (task.id === 'recon') return { title: t('taskSignal'), description: t('signalText') };
  if (task.id === 'supply') return { title: t('taskSupply'), description: t('resourceChips') };
  if (task.id === 'terminal_sync') return { title: t('taskCalibrate'), description: t('resourceIntel') };
  return { title: task.title || t('launchSequence'), description: task.description || t('completeSetup') };
}

function onboardingTaskView(onboarding) {
  const step = Math.max(0, Math.min(4, Number(onboarding?.step || 0)));
  return { title:t(`setup${step}Title`), description:t(`setup${step}Text`), step };
}

function setGame(game) {
  state.game = game;
  state.language = game.profile?.language || state.language || 'en';
  applyLanguage();
  renderAll();
  schedulePoll();
}

function renderAll() {
  if (!state.game) return;
  renderHud();
  renderRadar();
  renderUpgrades();
  renderSignals();
  renderMissions();
  renderNetwork();
  renderReturnReport();
}

function renderHud() {
  const game = state.game;
  const optimisticIntel = state.pendingScans * (game.gameplay?.scan?.tapPower || 1);
  $('intelValue').textContent = fmt(game.resources.data + optimisticIntel);
  $('energyValue').textContent = `${fmt(Math.max(0, game.resources.energy - state.pendingScans))}/${fmt(game.resources.energyMax)}`;
  $('chipsValue').textContent = fmt(game.resources.components);
  const league = game.gameplay?.league || { id: 'observer' };
  $('leagueName').textContent = leagueName(league.id);
  $('leagueMark').textContent = leagueName(league.id).slice(0, 1).toUpperCase();
}

function renderRadar() {
  const game = state.game;
  const scan = game.gameplay?.scan || { tapPower: 1 };
  $('tapPower').textContent = `+${scan.tapPower}`;
  $('profitHour').textContent = `${fmt(game.resources.productionPerHour)} ${t('income')}`;
  const signals = game.progression?.recon?.unlocked ? (game.progression?.recon?.signals || []) : [];
  $('signalCount').textContent = `${signals.length} ${t('waiting')}`;
  $('signalBadge').textContent = signals.length;
  $('signalBadge').classList.toggle('hidden', !signals.length);
  const positions = [[22,28],[72,24],[34,66],[76,61],[49,19],[17,57],[63,75],[84,42]];
  $('signalBlips').innerHTML = signals.slice(0, 8).map((signal, index) => `<button class="signal-blip ${Number(signal.smartWallets || 0) > 2 ? 'rare' : ''}" style="left:${positions[index][0]}%;top:${positions[index][1]}%;animation-delay:${index * .17}s" data-signal="${esc(signal.id)}" type="button" aria-label="${esc(signal.name)}"></button>`).join('');
  const combo = game.gameplay?.combo;
  $('comboState').textContent = combo?.claimed ? t('completed') : t('ready');
  $('airdropScore').textContent = `${fmt(game.gameplay?.airdrop?.total)} pts`;
  $('scanButton').disabled = Math.floor(game.resources.energy) - state.pendingScans < 1;
  renderScanProgress();
  renderMarketTape(signals);
  renderMarketEvent();
  renderStoryAction();
}

function renderScanProgress() {
  const scan = state.game.gameplay?.scan || { taps:0 };
  const taps = Math.max(0, Number(scan.taps || 0) + state.pendingScans);
  const milestone = taps % 25;
  const progress = milestone / 25;
  $('scanProgressText').textContent = `${milestone} / 25 ${t('pulses')}`;
  $('scanProgressBar').style.width = `${Math.round(progress * 100)}%`;
  $('scanProgressReward').textContent = Math.floor(taps / 25) < 10 ? '+1 SP' : t('nextSignal');
  $('scanButton').style.setProperty('--scan-progress', `${progress * 360}deg`);
}

function renderMarketTape(signals) {
  const tape = $('marketTape');
  if (!signals.length) {
    tape.innerHTML = `<div class="market-tape-empty"><span class="live-dot"></span><small>${t('liveFeed')}</small><b>${t('marketQuiet')}</b></div>`;
    return;
  }
  tape.innerHTML = signals.slice(0, 3).map(signal => {
    const change = Number(signal.market?.change24h);
    const direction = !Number.isFinite(change) ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
    return `<button class="tape-quote" data-signal="${esc(signal.id)}" type="button"><span><small>${t('liveFeed')}</small><b>${esc(signal.name)}</b></span><em class="${direction}">${signedPct(change)}</em></button>`;
  }).join('');
}

function renderMarketEvent() {
  const incidents = state.game.progression?.incidents;
  const button = $('marketEvent');
  const visible = Boolean(state.game.progression?.onboarding?.completed && (incidents?.active || incidents?.ready));
  button.classList.toggle('hidden', !visible);
  button.classList.toggle('active', Boolean(incidents?.active));
  button.disabled = Boolean(!incidents?.active && state.game.hero?.job);
  button.querySelector('b').textContent = incidents?.active?.title || t('marketEvent');
}

function renderStoryAction() {
  const button = $('storyAction');
  const onboarding = state.game.progression?.onboarding;
  const job = state.game.hero?.job;
  button.classList.remove('hidden');
  button.dataset.kind = '';
  button.dataset.value = '';
  const marker = button.querySelector('span');
  if (job) {
    marker.textContent = '···';
    button.querySelector('b').innerHTML = `<small>${t('operationRunning')}</small>${esc(job.label || t('launchSequence'))} · ${duration(job.remainingMs)}`;
    button.disabled = true;
    return;
  }
  button.disabled = false;
  if (!onboarding?.completed) {
    const step = Number(onboarding.step || 0);
    const setup = onboardingTaskView(onboarding);
    marker.textContent = `${step + 1}/5`;
    const actions = {
      0: ['action','emergency_lights', setup.title],
      1: ['action','boot_terminal', setup.title],
      2: ['screen','signals', setup.title],
      3: ['action','repair_power', setup.title],
      4: ['build','power', setup.title]
    };
    const current = actions[step] || actions[0];
    button.dataset.kind = current[0];
    button.dataset.value = current[1];
    button.querySelector('b').innerHTML = `<small>${t('onboardingProgress')}</small>${esc(current[2])}`;
    return;
  }
  marker.textContent = '→';
  const task = state.game.recommendedTask;
  if (!task) { button.classList.add('hidden'); return; }
  const copy = taskView(task);
  button.dataset.kind = task.target === 'map' ? 'screen' : 'mission';
  button.dataset.value = task.target === 'map' ? 'signals' : task.id;
  button.querySelector('b').innerHTML = `<small>${t('currentDirective')}</small>${esc(copy.title)}`;
}

function renderUpgrades() {
  const game = state.game;
  $('upgradeIncome').textContent = `${fmt(game.resources.productionPerHour)} ${t('income')}`;
  $('storageHours').textContent = `${game.resources.offlineCapacityHours}h`;
  const modules = game.modules || game.rooms;
  $('moduleGrid').innerHTML = (game.moduleOrder || game.roomOrder || []).map(id => {
    const item = modules[id];
    const copy = moduleCopy(id);
    const cost = item.nextUpgrade;
    const locked = !item.unlocked && !item.level;
    let action = `<button class="upgrade-button" type="button" disabled><b>${t('locked')}</b><small>${t('unlockReq')}</small></button>`;
    if (item.construction) action = `<button class="upgrade-button" type="button" disabled><b>${t('building')}</b><small>${duration(item.construction.remainingMs)}</small></button>`;
    else if (item.level >= item.maxLevel) action = `<button class="upgrade-button" type="button" disabled><b>${t('max')}</b><small>LV ${item.level}</small></button>`;
    else if (item.unlocked && cost) action = `<button class="upgrade-button" data-upgrade="${id}" type="button"><b>${item.level ? t('upgrade') : t('unlock')}</b><small>${fmt(cost.data)} I${cost.components ? ` · ${cost.components} ◆` : ''}</small></button>`;
    const levelProgress = Math.max(0, Math.min(100, Number(item.level || 0) / Number(item.maxLevel || 10) * 100));
    return `<article class="module-card ${locked ? 'locked' : ''}" style="--module-color:${copy.color}"><div class="module-icon">${copy.icon}</div><div class="module-copy"><div class="module-meta"><small>${t('level')} ${item.level}/${item.maxLevel}</small><span>+${fmt(item.intelPerHour || 0)} ${t('income')}</span></div><h3>${esc(copy.name)}</h3><p>${esc(copy.description)}</p><div class="module-level-track"><i style="width:${levelProgress}%"></i></div>${item.construction ? `<div class="build-progress"><i style="width:${Math.round((item.construction.progress || 0) * 100)}%"></i></div>` : ''}</div>${action}</article>`;
  }).join('');
}

function renderSignals() {
  const game = state.game;
  const stats = game.stats || {};
  $('signalSummary').innerHTML = `<span><b>${pct(stats.accuracy30)}</b><small>${t('accuracy')}</small></span><span><b>${fmt(stats.attempts30)}</b><small>${t('attempts')}</small></span><span><b>${fmt(stats.correct30)}</b><small>${t('correct')}</small></span>`;
  const unlocked = Boolean(game.progression?.recon?.unlocked);
  const signals = unlocked ? (game.progression?.recon?.signals || []) : [];
  if (!signals.length) {
    $('signalList').innerHTML = `<div class="empty-state"><span>⌁</span><h3>${t('noSignals')}</h3><p>${unlocked ? t('noSignalsText') : t('signalLocked')}</p></div>`;
    return;
  }
  $('signalList').innerHTML = signals.map((signal, index) => { const change = Number(signal.market?.change24h); const direction = !Number.isFinite(change) ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat'; return `<button class="signal-card" data-signal="${esc(signal.id)}" type="button"><span class="signal-orbit">${index + 1}</span><span><h3>${esc(signal.name)}</h3><p>${money(signal.market?.price, false)} · ${t('liquidity')} ${fmt(signal.liquidity)}/100</p></span><span class="signal-side"><b class="${direction}">${signedPct(change)}</b><small>${signal.source === 'xradar' ? 'XRADAR LIVE' : 'LOCAL SCAN'}</small></span></button>`; }).join('');
}

function renderMissions() {
  const game = state.game;
  const onboarding = game.progression?.onboarding;
  const task = game.recommendedTask;
  const taskCopy = !onboarding?.completed ? onboardingTaskView(onboarding) : taskView(task);
  const storyMarker = !onboarding?.completed ? `${taskCopy.step + 1}/5` : '→';
  $('missionStory').innerHTML = !onboarding?.completed || task ? `<button class="story-card" data-story="true" type="button"><span>${storyMarker}</span><div><h3>${esc(taskCopy.title)}</h3><p>${esc(taskCopy.description)}</p></div></button>` : '';
  const combo = game.gameplay?.combo;
  if (combo?.claimed) state.selectedCombo = [];
  $('comboReward').textContent = combo?.claimed ? `✓ ${t('completed')}` : '+40 SP';
  $('comboSlots').innerHTML = combo?.claimed
    ? [1,2,3].map(() => `<button class="combo-slot filled" type="button" disabled>✓</button>`).join('')
    : [0,1,2].map(index => {
      const id = state.selectedCombo[index];
      return `<button class="combo-slot ${id ? 'filled' : ''}" data-combo-picker="true" type="button">${id ? esc(moduleCopy(id).name) : `+ ${index + 1}`}</button>`;
    }).join('');
  $('comboSubmit').disabled = Boolean(combo?.claimed);
  $('comboSubmit').textContent = combo?.claimed ? t('completed') : t('checkCombo');
  $('cipherInput').disabled = Boolean(game.gameplay?.cipher?.claimed);
  $('cipherInput').placeholder = game.gameplay?.cipher?.hint || '_ _ _ _ _';
  $('cipherSubmit').disabled = Boolean(game.gameplay?.cipher?.claimed);
  $('cipherSubmit').textContent = game.gameplay?.cipher?.claimed ? '✓' : t('decode');
  $('dailyStats').innerHTML = `<div class="daily-stat"><b>${fmt(game.progression?.streak?.current)}</b><small>${t('streak')}</small></div><div class="daily-stat"><b>${fmt(game.progression?.daily?.attempts)}/5</b><small>${t('dailyCalls')}</small></div><div class="daily-stat"><b>${fmt(game.gameplay?.airdrop?.signalPoints)}</b><small>${t('signalPoints')}</small></div>`;
  const streak = Math.max(1, Number(game.progression?.streak?.current || 1));
  const cycleDay = ((streak - 1) % 7) + 1;
  const rewards = [1, 2, 3, 5, 8, 8, 8];
  const nextReward = rewards[Math.min(6, cycleDay)];
  $('streakCard').innerHTML = `<article class="streak-card"><div class="streak-card-head"><span><small>${t('loginStreak')}</small><b>${fmt(streak)} ${t('streakDays')}</b></span><b>${t('nextReward')}: +${nextReward} ◆</b></div><div class="streak-days">${rewards.map((reward, index) => { const day = index + 1; const status = day < cycleDay ? 'done' : day === cycleDay ? 'current' : ''; return `<span class="streak-day ${status}"><b>${status === 'done' ? '✓' : `${t('dayShort')}${day}`}</b><small>+${reward} ◆</small></span>`; }).join('')}</div></article>`;
  const briefTasks = [
    { label:t('scanTarget'), value:Math.min(100, Number(game.gameplay?.scan?.taps || 0)), max:100 },
    { label:t('assessTarget'), value:Math.min(5, Number(game.progression?.daily?.attempts || 0)), max:5 },
    { label:t('comboTarget'), value:game.gameplay?.combo?.claimed ? 1 : 0, max:1 },
    { label:t('cipherTarget'), value:game.gameplay?.cipher?.claimed ? 1 : 0, max:1 }
  ];
  const briefProgress = Math.round(briefTasks.reduce((sum, taskItem) => sum + taskItem.value / taskItem.max, 0) / briefTasks.length * 100);
  $('commandBrief').innerHTML = `<article class="command-brief"><div class="command-brief-head"><span><small>${t('dailyBrief')}</small><b>${t('briefProgress')}</b></span><em>${briefProgress}%</em></div><div class="brief-master-track"><i style="width:${briefProgress}%"></i></div><div class="brief-task-list">${briefTasks.map(taskItem => { const done = taskItem.value >= taskItem.max; return `<div class="brief-task ${done ? 'done' : ''}"><i>${done ? '✓' : ''}</i><span><b>${taskItem.label}</b><small>${fmt(taskItem.value)} / ${fmt(taskItem.max)}</small></span></div>`; }).join('')}</div></article>`;
}

function renderNetwork() {
  const game = state.game;
  $('profileName').textContent = game.profile?.appearance?.callSign || game.profile?.firstName || 'Operator';
  const league = game.gameplay?.league || { id: 'observer', score: 0, progress: 0 };
  const nextCopy = league.next ? `${t('nextLeague')}: ${leagueName(league.next.id)} · ${fmt(league.next.min)} pts` : t('topLeague');
  $('leagueCard').innerHTML = `<div class="league-top"><span class="league-emblem">${leagueName(league.id).slice(0,1).toUpperCase()}</span><span><small>${t('season')} ${esc(game.gameplay?.airdrop?.seasonId || '')} · ${fmt(game.progression?.season?.daysRemaining)} ${t('daysLeft')}</small><h3>${esc(leagueName(league.id))}</h3></span><b>${fmt(league.score)}</b></div><div class="progress-bar"><i style="width:${Math.round((league.progress || 0) * 100)}%"></i></div><div class="progress-copy"><span>${esc(nextCopy)}</span><span>${Math.round((league.progress || 0) * 100)}%</span></div>`;
  const score = game.gameplay?.airdrop || { total: 0, breakdown: {} };
  $('scoreTotal').textContent = fmt(score.total);
  const labels = { network:'scoreNetwork', accuracy:'scoreAccuracy', activity:'scoreActivity', xradar:'scoreXradar', referrals:'scoreReferrals', signalPoints:'scoreSignalPoints' };
  const max = Math.max(1, ...Object.values(score.breakdown || {}));
  $('scoreBreakdown').innerHTML = Object.entries(score.breakdown || {}).map(([key, value]) => `<div class="score-row"><span>${t(labels[key] || key)}</span><div class="score-track"><i style="width:${Math.round(value / max * 100)}%"></i></div><b>${fmt(value)}</b></div>`).join('');
  $('referralCode').textContent = game.profile?.referralCode || '';
  document.querySelectorAll('[data-language]').forEach(button => button.classList.toggle('active', button.dataset.language === state.language));
}

function setScreen(screen) {
  if (!['radar','upgrades','signals','missions','network'].includes(screen)) return;
  state.screen = screen;
  document.querySelectorAll('.screen').forEach(node => node.classList.toggle('active', node.id === `screen-${screen}`));
  document.querySelectorAll('[data-screen]').forEach(button => button.classList.toggle('active', button.dataset.screen === screen));
  closeSheet();
  haptic('select');
}

function openSheet(eyebrow, title, html) {
  state.lastFocus = document.activeElement;
  $('sheetEyebrow').textContent = eyebrow;
  $('sheetTitle').textContent = title;
  $('sheetBody').innerHTML = html;
  $('sheet').classList.add('open');
  $('sheet').setAttribute('aria-hidden', 'false');
  state.sheet = title;
  requestAnimationFrame(() => $('sheetClose').focus({ preventScroll:true }));
}

function closeSheet() {
  const wasOpen = $('sheet').classList.contains('open');
  $('sheet').classList.remove('open');
  $('sheet').setAttribute('aria-hidden', 'true');
  state.sheet = null;
  if (wasOpen && state.lastFocus?.isConnected) state.lastFocus.focus({ preventScroll:true });
  state.lastFocus = null;
}

function openSignal(id) {
  if (!state.game.progression?.recon?.unlocked) return notify(t('signalLocked'), true);
  const signal = state.game.progression?.recon?.signals?.find(item => item.id === id);
  if (!signal) return;
  if (state.activeSignalId !== id) state.selectedFactors = [];
  state.activeSignalId = id;
  const market = signal.market || {};
  const change = Number(market.change24h);
  const direction = !Number.isFinite(change) ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  const concentration = Number.isFinite(Number(signal.concentration)) ? `${fmt(signal.concentration)}%` : t('encrypted');
  const factorOptions = [
    ['thin_liquidity', 'factorThin', 'factorThinText', true],
    ['abnormal_activity', 'factorActivity', 'factorActivityText', true],
    ['holder_concentration', 'factorConcentration', 'factorConcentrationText', Number.isFinite(Number(signal.concentration))],
    ['mutable_contract', 'factorMutable', 'factorMutableText', typeof signal.mutable === 'boolean'],
    ['no_critical_flags', 'factorClear', 'factorClearText', true]
  ].filter(option => option[3]);
  const factorMarkup = factorOptions.map(([factorId, titleKey, textKey]) => `<button class="evidence-factor ${state.selectedFactors.includes(factorId) ? 'selected' : ''}" data-factor="${factorId}" type="button"><i>${state.selectedFactors.includes(factorId) ? '✓' : '+'}</i><span><b>${t(titleKey)}</b><small>${t(textKey)}</small></span></button>`).join('');
  openSheet(t('signalEvidence'), signal.name, `<div class="signal-market-head"><span><small>${t('price')}</small><b>${money(market.price, false)}</b></span><em class="${direction}">${signedPct(change)}</em></div><div class="signal-chart"><canvas id="signalChart" height="150" aria-label="${esc(signal.name)} price chart"></canvas><span>24H</span></div><div class="market-stat-grid"><div><small>${t('volume24h')}</small><b>${money(market.volume24hUsd)}</b></div><div><small>${t('marketCap')}</small><b>${money(market.marketCapUsd)}</b></div><div><small>${t('holders')}</small><b>${Number.isFinite(Number(market.holders)) ? fmt(market.holders) : t('encrypted')}</b></div><div><small>${t('tokenAge')}</small><b>${Number.isFinite(Number(market.ageHours)) ? `${fmt(market.ageHours)}${t('hoursShort')}` : t('encrypted')}</b></div></div><div class="evidence-title"><small>${t('signalEvidence')}</small><p>${t('signalActionHelp')}</p></div><div class="metric-grid"><div class="metric"><small>${t('activity')}</small><b>${fmt(signal.activity)}/100</b></div><div class="metric"><small>${t('liquidity')}</small><b>${fmt(signal.liquidity)}/100</b></div><div class="metric ${concentration === t('encrypted') ? 'locked-metric' : ''}"><small>${t('concentration')}</small><b>${concentration}</b></div><div class="metric"><small>${t('change24h')}</small><b class="${direction}">${signedPct(change)}</b></div></div><div class="hypothesis-head"><small>${t('buildHypothesis')}</small><b id="factorCount">${state.selectedFactors.length} ${t('factorsMarked')}</b></div><div class="evidence-factor-list">${factorMarkup}</div><div class="decision-grid sticky-decisions"><button class="decision-study" data-decision="study" data-signal-id="${esc(id)}" type="button" ${state.selectedFactors.length ? '' : 'disabled'}>${t('analyze')}</button><button class="decision-skip" data-decision="skip" data-signal-id="${esc(id)}" type="button" ${state.selectedFactors.length ? '' : 'disabled'}>${t('skip')}</button></div>`);
  requestAnimationFrame(() => drawSignalChart(market.priceSeries || []));
}

function toggleEvidenceFactor(id) {
  if (id === 'no_critical_flags') state.selectedFactors = state.selectedFactors.includes(id) ? [] : [id];
  else {
    state.selectedFactors = state.selectedFactors.filter(item => item !== 'no_critical_flags');
    state.selectedFactors = state.selectedFactors.includes(id) ? state.selectedFactors.filter(item => item !== id) : [...state.selectedFactors, id];
  }
  document.querySelectorAll('[data-factor]').forEach(button => {
    const selected = state.selectedFactors.includes(button.dataset.factor);
    button.classList.toggle('selected', selected);
    button.querySelector('i').textContent = selected ? '✓' : '+';
  });
  if ($('factorCount')) $('factorCount').textContent = `${state.selectedFactors.length} ${t('factorsMarked')}`;
  document.querySelectorAll('[data-decision]').forEach(button => { button.disabled = state.selectedFactors.length < 1; });
  haptic('select');
}

function factorLabel(id) {
  return t({ thin_liquidity:'factorThin', holder_concentration:'factorConcentration', mutable_contract:'factorMutable', abnormal_activity:'factorActivity', no_critical_flags:'factorClear' }[id] || id);
}

function showSignalDebrief(result) {
  const evidence = result.evidence || { score:0, relevant:[], matched:[] };
  const reward = result.reward || {};
  const relevant = (evidence.relevant || []).map(id => `<span class="debrief-factor ${evidence.matched?.includes(id) ? 'matched' : ''}">${evidence.matched?.includes(id) ? '✓' : '·'} ${esc(factorLabel(id))}</span>`).join('');
  const incorrect = (evidence.incorrect || []).map(id => `<span class="debrief-factor incorrect">× ${esc(factorLabel(id))}</span>`).join('');
  const rewardCopy = `+${fmt(reward.data)} I${reward.components ? ` · +${fmt(reward.components)} ◆` : ''}${reward.signalPoints ? ` · +${fmt(reward.signalPoints)} SP` : ''}`;
  openSheet(t('outcomeReport'), result.correct ? t('thesisConfirmed') : t('thesisRevised'), `<div class="debrief-hero ${result.correct ? 'success' : 'review'}"><div class="debrief-score" style="--score:${Math.max(0, Math.min(100, Number(evidence.score || 0)))}%"><span><b>${fmt(evidence.score)}</b><small>${t('evidenceScore')}</small></span></div><div><small>${result.correct ? t('correctCall') : t('wrongCall')}</small><b>${t('riskScore')}: ${fmt(result.risk)}/100</b></div></div><p class="debrief-explanation">${esc(result.explanation || '')}</p><div class="debrief-section"><small>${t('relevantEvidence')}</small><div class="debrief-factors">${relevant || `<span class="debrief-factor">${t('encrypted')}</span>`}</div></div>${incorrect ? `<div class="debrief-section debrief-incorrect"><small>${t('unsupportedEvidence')}</small><div class="debrief-factors">${incorrect}</div></div>` : ''}<div class="debrief-reward"><span><small>${t('rewardEarned')}</small><b>${rewardCopy}</b></span>${reward.evidenceData ? `<em>+${fmt(reward.evidenceData)} I ${t('insightBonus')}</em>` : ''}</div><button class="action-button debrief-continue" data-debrief-close="true" type="button">${t('continue')}</button>`);
}

function drawSignalChart(series) {
  const canvas = $('signalChart');
  if (!canvas || !Array.isArray(series) || series.length < 2) return;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(280, Math.round(rect.width || 320));
  const height = 150;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  const values = series.map(Number).filter(Number.isFinite);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(0.00000001, maximum - minimum);
  const x = index => index / (values.length - 1) * width;
  const y = value => 12 + (1 - (value - minimum) / range) * (height - 30);
  ctx.strokeStyle = 'rgba(255,255,255,.055)';
  ctx.lineWidth = 1;
  for (let row = 1; row < 4; row += 1) { const py = row * height / 4; ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(width, py); ctx.stroke(); }
  ctx.beginPath();
  values.forEach((value, index) => index ? ctx.lineTo(x(index), y(value)) : ctx.moveTo(x(index), y(value)));
  const rising = values.at(-1) >= values[0];
  const color = rising ? '#5ac8fa' : '#ff6b63';
  const fill = ctx.createLinearGradient(0, 0, 0, height);
  fill.addColorStop(0, rising ? 'rgba(90,200,250,.24)' : 'rgba(255,69,58,.2)');
  fill.addColorStop(1, 'rgba(5,5,5,0)');
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.beginPath();
  values.forEach((value, index) => index ? ctx.lineTo(x(index), y(value)) : ctx.moveTo(x(index), y(value)));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(width - 2, y(values.at(-1)), 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function openComboPicker() {
  const modules = state.game.moduleOrder || state.game.roomOrder;
  openSheet(t('dailyCombo'), t('selectThree'), `<p class="sheet-description">${t('comboHint')}</p><div class="module-picker">${modules.map(id => { const copy = moduleCopy(id); return `<button class="module-pick ${state.selectedCombo.includes(id) ? 'selected' : ''}" data-combo-module="${id}" type="button"><b>${copy.icon} ${esc(copy.name)}</b><small>LV ${state.game.modules?.[id]?.level || 0}</small></button>`; }).join('')}</div><button class="secondary-button" style="margin-top:10px" data-combo-done="true" type="button">${t('submitCombo')} (${state.selectedCombo.length}/3)</button>`);
}

async function openMarketEvent() {
  if (state.actionBusy) return;
  state.actionBusy = true;
  $('marketEvent').classList.add('loading');
  $('marketEvent').setAttribute('aria-busy', 'true');
  try {
    let active = state.game.progression?.incidents?.active;
    if (!active) {
      const response = await api('/api/game/incident/start', { method:'POST', body:{} });
      setGame(response.game);
      active = response.game.progression?.incidents?.active;
      haptic('warning');
    }
    if (!active) return;
    openSheet(t('eventAlert'), active.title || t('marketEvent'), `<p class="sheet-description">${esc(active.description || t('eventChoose'))}</p><p class="sheet-description">${t('eventChoose')}</p><div class="event-options">${(active.options || []).map(option => `<button class="event-option" data-event-action="${esc(option.id)}" type="button"><span><b>${esc(option.label || option.id)}</b><small>${t('energyCost')}: ${fmt(option.energy)} ⚡</small></span><em>+${fmt(option.reward?.data)} I${option.reward?.components ? ` · +${fmt(option.reward.components)} ◆` : ''}</em></button>`).join('')}</div>`);
  } catch (error) { notify(error.message, true); haptic('error'); }
  finally {
    state.actionBusy = false;
    $('marketEvent').classList.remove('loading');
    $('marketEvent').removeAttribute('aria-busy');
  }
}

async function resolveMarketEvent(action) {
  if (state.decisionBusy) return;
  state.decisionBusy = true;
  const buttons = [...document.querySelectorAll('[data-event-action]')];
  buttons.forEach(button => { button.disabled = true; button.classList.add('loading'); });
  try {
    const response = await api('/api/game/incident/resolve', { method:'POST', body:{ action } });
    closeSheet();
    setGame(response.game);
    notify(response.result?.message || t('eventResolved'));
    haptic('success');
  } catch (error) { notify(error.message, true); haptic('error'); }
  finally {
    state.decisionBusy = false;
    buttons.forEach(button => { button.disabled = false; button.classList.remove('loading'); });
  }
}

function toggleComboModule(id) {
  if (state.selectedCombo.includes(id)) state.selectedCombo = state.selectedCombo.filter(item => item !== id);
  else if (state.selectedCombo.length < 3) state.selectedCombo.push(id);
  else state.selectedCombo = [...state.selectedCombo.slice(1), id];
  openComboPicker();
  renderMissions();
}

function resourceInfo(type) {
  const map = {
    intel: [t('intel'), t('resourceIntel'), `${fmt(state.game.resources.productionPerHour)} ${t('income')}`],
    energy: [t('energy'), t('resourceEnergy'), `${fmt(state.game.resources.energyRegenPerHour)}/h`],
    chips: [t('chips'), t('resourceChips'), `${fmt(state.game.resources.components)} ${t('chips')}`]
  };
  const item = map[type];
  openSheet('RESOURCE', item[0], `<p class="sheet-description">${esc(item[1])}</p><div class="metric"><small>${t('networkOnline')}</small><b>${esc(item[2])}</b></div>`);
}

function spawnTapFx(event) {
  const box = $('tapFx').getBoundingClientRect();
  const node = document.createElement('span');
  node.className = 'tap-number';
  node.textContent = `+${state.game.gameplay?.scan?.tapPower || 1}`;
  node.style.left = `${Math.max(20, Math.min(box.width - 70, (event?.clientX || box.left + box.width/2) - box.left - 15))}px`;
  node.style.top = `${Math.max(70, Math.min(box.height - 100, (event?.clientY || box.top + box.height/2) - box.top - 20))}px`;
  $('tapFx').append(node);
  setTimeout(() => node.remove(), 850);
}

function queueScan(event) {
  const available = Math.floor(state.game.resources.energy) - state.pendingScans;
  if (available < 1) { notify(t('resourceEnergy'), true); haptic('warning'); return; }
  state.pendingScans += 1;
  $('scanButton').classList.remove('scanning');
  void $('scanButton').offsetWidth;
  $('scanButton').classList.add('scanning');
  spawnTapFx(event);
  renderHud();
  renderScanProgress();
  haptic('light');
  clearTimeout(state.scanTimer);
  state.scanTimer = setTimeout(flushScans, 420);
}

async function flushScans() {
  if (state.scanBusy || state.pendingScans < 1) return;
  state.scanBusy = true;
  const taps = Math.min(20, state.pendingScans);
  state.pendingScans -= taps;
  try {
    const response = await api('/api/game/scan', { method: 'POST', body: { taps } });
    setGame(response.game);
    if (response.result?.discoveredSignal) {
      notify(`${t('newSignalFound')} ${response.result.discoveredSignal.name}`);
      haptic('success');
    }
  } catch (error) {
    state.pendingScans = 0;
    notify(error.message, true);
  } finally {
    state.scanBusy = false;
    if (state.pendingScans > 0) state.scanTimer = setTimeout(flushScans, 160);
  }
}

async function startAction(id) {
  if (state.actionBusy) return;
  state.actionBusy = true;
  $('storyAction').classList.add('loading');
  $('storyAction').setAttribute('aria-busy', 'true');
  try {
    const response = await api('/api/game/action/start', { method:'POST', body:{ actionId:id } });
    setGame(response.game);
    notify(response.game.hero?.job?.label || t('operationRunning'));
    haptic('medium');
  } catch (error) { notify(error.message, true); haptic('error'); }
  finally {
    state.actionBusy = false;
    $('storyAction').classList.remove('loading');
    $('storyAction').removeAttribute('aria-busy');
    if (state.game) renderStoryAction();
  }
}

async function startBuild(id) {
  if (state.actionBusy) return;
  state.actionBusy = true;
  const sourceButton = [...document.querySelectorAll('[data-upgrade]')].find(button => button.dataset.upgrade === id);
  sourceButton?.classList.add('loading');
  sourceButton?.setAttribute('aria-busy', 'true');
  if (sourceButton) sourceButton.disabled = true;
  try {
    const response = await api('/api/game/build', { method:'POST', body:{ roomId:id } });
    setGame(response.game);
    notify(`${moduleCopy(id).name}: ${t('building')}`);
    haptic('medium');
  } catch (error) { notify(error.message, true); haptic('error'); }
  finally {
    state.actionBusy = false;
    sourceButton?.classList.remove('loading');
    sourceButton?.removeAttribute('aria-busy');
    if (sourceButton?.isConnected) sourceButton.disabled = false;
  }
}

async function resolveSignalDecision(id, decision) {
  if (!state.selectedFactors.length) return notify(t('chooseEvidence'), true);
  if (state.decisionBusy) return;
  state.decisionBusy = true;
  const buttons = [...document.querySelectorAll('[data-decision]')];
  buttons.forEach(button => { button.disabled = true; button.classList.add('loading'); button.setAttribute('aria-busy', 'true'); });
  try {
    const response = await api('/api/game/recon/resolve', { method:'POST', body:{ signalId:id, decision, factors:state.selectedFactors } });
    closeSheet();
    setGame(response.game);
    showSignalDebrief(response.result);
    state.selectedFactors = [];
    state.activeSignalId = null;
    haptic(response.result.correct ? 'success' : 'warning');
  } catch (error) { notify(error.message, true); haptic('error'); }
  finally {
    state.decisionBusy = false;
    buttons.forEach(button => { button.disabled = false; button.classList.remove('loading'); button.removeAttribute('aria-busy'); });
  }
}

async function submitCombo() {
  if (state.selectedCombo.length !== 3) { openComboPicker(); return; }
  if ($('comboSubmit').classList.contains('loading')) return;
  $('comboSubmit').classList.add('loading');
  $('comboSubmit').disabled = true;
  try {
    const response = await api('/api/game/daily/combo', { method:'POST', body:{ moduleIds:state.selectedCombo } });
    setGame(response.game);
    if (response.result.correct) { state.selectedCombo = []; closeSheet(); notify(t('comboSuccess')); haptic('success'); }
    else { state.selectedCombo = []; renderMissions(); notify(t('wrongCombo'), true); haptic('warning'); }
  } catch (error) { notify(error.message, true); }
  finally { $('comboSubmit').classList.remove('loading'); if (!state.game.gameplay?.combo?.claimed) $('comboSubmit').disabled = false; }
}

async function submitCipher() {
  const code = $('cipherInput').value.trim();
  if (code.length !== 5) return notify(t('cipherWrong'), true);
  if ($('cipherSubmit').classList.contains('loading')) return;
  $('cipherSubmit').classList.add('loading');
  $('cipherSubmit').disabled = true;
  try {
    const response = await api('/api/game/daily/cipher', { method:'POST', body:{ code } });
    $('cipherInput').value = '';
    setGame(response.game);
    notify(t('cipherSuccess'));
    haptic('success');
  } catch { notify(t('cipherWrong'), true); haptic('error'); }
  finally { $('cipherSubmit').classList.remove('loading'); if (!state.game.gameplay?.cipher?.claimed) $('cipherSubmit').disabled = false; }
}

async function saveLanguage(language) {
  if (!['en','ru'].includes(language) || language === state.language) return;
  try {
    const response = await api('/api/game/profile/language', { method:'POST', body:{ language } });
    state.language = language;
    setGame(response.game);
    notify(t('languageSaved'));
  } catch (error) { notify(error.message, true); }
}

async function connectReferral() {
  const code = $('referralInput').value.trim();
  if (!code) return;
  try {
    const response = await api('/api/game/referral/connect', { method:'POST', body:{ code, deviceId:deviceId() } });
    setGame(response.game);
    notify(t('connected'));
  } catch (error) { notify(error.message, true); }
}

async function shareReferral() {
  const code = state.game.profile?.referralCode || '';
  const url = `https://t.me/share/url?url=${encodeURIComponent(location.origin + '?ref=' + code)}&text=${encodeURIComponent(t('shareText'))}`;
  try {
    if (tg?.openTelegramLink) tg.openTelegramLink(url);
    else if (navigator.share) await navigator.share({ text:t('shareText'), url:location.origin + '?ref=' + code });
    else { await navigator.clipboard.writeText(code); notify(t('copied')); }
  } catch {}
}

function openXradar() {
  const url = state.config?.xradarBaseUrl;
  if (!url) return notify(t('notConfigured'), true);
  try { if (tg?.openLink) tg.openLink(url); else window.open(url, '_blank', 'noopener'); } catch { window.open(url, '_blank', 'noopener'); }
}

function renderReturnReport() {
  const report = state.game.progression?.returnReport;
  if (!report || $('modal').dataset.reportShown === String(report.createdAt || 'shown')) return;
  $('modal').dataset.reportShown = String(report.createdAt || 'shown');
  $('modalKicker').textContent = t('reportKicker');
  $('modalTitle').textContent = t('reportTitle');
  $('modalText').textContent = t('reportText')(fmt(report.data), Number(report.hours || 0).toFixed(1));
  $('modalButton').textContent = t('collect');
  $('modalButton').dataset.action = 'ack-report';
  $('modal').classList.remove('hidden');
}

async function acknowledgeReport() {
  try {
    const response = await api('/api/game/report/ack', { method:'POST', body:{} });
    $('modal').classList.add('hidden');
    setGame(response.game);
  } catch (error) { notify(error.message, true); }
}

function handleStoryAction() {
  const button = $('storyAction');
  if (button.dataset.kind === 'action') startAction(button.dataset.value);
  else if (button.dataset.kind === 'build') { setScreen('upgrades'); startBuild(button.dataset.value); }
  else if (button.dataset.kind === 'screen') setScreen(button.dataset.value);
  else setScreen('missions');
}

function schedulePoll() {
  clearTimeout(state.pollTimer);
  const busy = state.game?.hero?.job || state.game?.progression?.secondaryJob;
  state.pollTimer = setTimeout(refresh, busy ? 900 : 20_000);
}

async function refresh() {
  try { const response = await api('/api/game'); setGame(response.game); } catch { schedulePoll(); }
}

function deviceId() {
  let id = localStorage.getItem('xradar-device-id');
  if (!id) { id = crypto.randomUUID?.() || Math.random().toString(36).slice(2); localStorage.setItem('xradar-device-id', id); }
  return id;
}

async function enterGame() {
  const response = await api('/api/game');
  $('auth').classList.add('hidden');
  $('game').classList.remove('hidden');
  setGame(response.game);
}

async function authenticate(body) {
  const startParam = tg?.initDataUnsafe?.start_param || new URLSearchParams(location.search).get('ref') || '';
  await api('/api/auth/telegram', { method:'POST', body:{ ...body, deviceId:deviceId(), referralCode:startParam } });
  await enterGame();
}

async function boot() {
  try { tg?.ready?.(); tg?.expand?.(); } catch {}
  applyLanguage();
  try {
    state.config = await api('/api/config');
    try { await enterGame(); return; } catch {}
    if (tg?.initData) { await authenticate({ initData:tg.initData }); return; }
    if (state.config.allowDevAuth) {
      $('authButton').classList.remove('hidden');
      $('authStatus').textContent = state.language === 'ru' ? 'Локальный режим готов' : 'Local simulation ready';
      return;
    }
    $('authStatus').textContent = state.language === 'ru' ? 'Открой игру внутри Telegram' : 'Open the game inside Telegram';
  } catch (error) { $('authStatus').textContent = error.message; }
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.screen) return setScreen(button.dataset.screen);
  if (button.dataset.signal) return openSignal(button.dataset.signal);
  if (button.dataset.upgrade) return startBuild(button.dataset.upgrade);
  if (button.dataset.decision) return resolveSignalDecision(button.dataset.signalId, button.dataset.decision);
  if (button.dataset.factor) return toggleEvidenceFactor(button.dataset.factor);
  if (button.dataset.debriefClose) { closeSheet(); setScreen(state.game.progression?.recon?.signals?.length ? 'signals' : 'radar'); return; }
  if (button.dataset.eventAction) return resolveMarketEvent(button.dataset.eventAction);
  if (button.dataset.comboPicker) return openComboPicker();
  if (button.dataset.comboModule) return toggleComboModule(button.dataset.comboModule);
  if (button.dataset.comboDone) { closeSheet(); renderMissions(); return; }
  if (button.dataset.language) return saveLanguage(button.dataset.language);
  if (button.dataset.story) return handleStoryAction();
  if (button.dataset.resource) return resourceInfo(button.dataset.resource);
});

$('authButton').addEventListener('click', async () => {
  if ($('authButton').classList.contains('loading')) return;
  $('authButton').classList.add('loading');
  $('authButton').disabled = true;
  try { await authenticate({ dev:true }); }
  catch (error) { $('authStatus').textContent = error.message; notify(error.message, true); }
  finally { $('authButton').classList.remove('loading'); $('authButton').disabled = false; }
});
$('scanButton').addEventListener('pointerdown', queueScan);
$('marketEvent').addEventListener('click', openMarketEvent);
$('storyAction').addEventListener('click', handleStoryAction);
$('signalQueue').addEventListener('click', () => setScreen('signals'));
$('comboShortcut').addEventListener('click', () => setScreen('missions'));
$('airdropShortcut').addEventListener('click', () => setScreen('network'));
$('leagueButton').addEventListener('click', () => setScreen('network'));
$('sheetClose').addEventListener('click', closeSheet);
$('comboSubmit').addEventListener('click', submitCombo);
$('cipherSubmit').addEventListener('click', submitCipher);
$('connectReferral').addEventListener('click', connectReferral);
$('shareReferral').addEventListener('click', shareReferral);
$('openXradar').addEventListener('click', openXradar);
$('modalButton').addEventListener('click', () => { if ($('modalButton').dataset.action === 'ack-report') acknowledgeReport(); });

document.addEventListener('keydown', event => { if (event.key === 'Escape' && state.sheet) closeSheet(); });

window.addEventListener('beforeunload', () => { if (state.pendingScans) flushScans(); });
boot();
