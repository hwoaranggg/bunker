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
    revealTitle: 'SIGNAL DECLASSIFIED', revealLive: 'Live token from the XRadar feed', revealSince: 'move after XRadar flagged it', revealHour: 'move over the last hour', revealScore: 'XRadar score', revealOpen: 'Track it in XRadar ↗', revealShare: 'Share this call',
    revealShareText: (symbol, move, correct) => `${correct ? 'Called it' : 'Missed it'}: $${symbol} did ${move} on the XRadar live feed. Can you read the signal before the market?`,
    achTitle: 'ACHIEVEMENTS', achEarned: 'earned', achLocked: 'Locked', achUnlocked: 'ACHIEVEMENT UNLOCKED', achReward: 'Reward', achGear: 'Gear unlocked', achClose: 'Continue',
    gearTitle: 'OPERATOR GEAR', gearEquip: 'Equip', gearEquipped: 'Equipped', gearSlotBody: 'Body', gearSlotTool: 'Tool', gearSlotHead: 'Head', gearNone: 'Nothing recovered yet.',
    posTitle: 'CONVICTION', posHelp: 'Stake Intel and choose how long to hold. The outcome is the real move of a real token.', posStake: 'Stake', posHorizon: 'Horizon', posOpen: 'OPEN POSITION', posIgnore: 'IGNORE',
    posOpened: 'Position opened. Come back when it resolves.', posOpenTitle: 'OPEN POSITIONS', posReady: 'Ready to reveal', posSettle: 'Reveal', posSettling: 'Revealing…', posStaked: 'staked', posNoLive: 'Live signals unavailable — the radar feed is still warming up.',
    posRecord: 'TRACK RECORD', posWinRate: 'Win rate', posRealized: 'Realized', posStreak: 'Streak', posBest: 'Best call', posSettled: 'Positions closed', posResult: 'Position closed', posReturned: 'Returned', posProfit: 'Profit', posLoss: 'Loss',
    convKicker: 'XRADAR TERMINAL', convTitle: 'Trade what you just called', convText: 'Take your reads to the live terminal. Make your first trade in XRadar and claim the operator bonus.', convOpen: 'Open XRadar ↗', convClaim: 'Claim +10 ◆', convClaimed: 'Operator bonus claimed', convVerified: 'Trade verified. +10 Chips added.', convNotVerified: 'No confirmed trade found on your XRadar account yet.',
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
    revealTitle: 'СИГНАЛ РАССЕКРЕЧЕН', revealLive: 'Живой токен из ленты XRadar', revealSince: 'движение после сигнала XRadar', revealHour: 'движение за последний час', revealScore: 'Оценка XRadar', revealOpen: 'Следить в XRadar ↗', revealShare: 'Поделиться прогнозом',
    revealShareText: (symbol, move, correct) => `${correct ? 'Угадал' : 'Не угадал'}: $${symbol} сделал ${move} в живой ленте XRadar. Прочитаешь сигнал раньше рынка?`,
    achTitle: 'ДОСТИЖЕНИЯ', achEarned: 'получено', achLocked: 'Закрыто', achUnlocked: 'ДОСТИЖЕНИЕ ОТКРЫТО', achReward: 'Награда', achGear: 'Открыто снаряжение', achClose: 'Продолжить',
    gearTitle: 'СНАРЯЖЕНИЕ ОПЕРАТОРА', gearEquip: 'Надеть', gearEquipped: 'Надето', gearSlotBody: 'Корпус', gearSlotTool: 'Инструмент', gearSlotHead: 'Голова', gearNone: 'Пока ничего не найдено.',
    posTitle: 'УБЕЖДЁННОСТЬ', posHelp: 'Поставь Интел и выбери, сколько держать. Исход — реальное движение реального токена.', posStake: 'Ставка', posHorizon: 'Горизонт', posOpen: 'ОТКРЫТЬ ПОЗИЦИЮ', posIgnore: 'ПРОПУСТИТЬ',
    posOpened: 'Позиция открыта. Возвращайся, когда раскроется.', posOpenTitle: 'ОТКРЫТЫЕ ПОЗИЦИИ', posReady: 'Готова к раскрытию', posSettle: 'Раскрыть', posSettling: 'Раскрываем…', posStaked: 'ставка', posNoLive: 'Живые сигналы недоступны — лента радара ещё прогревается.',
    posRecord: 'ТРЕК-РЕКОРД', posWinRate: 'Винрейт', posRealized: 'Реализовано', posStreak: 'Серия', posBest: 'Лучший колл', posSettled: 'Позиций закрыто', posResult: 'Позиция закрыта', posReturned: 'Возврат', posProfit: 'Прибыль', posLoss: 'Убыток',
    convKicker: 'ТЕРМИНАЛ XRADAR', convTitle: 'Торгуй тем, что оценил', convText: 'Перенеси свои прогнозы в живой терминал. Сделай первую сделку в XRadar и забери бонус оператора.', convOpen: 'Открыть XRadar ↗', convClaim: 'Забрать +10 ◆', convClaimed: 'Бонус оператора получен', convVerified: 'Сделка подтверждена. +10 чипов начислено.', convNotVerified: 'Подтверждённой сделки на твоём аккаунте XRadar пока нет.',
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

Object.assign(I18N.en, {
  genesisKicker: '24H GENESIS SIGNAL HUNT',
  genesisTitle: '1,000 founding operators',
  genesisClaimed: number => `GENESIS OPERATOR #${number}`,
  genesisPending: 'Complete 25 pulses and assess one signal to claim a permanent Genesis number.',
  genesisClosed: 'The first 1,000 Genesis positions have been claimed. Your intelligence record still counts.',
  genesisProgress: 'Genesis network progress',
  pulsesRequired: '25 market pulses',
  assessmentRequired: '1 signal assessment',
  spotsRemaining: 'spots remaining',
  activated: 'active',
  shareResult: 'Challenge the network',
  shareStory: 'Share to Story',
  sharingUnavailable: 'Telegram sharing will activate after TELEGRAM_BOT_USERNAME is configured.',
  leaderboardTitle: 'LIVE LEADERBOARDS',
  intelligenceRank: 'Intelligence ranking',
  recruiterRank: 'Top recruiters',
  genesisGrowth: 'GENESIS GROWTH',
  callsShort: 'calls',
  noRankings: 'No verified operators yet. Be the first.',
  referralsShort: 'qualified',
  scoreShort: 'score',
  genesisModalTitle: 'Genesis status confirmed',
  genesisModalText: number => `You are XRadar Genesis Operator #${number}. Your verified intelligence record is now live.`,
  genesisShareText: (number, score) => `I qualified as XRadar Genesis Operator #${number}. Intelligence score: ${score}. Can you see the signal before the market?`,
  genesisPendingShareText: score => `My XRadar intelligence score is ${score}. Can you see the signal before the market?`
});

Object.assign(I18N.ru, {
  genesisKicker: '24-ЧАСОВАЯ GENESIS-ОХОТА',
  genesisTitle: '1 000 первых операторов',
  genesisClaimed: number => `GENESIS-ОПЕРАТОР #${number}`,
  genesisPending: 'Выполни 25 импульсов и оцени один сигнал, чтобы получить постоянный Genesis-номер.',
  genesisClosed: 'Первые 1 000 Genesis-позиций уже заняты. Твой подтверждённый результат всё равно учитывается.',
  genesisProgress: 'Прогресс Genesis-сети',
  pulsesRequired: '25 рыночных импульсов',
  assessmentRequired: '1 оценка сигнала',
  spotsRemaining: 'мест осталось',
  activated: 'активно',
  shareResult: 'Бросить вызов',
  shareStory: 'В историю',
  sharingUnavailable: 'Telegram-шаринг включится после настройки TELEGRAM_BOT_USERNAME.',
  leaderboardTitle: 'ЖИВЫЕ РЕЙТИНГИ',
  intelligenceRank: 'Рейтинг аналитиков',
  recruiterRank: 'Лучшие рекрутеры',
  genesisGrowth: 'РОСТ GENESIS',
  callsShort: 'прогнозов',
  noRankings: 'Подтверждённых операторов пока нет. Стань первым.',
  referralsShort: 'активных',
  scoreShort: 'счёт',
  genesisModalTitle: 'Genesis-статус подтверждён',
  genesisModalText: number => `Ты стал Genesis-оператором XRadar #${number}. Твой подтверждённый результат уже в сети.`,
  genesisShareText: (number, score) => `Я стал Genesis-оператором XRadar #${number}. Intelligence Score: ${score}. Увидишь сигнал раньше рынка?`,
  genesisPendingShareText: score => `Мой Intelligence Score в XRadar: ${score}. Увидишь сигнал раньше рынка?`
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
  launch: null, accuracyLeaderboard: [], referralLeaderboard: [], growthBusy: false, growthLoadedAt: 0,
  selectedCombo: [], pendingScans: 0, scanTimer: null, scanBusy: false,
  pollTimer: null, toastTimer: null, sheet: null, lastFocus: null,
  actionBusy: false, decisionBusy: false, selectedFactors: [], activeSignalId: null,
  lastReveal: null,
  stake: null, horizon: 'm30', settleBusy: false, countdownTimer: null, liveSyncAt: 0, liveSyncBusy: false,
  pendingUnlock: null, unlockQueue: [], shownUnlocks: new Set()
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
  renderAchievements();
  renderGear();
  renderNetwork();
  renderReturnReport();
  renderGenesisClaim();
  renderAchievementUnlock();
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

const HORIZON_LABEL = { m5: '5m', m30: '30m', h1: '1h' };

function countdown(ms) {
  const total = Math.max(0, Math.round(Number(ms) || 0) / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Open positions and the record they build.
 *
 * A position that is still running is deliberately anonymous — showing the
 * ticker before it settles would hand the player the answer they staked on.
 */
function renderPositions() {
  const host = $('positionPanel');
  if (!host) return;
  const positions = state.game.progression?.positions;
  if (!positions) { host.innerHTML = ''; return; }
  const open = positions.open || [];
  const stats = positions.stats || {};
  const winRate = stats.settled ? Math.round((stats.wins / stats.settled) * 100) : 0;

  const openMarkup = open.length
    ? open.map(position => `<div class="position-row ${position.ready ? 'ready' : ''}">
        <span class="position-mark">${position.ready ? '◎' : '◌'}</span>
        <span class="position-body"><b>${esc(position.name)}</b><small>${fmt(position.stake)} I ${t('posStaked')} · ${HORIZON_LABEL[position.horizon] || position.horizon}</small></span>
        ${position.ready
          ? `<button class="position-settle" data-settle="${esc(position.id)}" type="button">${t('posSettle')}</button>`
          : `<span class="position-timer" data-countdown="${Number(position.msRemaining) || 0}">${countdown(position.msRemaining)}</span>`}
      </div>`).join('')
    : '';

  const recordMarkup = stats.settled
    ? `<div class="position-record"><small>${t('posRecord')}</small><div class="record-grid">
        <span><small>${t('posWinRate')}</small><b>${winRate}%</b></span>
        <span><small>${t('posRealized')}</small><b class="${stats.realized >= 0 ? 'up' : 'down'}">${stats.realized >= 0 ? '+' : ''}${fmt(stats.realized)} I</b></span>
        <span><small>${t('posStreak')}</small><b>${fmt(stats.streak)}</b></span>
        <span><small>${t('posSettled')}</small><b>${fmt(stats.settled)}</b></span>
      </div>${stats.best ? `<p class="record-best">${t('posBest')}: <b>$${esc(stats.best.symbol)}</b> ${stats.best.pct > 0 ? '+' : ''}${stats.best.pct}% · +${fmt(stats.best.profit)} I</p>` : ''}</div>`
    : '';

  host.innerHTML = open.length || stats.settled
    ? `<article class="positions-card"><div class="card-title"><span class="card-glyph cyan">◈</span><div><small>${t('posOpenTitle')}</small><h3>${fmt(open.length)}/${fmt(positions.maxOpen || 5)}</h3></div></div>${openMarkup}${recordMarkup}</article>`
    : '';
  scheduleCountdowns();
}

// One shared ticker: a timer per row would multiply intervals for nothing.
function scheduleCountdowns() {
  if (state.countdownTimer) return;
  state.countdownTimer = setInterval(() => {
    const nodes = document.querySelectorAll('[data-countdown]');
    if (!nodes.length) { clearInterval(state.countdownTimer); state.countdownTimer = null; return; }
    let expired = false;
    nodes.forEach(node => {
      const left = Math.max(0, Number(node.dataset.countdown) - 1000);
      node.dataset.countdown = String(left);
      node.textContent = countdown(left);
      if (left <= 0) expired = true;
    });
    if (expired) void refreshGame();
  }, 1000);
}

async function refreshGame() {
  try {
    const response = await api('/api/game');
    if (response.game) setGame(response.game);
  } catch { /* следующий тик попробует снова */ }
}

function renderSignals() {
  const game = state.game;
  const stats = game.stats || {};
  $('signalSummary').innerHTML = `<span><b>${pct(stats.accuracy30)}</b><small>${t('accuracy')}</small></span><span><b>${fmt(stats.attempts30)}</b><small>${t('attempts')}</small></span><span><b>${fmt(stats.correct30)}</b><small>${t('correct')}</small></span>`;
  renderPositions();
  const unlocked = Boolean(game.progression?.recon?.unlocked);
  const signals = unlocked ? (game.progression?.recon?.signals || []) : [];
  void ensureLiveSignals(unlocked, signals);
  if (!signals.length) {
    $('signalList').innerHTML = `<div class="empty-state"><span>⌁</span><h3>${t('noSignals')}</h3><p>${unlocked ? t('noSignalsText') : t('signalLocked')}</p></div>`;
    return;
  }
  $('signalList').innerHTML = signals.map((signal, index) => { const change = Number(signal.market?.change24h); const direction = !Number.isFinite(change) ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat'; return `<button class="signal-card" data-signal="${esc(signal.id)}" type="button"><span class="signal-orbit">${index + 1}</span><span><h3>${esc(signal.name)}</h3><p>${money(signal.market?.price, false)} · ${t('liquidity')} ${fmt(signal.liquidity)}/100</p></span><span class="signal-side"><b class="${direction}">${signedPct(change)}</b><small>${signal.source === 'xradar' ? 'XRADAR LIVE' : 'LOCAL SCAN'}</small></span></button>`; }).join('');
}

/**
 * Achievements and gear.
 *
 * Both systems already existed in the engine and neither was ever drawn: the
 * player earned chips and equipment without being told. Showing progress is
 * the point — a locked box says nothing, a bar at 18/25 is a reason to play.
 */
function renderAchievements() {
  const host = $('achievementPanel');
  if (!host) return;
  const achievements = state.game.progression?.achievements;
  const rows = achievements?.progress || [];
  if (!rows.length) { host.innerHTML = ''; return; }
  const definitions = achievements.definitions || {};
  const earnedCount = rows.filter(row => row.earned).length;
  // Earned first, then whatever the player is closest to finishing.
  const ordered = [...rows].sort((a, b) => (b.earned - a.earned) || (b.progress - a.progress));
  const cards = ordered.map(row => {
    const copy = definitions[row.id] || {};
    return `<div class="achievement ${row.earned ? 'earned' : ''}">
      <span class="achievement-mark">${row.earned ? '✓' : '◇'}</span>
      <span class="achievement-body">
        <b>${esc(copy.title || row.id)}</b>
        <small>${esc(copy.description || '')}</small>
        ${row.earned ? '' : `<span class="achievement-track"><i style="width:${Math.round(row.progress * 100)}%"></i></span><em>${fmt(row.value)} / ${fmt(row.target)}</em>`}
      </span>
      <span class="achievement-reward">+${fmt(row.components)} ◆</span>
    </div>`;
  }).join('');
  host.innerHTML = `<article class="achievements-card"><div class="card-title"><span class="card-glyph gold">★</span><div><small>${t('achTitle')}</small><h3>${earnedCount} / ${rows.length} ${t('achEarned')}</h3></div></div><div class="achievement-list">${cards}</div></article>`;
}

function renderGear() {
  const host = $('gearPanel');
  if (!host) return;
  const inventory = state.game.progression?.inventory;
  const owned = inventory?.owned || [];
  if (!owned.length) { host.innerHTML = ''; return; }
  const items = inventory.items || {};
  const outfit = state.game.hero?.outfit || {};
  const slotLabel = { body: t('gearSlotBody'), tool: t('gearSlotTool'), head: t('gearSlotHead') };
  const cards = owned.map(id => {
    const item = items[id] || {};
    const equipped = outfit[item.slot] === id;
    return `<button class="gear-item ${equipped ? 'equipped' : ''}" data-equip="${esc(id)}" type="button">
      <span class="gear-slot">${esc(slotLabel[item.slot] || item.slot || '')}</span>
      <b>${esc(item.name || id)}</b>
      <small>${esc(item.effect || '')}</small>
      <em>${equipped ? t('gearEquipped') : t('gearEquip')}</em>
    </button>`;
  }).join('');
  host.innerHTML = `<article class="gear-card"><div class="card-title"><span class="card-glyph violet">⬢</span><div><small>${t('gearTitle')}</small><h3>${fmt(owned.length)}</h3></div></div><div class="gear-list">${cards}</div></article>`;
}

/**
 * The unlock moment. Without it the reward is a number that quietly changes.
 *
 * It is queued rather than shown immediately: achievements fire on exactly the
 * actions that open their own sheet (settling a position, resolving a signal),
 * and opening this one first meant the result sheet overwrote it a moment
 * later — the player never saw the unlock at all. It waits for a free screen.
 */
function renderAchievementUnlock() {
  const queued = state.game.progression?.achievements?.pending || [];
  for (const unlocked of queued) {
    if (!unlocked?.id || state.unlockQueue.some(item => item.id === unlocked.id)) continue;
    if (state.shownUnlocks.has(unlocked.id)) continue;
    state.unlockQueue.push(unlocked);
  }
  flushAchievementUnlock();
}

function flushAchievementUnlock() {
  const unlocked = state.pendingUnlock || state.unlockQueue[0];
  if (!unlocked) return;
  // Wait while a sheet is open or an action that is about to open one is running.
  if (state.sheet || state.decisionBusy || state.settleBusy || state.actionBusy) return;
  state.pendingUnlock = null;
  state.unlockQueue = state.unlockQueue.filter(item => item.id !== unlocked.id);
  state.shownUnlocks.add(unlocked.id);
  // Tell the server it has been celebrated, so a reload does not repeat it.
  void api('/api/game/achievements/ack', { method:'POST', body:{ ids:[unlocked.id] } }).catch(() => {});
  const copy = state.game.progression?.achievements?.definitions?.[unlocked.id] || {};
  const gear = unlocked.grants ? state.game.progression?.inventory?.items?.[unlocked.grants] : null;
  haptic('success');
  openSheet(t('achUnlocked'), copy.title || unlocked.id, `<div class="unlock-hero"><span>★</span><p>${esc(copy.description || '')}</p></div>
    <div class="debrief-reward"><span><small>${t('achReward')}</small><b>+${fmt(unlocked.components)} ◆</b></span>${gear ? `<em>${t('achGear')}: ${esc(gear.name)}</em>` : ''}</div>
    <button class="action-button" data-debrief-close="true" type="button">${t('achClose')}</button>`);
}

async function equipGear(itemId) {
  try {
    const response = await api('/api/game/inventory/equip', { method:'POST', body:{ itemId } });
    setGame(response.game);
    haptic('select');
  } catch (error) { notify(error.message, true); }
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
  renderGenesis();
  renderGrowthRankings();
  void refreshGrowthData();
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
  renderConversion();
  document.querySelectorAll('[data-language]').forEach(button => button.classList.toggle('active', button.dataset.language === state.language));
}

/**
 * The step from playing to actually using XRadar.
 *
 * The server already decides when a player has earned the invitation
 * (`conversionTriggers` — deep automation, a strong analysis module, a good
 * 30-day accuracy) and pays the bonus only against a trade it can verify in
 * the radar's own ledger. Without this card none of that was reachable.
 */
function renderConversion() {
  const card = $('conversionCard');
  if (!card) return;
  if (!state.config?.xradarBaseUrl) { card.hidden = true; return; }
  const progression = state.game?.progression || {};
  const claimed = (progression.conversionRewarded || []).includes('first_trade');
  // A trigger means the player reached a milestone worth naming; otherwise the
  // standing invitation is shown.
  const headline = progression.conversionTriggers?.[0]?.title || t('convText');
  card.hidden = false;
  card.innerHTML = `<div class="card-title"><span class="card-glyph cyan">◎</span><div><small>${t('convKicker')}</small><h3>${t('convTitle')}</h3></div></div>
    <p>${esc(headline)}</p>
    <div class="conversion-actions">
      <button class="action-button" type="button" data-reveal-open="">${t('convOpen')}</button>
      ${claimed
        ? `<span class="conversion-claimed">✓ ${t('convClaimed')}</span>`
        : `<button class="secondary-button" type="button" data-conversion-claim="1">${t('convClaim')}</button>`}
    </div>`;
}

async function claimConversion() {
  try {
    const response = await api('/api/game/conversion/verify', { method:'POST', body:{ event:'first_trade' } });
    if (response.game) setGame(response.game);
    notify(t('convVerified'));
  } catch (error) {
    notify(error.code === 'CONVERSION_NOT_VERIFIED' ? t('convNotVerified') : error.message, true);
  }
}

function renderGenesis() {
  const growth = state.game?.progression?.growth || {};
  const genesis = growth.genesis || {};
  const launch = state.launch || { limit:genesis.limit || 1000, genesisIssued:0, remaining:genesis.limit || 1000, activatedPlayers:0 };
  const number = Number(genesis.number || 0);
  const limit = Number(launch.limit || genesis.limit || 1000);
  const issued = Math.min(limit, Number(launch.genesisIssued || 0));
  const activation = growth.activation || {};
  const pulsesDone = Number(activation.pulses || 0) >= Number(activation.pulsesRequired || 25);
  const assessmentDone = Number(activation.assessments || 0) >= Number(activation.assessmentsRequired || 1);
  const statusCopy = number
    ? t('genesisClaimed')(number)
    : genesis.status === 'capacity_reached' ? t('genesisClosed') : t('genesisPending');
  const shareConfigured = Boolean(state.config?.referralSharingConfigured);
  $('genesisCard').className = `genesis-card ${number ? 'claimed' : ''}`;
  $('genesisCard').innerHTML = `<div class="genesis-radar" aria-hidden="true"><i></i><i></i><span>${number ? `#${number}` : '1K'}</span></div><div class="genesis-copy"><small>${t('genesisKicker')}</small><h3>${number ? esc(t('genesisClaimed')(number)) : t('genesisTitle')}</h3><p>${esc(statusCopy)}</p></div><div class="genesis-meter"><div><span>${t('genesisProgress')}</span><b>${fmt(issued)} / ${fmt(limit)}</b></div><div class="genesis-track"><i style="width:${Math.round(issued / Math.max(1, limit) * 100)}%"></i></div><em>${fmt(launch.remaining)} ${t('spotsRemaining')}</em></div><div class="genesis-requirements"><span class="${pulsesDone ? 'done' : ''}"><i>${pulsesDone ? '✓' : ''}</i>${t('pulsesRequired')}</span><span class="${assessmentDone ? 'done' : ''}"><i>${assessmentDone ? '✓' : ''}</i>${t('assessmentRequired')}</span></div><div class="genesis-actions"><button data-share-mode="chat" type="button" ${shareConfigured ? '' : 'disabled'}>${t('shareResult')}</button><button data-share-mode="story" type="button" ${shareConfigured ? '' : 'disabled'}>${t('shareStory')}</button></div>${shareConfigured ? '' : `<small class="genesis-warning">${t('sharingUnavailable')}</small>`}`;
}

function renderGrowthRankings() {
  const launch = state.launch || {};
  $('launchActivated').textContent = `${fmt(launch.activatedPlayers || 0)} ${t('activated')}`;
  const accuracy = state.accuracyLeaderboard || [];
  const referrals = state.referralLeaderboard || [];
  $('accuracyLeaderboard').innerHTML = accuracy.length ? accuracy.slice(0, 10).map(entry => `<div class="ranking-row ${entry.self ? 'self' : ''}"><b>${entry.rank}</b><span><strong>${esc(entry.name)}</strong><small>${entry.genesisNumber ? `GENESIS #${fmt(entry.genesisNumber)} · ` : ''}${fmt(entry.attempts)} ${t('callsShort')}</small></span><em>${fmt(entry.accuracy)}%</em></div>`).join('') : `<p class="ranking-empty">${t('noRankings')}</p>`;
  $('referralLeaderboard').innerHTML = referrals.length ? referrals.slice(0, 10).map(entry => `<div class="ranking-row ${entry.self ? 'self' : ''}"><b>${entry.rank}</b><span><strong>${esc(entry.name)}</strong><small>${entry.genesisNumber ? `GENESIS #${fmt(entry.genesisNumber)}` : `${fmt(entry.signalPoints)} SP`}</small></span><em>${fmt(entry.referrals)} ${t('referralsShort')}</em></div>`).join('') : `<p class="ranking-empty">${t('noRankings')}</p>`;
}

async function refreshGrowthData(force = false) {
  if (!state.game || state.growthBusy || (!force && Date.now() - state.growthLoadedAt < 15_000)) return;
  state.growthBusy = true;
  try {
    const [launch, accuracy, referrals] = await Promise.all([
      api('/api/launch/status'),
      api('/api/game/leaderboard?limit=10&mode=accuracy'),
      api('/api/game/leaderboard?limit=10&mode=referrals')
    ]);
    state.launch = launch.launch;
    state.accuracyLeaderboard = accuracy.entries || [];
    state.referralLeaderboard = referrals.entries || [];
    state.growthLoadedAt = Date.now();
    renderGenesis();
    renderGrowthRankings();
  } catch {}
  finally { state.growthBusy = false; }
}

function setScreen(screen) {
  if (!['radar','upgrades','signals','missions','network'].includes(screen)) return;
  state.screen = screen;
  document.querySelectorAll('.screen').forEach(node => node.classList.toggle('active', node.id === `screen-${screen}`));
  document.querySelectorAll('[data-screen]').forEach(button => button.classList.toggle('active', button.dataset.screen === screen));
  closeSheet();
  if (screen === 'network') void refreshGrowthData(true);
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
  // Queued achievements wait for exactly this moment, and follow one another.
  if (wasOpen && (state.pendingUnlock || state.unlockQueue.length)) setTimeout(flushAchievementUnlock, 280);
}

function openSignal(id) {
  if (!state.game.progression?.recon?.unlocked) return notify(t('signalLocked'), true);
  const signal = state.game.progression?.recon?.signals?.find(item => item.id === id);
  if (!signal) return;
  if (state.activeSignalId !== id) { state.selectedFactors = []; state.stake = null; }
  state.activeSignalId = id;
  const positions = state.game.progression?.positions || {};
  const maxStake = Math.max(0, Math.floor(Number(positions.maxStake) || 0));
  const minStake = Math.max(1, Math.floor(Number(positions.minStake) || 50));
  // Three tiers instead of a slider: on a phone a slider is fiddly and the
  // exact number matters far less than the size of the commitment.
  const stakeTiers = [...new Set([minStake, Math.floor(maxStake / 2), maxStake])].filter(value => value >= minStake && value <= maxStake);
  if (!stakeTiers.includes(state.stake)) state.stake = stakeTiers[0] ?? null;
  if (!positions.horizons?.includes(state.horizon)) state.horizon = 'm30';
  const canStake = stakeTiers.length > 0 && (positions.open?.length || 0) < (positions.maxOpen || 5);
  const horizonLabel = { m5: '5m', m30: '30m', h1: '1h' };
  const stakeMarkup = stakeTiers.map(value => `<button class="stake-chip ${state.stake === value ? 'selected' : ''}" data-stake="${value}" type="button">${fmt(value)}</button>`).join('');
  const horizonMarkup = (positions.horizons || ['m5', 'm30', 'h1']).map(key => `<button class="horizon-chip ${state.horizon === key ? 'selected' : ''}" data-horizon="${key}" type="button"><b>${horizonLabel[key] || key}</b><small>×${(positions.multipliers?.[key] ?? 1)}</small></button>`).join('');
  const positionPanel = canStake
    ? `<div class="position-panel"><div class="evidence-title"><small>${t('posTitle')}</small><p>${t('posHelp')}</p></div><div class="stake-row"><small>${t('posStake')}</small><div class="chip-row">${stakeMarkup}</div></div><div class="stake-row"><small>${t('posHorizon')}</small><div class="chip-row">${horizonMarkup}</div></div></div>`
    : '';
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
  openSheet(t('signalEvidence'), signal.name, `<div class="signal-market-head"><span><small>${t('price')}</small><b>${money(market.price, false)}</b></span><em class="${direction}">${signedPct(change)}</em></div><div class="signal-chart"><canvas id="signalChart" height="150" aria-label="${esc(signal.name)} price chart"></canvas><span>24H</span></div><div class="market-stat-grid"><div><small>${t('volume24h')}</small><b>${money(market.volume24hUsd)}</b></div><div><small>${t('marketCap')}</small><b>${money(market.marketCapUsd)}</b></div><div><small>${t('holders')}</small><b>${Number.isFinite(Number(market.holders)) ? fmt(market.holders) : t('encrypted')}</b></div><div><small>${t('tokenAge')}</small><b>${Number.isFinite(Number(market.ageHours)) ? `${fmt(market.ageHours)}${t('hoursShort')}` : t('encrypted')}</b></div></div><div class="evidence-title"><small>${t('signalEvidence')}</small><p>${t('signalActionHelp')}</p></div><div class="metric-grid"><div class="metric"><small>${t('activity')}</small><b>${fmt(signal.activity)}/100</b></div><div class="metric"><small>${t('liquidity')}</small><b>${fmt(signal.liquidity)}/100</b></div><div class="metric ${concentration === t('encrypted') ? 'locked-metric' : ''}"><small>${t('concentration')}</small><b>${concentration}</b></div><div class="metric"><small>${t('change24h')}</small><b class="${direction}">${signedPct(change)}</b></div></div><div class="hypothesis-head"><small>${t('buildHypothesis')}</small><b id="factorCount">${state.selectedFactors.length} ${t('factorsMarked')}</b></div><div class="evidence-factor-list">${factorMarkup}</div>${positionPanel}<div class="decision-grid sticky-decisions">${canStake ? `<button class="decision-study" data-open-position="${esc(id)}" type="button" ${state.selectedFactors.length ? '' : 'disabled'}>${t('posOpen')}</button>` : `<button class="decision-study" data-decision="study" data-signal-id="${esc(id)}" type="button" ${state.selectedFactors.length ? '' : 'disabled'}>${t('analyze')}</button>`}<button class="decision-skip" data-decision="skip" data-signal-id="${esc(id)}" type="button" ${state.selectedFactors.length ? '' : 'disabled'}>${t('posIgnore')}</button></div>`);
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

/**
 * The payoff of a live signal: name the token, show what it really did and
 * offer the terminal. Local signals have no reveal and skip this entirely.
 *
 * The move is labelled by how it was measured — movement after XRadar flagged
 * the token reads very differently from a plain hourly change, and conflating
 * them would overclaim what the radar predicted.
 */
function revealMarkup(reveal, correct) {
  const pct = Number(reveal.actualPct || 0);
  const move = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
  const windowLabel = reveal.window === 'since_issue' ? t('revealSince') : t('revealHour');
  const openAttr = reveal.mint ? ` data-reveal-open="${esc(reveal.mint)}"` : ' data-reveal-open=""';
  return `<div class="reveal ${correct ? 'success' : 'review'}">
    <div class="reveal-head"><small>${t('revealTitle')}</small><b>$${esc(reveal.symbol)}</b>${reveal.dex ? `<em>${esc(reveal.dex)}</em>` : ''}</div>
    <div class="reveal-move ${pct >= 0 ? 'up' : 'down'}"><b>${move}</b><small>${windowLabel}</small></div>
    <div class="reveal-scores"><span><small>${t('revealScore')}</small><b>${fmt(reveal.xradarScore)}/100</b></span><span><small>${t('riskScore')}</small><b>${fmt(reveal.riskScore)}/100</b></span></div>
    <div class="reveal-actions"><button class="action-button reveal-open" type="button"${openAttr}>${t('revealOpen')}</button><button class="secondary-button reveal-share" type="button" data-reveal-share="1">${t('revealShare')}</button></div>
    <small class="reveal-note">${t('revealLive')}</small>
  </div>`;
}

function showSignalDebrief(result) {
  state.lastReveal = result.source === 'xradar' && result.reveal ? { reveal:result.reveal, correct:result.correct } : null;
  const evidence = result.evidence || { score:0, relevant:[], matched:[] };
  const reward = result.reward || {};
  const relevant = (evidence.relevant || []).map(id => `<span class="debrief-factor ${evidence.matched?.includes(id) ? 'matched' : ''}">${evidence.matched?.includes(id) ? '✓' : '·'} ${esc(factorLabel(id))}</span>`).join('');
  const incorrect = (evidence.incorrect || []).map(id => `<span class="debrief-factor incorrect">× ${esc(factorLabel(id))}</span>`).join('');
  const rewardCopy = `+${fmt(reward.data)} I${reward.components ? ` · +${fmt(reward.components)} ◆` : ''}${reward.signalPoints ? ` · +${fmt(reward.signalPoints)} SP` : ''}`;
  const reveal = state.lastReveal ? revealMarkup(state.lastReveal.reveal, result.correct) : '';
  openSheet(t('outcomeReport'), result.correct ? t('thesisConfirmed') : t('thesisRevised'), `<div class="debrief-hero ${result.correct ? 'success' : 'review'}"><div class="debrief-score" style="--score:${Math.max(0, Math.min(100, Number(evidence.score || 0)))}%"><span><b>${fmt(evidence.score)}</b><small>${t('evidenceScore')}</small></span></div><div><small>${result.correct ? t('correctCall') : t('wrongCall')}</small><b>${t('riskScore')}: ${fmt(result.risk)}/100</b></div></div><p class="debrief-explanation">${esc(result.explanation || '')}</p><div class="debrief-section"><small>${t('relevantEvidence')}</small><div class="debrief-factors">${relevant || `<span class="debrief-factor">${t('encrypted')}</span>`}</div></div>${incorrect ? `<div class="debrief-section debrief-incorrect"><small>${t('unsupportedEvidence')}</small><div class="debrief-factors">${incorrect}</div></div>` : ''}<div class="debrief-reward"><span><small>${t('rewardEarned')}</small><b>${rewardCopy}</b></span>${reward.evidenceData ? `<em>+${fmt(reward.evidenceData)} I ${t('insightBonus')}</em>` : ''}</div>${reveal}<button class="action-button debrief-continue" data-debrief-close="true" type="button">${t('continue')}</button>`);
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

/**
 * Pull a live wave when the queue holds no live signals.
 *
 * Nothing in the client ever requested one, so live XRadar signals could not
 * reach a player at all — the bridge was reachable only by hand.
 *
 * The trigger is deliberately "no live signals left", not "queue is empty":
 * onboarding seeds local practice signals and the engine tops them up whenever
 * the queue drains, so an empty queue is a state the player rarely sees. Once
 * the wave lands the condition goes false until those signals are used up, so
 * this does not loop. A cold feed just leaves the practice signals in place.
 */
async function ensureLiveSignals(unlocked, signals) {
  if (!unlocked || !state.config?.liveWaves || state.liveSyncBusy) return;
  if ((signals || []).some(signal => signal.source === 'xradar')) return;
  const now = Date.now();
  if (now - (state.liveSyncAt || 0) < 60_000) return;
  state.liveSyncBusy = true;
  state.liveSyncAt = now;
  try {
    const response = await api('/api/game/recon/sync-live', { method:'POST', body:{} });
    if (response.game) setGame(response.game);
  } catch { /* лента прогревается — остаёмся на локальных сигналах */ }
  finally { state.liveSyncBusy = false; }
}

async function openPositionAction(signalId) {
  if (!state.selectedFactors.length) return notify(t('chooseEvidence'), true);
  if (state.decisionBusy) return;
  state.decisionBusy = true;
  const button = document.querySelector('[data-open-position]');
  if (button) { button.disabled = true; button.classList.add('loading'); }
  try {
    const response = await api('/api/game/positions/open', {
      method:'POST',
      body:{ signalId, stake: state.stake, horizon: state.horizon, factors: state.selectedFactors }
    });
    closeSheet();
    setGame(response.game);
    state.selectedFactors = [];
    state.activeSignalId = null;
    notify(t('posOpened'));
  } catch (error) {
    notify(error.message, true);
    if (button) { button.disabled = false; button.classList.remove('loading'); }
  } finally { state.decisionBusy = false; }
}

async function settlePositionAction(positionId) {
  if (state.settleBusy) return;
  state.settleBusy = true;
  const button = document.querySelector(`[data-settle="${window.CSS?.escape ? CSS.escape(positionId) : positionId}"]`);
  if (button) { button.disabled = true; button.textContent = t('posSettling'); }
  try {
    const response = await api('/api/game/positions/settle', { method:'POST', body:{ positionId } });
    setGame(response.game);
    showPositionResult(response.result);
  } catch (error) {
    notify(error.message, true);
    if (button) { button.disabled = false; button.textContent = t('posSettle'); }
  } finally { state.settleBusy = false; }
}

function showPositionResult(result) {
  state.lastReveal = result.reveal ? { reveal: result.reveal, correct: result.correct } : null;
  const profit = Number(result.profit) || 0;
  const move = `${Number(result.pct) > 0 ? '+' : ''}${result.pct}%`;
  const pnl = `<div class="pnl-row ${profit >= 0 ? 'up' : 'down'}">
    <span><small>${t('posStake')}</small><b>${fmt(result.stake)} I</b></span>
    <span><small>${t('posReturned')}</small><b>${fmt(result.returned)} I</b></span>
    <span><small>${profit >= 0 ? t('posProfit') : t('posLoss')}</small><b>${profit >= 0 ? '+' : ''}${fmt(profit)} I</b></span>
  </div>`;
  const reveal = result.reveal ? revealMarkup(result.reveal, result.correct) : '';
  openSheet(t('posResult'), `${HORIZON_LABEL[result.horizon] || result.horizon} · ${move}`, `${pnl}${reveal}<button class="action-button debrief-continue" data-debrief-close="true" type="button">${t('continue')}</button>`);
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

async function shareReferral(mode = 'chat') {
  try {
    const response = await api('/api/growth/share', { method:'POST', body:{} });
    if (response.game) setGame(response.game);
    const url = response.referralUrl;
    const number = Number(response.game?.progression?.growth?.genesis?.number || 0);
    const score = Number(response.game?.gameplay?.airdrop?.total || 0);
    const text = number ? t('genesisShareText')(number, fmt(score)) : t('genesisPendingShareText')(fmt(score));
    if (mode === 'story' && tg?.shareToStory && state.config?.genesisStoryUrl) {
      tg.shareToStory(state.config.genesisStoryUrl, { text, widget_link:{ url, name:'Join XRadar' } });
      return;
    }
    const telegramShare = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(telegramShare);
    else if (navigator.share) await navigator.share({ text, url });
    else { await navigator.clipboard.writeText(url); notify(t('copied')); }
  } catch (error) { notify(error.message, true); }
}

// A mint deep-links straight to that token in the terminal, which is the whole
// point of the reveal: the player lands on the chart they just judged.
function openXradar(mint = '') {
  const base = state.config?.xradarBaseUrl;
  if (!base) return notify(t('notConfigured'), true);
  const url = mint ? `${base}${base.includes('?') ? '&' : '?'}mint=${encodeURIComponent(mint)}` : base;
  void api('/api/growth/xradar-open', { method:'POST', body:{} }).catch(() => {});
  try { if (tg?.openLink) tg.openLink(url); else window.open(url, '_blank', 'noopener'); } catch { window.open(url, '_blank', 'noopener'); }
}

// Sharing a call carries the player's own referral link, so a good reveal
// recruits the next operator instead of just being a screenshot.
async function shareSignalCall() {
  const snapshot = state.lastReveal;
  if (!snapshot) return;
  try {
    const response = await api('/api/growth/share', { method:'POST', body:{} });
    if (response.game) setGame(response.game);
    const url = response.referralUrl;
    const value = Number(snapshot.reveal.actualPct || 0);
    const move = `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    const text = t('revealShareText')(snapshot.reveal.symbol, move, snapshot.correct);
    const telegramShare = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(telegramShare);
    else if (navigator.share) await navigator.share({ text, url });
    else { await navigator.clipboard.writeText(url); notify(t('copied')); }
  } catch (error) { notify(error.message, true); }
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

function renderGenesisClaim() {
  const number = Number(state.game?.progression?.growth?.genesis?.number || 0);
  if (!number) return;
  const storageKey = `xradar-genesis-shown-${number}`;
  try { if (localStorage.getItem(storageKey)) return; localStorage.setItem(storageKey, '1'); } catch {}
  $('modalKicker').textContent = t('genesisKicker');
  $('modalTitle').textContent = t('genesisModalTitle');
  $('modalText').textContent = t('genesisModalText')(number);
  $('modalButton').textContent = t('shareResult');
  $('modalButton').dataset.action = 'genesis-share';
  $('modal').classList.remove('hidden');
  haptic('success');
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
  const jobs = [state.game?.hero?.job, state.game?.progression?.secondaryJob].filter(Boolean);
  const remaining = jobs.length ? Math.min(...jobs.map(job => Number(job.remainingMs || 0))) : null;
  const delay = remaining === null ? 45_000 : Math.min(45_000, Math.max(1_500, remaining + 250));
  state.pollTimer = setTimeout(refresh, delay);
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
  const search = new URLSearchParams(location.search);
  const source = search.get('src');
  const startParam = tg?.initDataUnsafe?.start_param || search.get('startapp') || search.get('ref') || (source ? `SRC_${source}` : '');
  await api('/api/auth/telegram', { method:'POST', body:{ ...body, deviceId:deviceId(), startParam } });
  await enterGame();
}

async function boot() {
  try { tg?.ready?.(); tg?.expand?.(); } catch {}
  applyLanguage();
  try {
    state.config = await api('/api/config');
    const launch = await api('/api/launch/status').catch(() => null);
    state.launch = launch?.launch || null;
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
  if (button.dataset.openPosition) return openPositionAction(button.dataset.openPosition);
  if (button.dataset.settle) return settlePositionAction(button.dataset.settle);
  if (button.dataset.stake) { state.stake = Number(button.dataset.stake); return openSignal(state.activeSignalId); }
  if (button.dataset.horizon) { state.horizon = button.dataset.horizon; return openSignal(state.activeSignalId); }
  if (button.hasAttribute('data-reveal-open')) return openXradar(button.dataset.revealOpen);
  if (button.dataset.revealShare) return shareSignalCall();
  if (button.dataset.conversionClaim) return claimConversion();
  if (button.dataset.equip) return equipGear(button.dataset.equip);
  if (button.dataset.debriefClose) { closeSheet(); setScreen(state.game.progression?.recon?.signals?.length ? 'signals' : 'radar'); return; }
  if (button.dataset.eventAction) return resolveMarketEvent(button.dataset.eventAction);
  if (button.dataset.comboPicker) return openComboPicker();
  if (button.dataset.comboModule) return toggleComboModule(button.dataset.comboModule);
  if (button.dataset.comboDone) { closeSheet(); renderMissions(); return; }
  if (button.dataset.language) return saveLanguage(button.dataset.language);
  if (button.dataset.shareMode) return shareReferral(button.dataset.shareMode);
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
$('shareReferral').addEventListener('click', () => shareReferral('chat'));
$('openXradar').addEventListener('click', openXradar);
$('modalButton').addEventListener('click', () => {
  if ($('modalButton').dataset.action === 'ack-report') acknowledgeReport();
  if ($('modalButton').dataset.action === 'genesis-share') { $('modal').classList.add('hidden'); shareReferral('chat'); }
});

document.addEventListener('keydown', event => { if (event.key === 'Escape' && state.sheet) closeSheet(); });

window.addEventListener('beforeunload', () => { if (state.pendingScans) flushScans(); });
boot();
