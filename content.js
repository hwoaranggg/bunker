/**
 * Localized content layer.
 *
 * The server stays the single source of truth for every player-visible string.
 * The client holds no copy of this table — it renders whatever the payload
 * carries. That is deliberate: the previous split, where the client kept its
 * own English dictionaries to mask Russian coming off the server, drifted the
 * moment one field was added on only one side.
 *
 * Error messages are the one exception. They travel as stable `code` values and
 * the client renders them from its own chrome dictionary, so a throw deep in the
 * engine never has to know which language the player picked.
 *
 * Structural facts — floors, bonuses, slots, costs, rewards — live in
 * gameEngine.js and are language-neutral. Only prose lives here.
 */

export const LANGUAGES = Object.freeze(['en', 'ru']);
export const DEFAULT_LANGUAGE = 'en';

export function normalizeLanguage(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return DEFAULT_LANGUAGE;
  // Telegram sends IETF tags such as "ru-RU" or "en-GB"; match on the primary
  // subtag so regional variants land on the right table instead of the default.
  const primary = raw.split(/[-_]/)[0];
  return LANGUAGES.includes(primary) ? primary : DEFAULT_LANGUAGE;
}

export function copyFor(language) {
  return COPY[normalizeLanguage(language)];
}

const en = {
  rooms: {
    lab: {
      name: 'Radar Core',
      short: 'The primary intelligence engine for active market scanning.',
      effect: 'Produces Intel. Higher levels sharply increase hourly output.',
      xradar: 'Trading terminal and core analytics'
    },
    power: {
      name: 'Power Cell',
      short: 'Expands the energy reserve and accelerates regeneration.',
      effect: '+25 maximum Power and faster regeneration per level.',
      xradar: 'Reliable infrastructure'
    },
    workshop: {
      name: 'Chip Forge',
      short: 'Optimizes rare hardware and extends offline intelligence storage.',
      effect: 'Extends offline storage and discounts late upgrades.',
      xradar: 'Position protection and tooling'
    },
    comms: {
      name: 'Market Feed',
      short: 'A low-latency backbone for live market telemetry.',
      effect: 'Reduces all construction time by 4% per level, up to 40%.',
      xradar: 'Live market data stream'
    },
    automation: {
      name: 'Auto Scan',
      short: 'Autonomous market monitoring while the operator is away.',
      effect: '+15% offline Intel production per level.',
      xradar: 'Automated monitoring'
    },
    antenna: {
      name: 'Whale Tracker',
      short: 'Receives larger batches of external market observations.',
      effect: 'Adds more signals to each intelligence wave.',
      xradar: 'New token feed'
    },
    analysis: {
      name: 'Risk Decoder',
      short: 'Reveals risk bands, mint authority and holder concentration.',
      effect: 'More evidence becomes visible at levels 3, 6 and 9.',
      xradar: 'Safety scoring'
    },
    interceptor: {
      name: 'Alpha Interceptor',
      short: 'Observes coordinated activity from large wallets.',
      effect: 'Shows smart-wallet activity and enables rare Part finds.',
      xradar: 'Smart-wallet leaderboard'
    }
  },

  items: {
    field_coat: { name: 'Field Operations Coat', effect: 'Standard protection for underground work.' },
    insulated_gloves: { name: 'Insulated Gloves', effect: 'Work actions complete 5% faster.' },
    analyst_goggles: { name: 'Analyst Optics', effect: 'Adds a visible analysis aid to the operator.' },
    utility_vest: { name: 'Utility Harness', effect: 'Late upgrades cost fewer Parts.' },
    field_tablet: { name: 'Field Tablet', effect: 'Adds one extra intercepted signal.' },
    headlamp: { name: 'Industrial Headlamp', effect: 'Work on new levels completes 5% faster.' },
    signal_visor: { name: 'Signal Visor', effect: 'Reads two more evidence factors on every signal.' },
    quant_deck: { name: 'Quant Deck', effect: 'Every market pulse yields +2 Intel.' },
    alpha_badge: { name: 'Alpha Badge', effect: '+1 Intel per pulse and one more evidence factor.' }
  },

  achievements: {
    first_contact: { title: 'First contact', description: 'Assess your first market signal.' },
    signal_hunter: { title: 'Signal hunter', description: 'Assess 25 signals.' },
    market_reader: { title: 'Market reader', description: 'Assess 100 signals.' },
    scanner_500: { title: 'Warm scanner', description: 'Send 500 market pulses.' },
    scanner_5000: { title: 'Deep sweep', description: 'Send 5,000 market pulses.' },
    first_position: { title: 'Skin in the game', description: 'Close your first position.' },
    position_veteran: { title: 'Desk operator', description: 'Close 25 positions.' },
    hot_hand: { title: 'Hot hand', description: 'Win three positions in a row.' },
    cold_blooded: { title: 'Cold blooded', description: 'Win seven positions in a row.' },
    in_the_black: { title: 'In the black', description: 'Bank 1,000 Intel of realized profit.' },
    sharp_eye: { title: 'Sharp eye', description: 'Hold 70% accuracy over at least 20 calls.' },
    live_operator: { title: 'Live operator', description: 'Call a real token from the XRadar feed.' },
    week_one: { title: 'Week one', description: 'Reach a seven day streak.' },
    level_five_room: { title: 'Deep specialization', description: 'Upgrade any intelligence module to level 5.' },
    full_station: { title: 'Full intelligence stack', description: 'Unlock all eight network modules.' },
    veteran_operator: { title: 'Veteran operator', description: 'Reach operator level 10.' }
  },

  incidents: {
    security_breach: {
      title: 'Wallet cluster breach',
      description: 'A coordinated wallet cluster is probing thin liquidity across the monitored market.',
      outcomes: {
        lockdown: { label: 'Freeze exposed routes', message: 'Exposed routes frozen. The wallet cluster lost access.' },
        isolate: { label: 'Isolate the wallet cluster', message: 'The coordinated cluster was isolated and contained.' }
      }
    },
    coolant_leak: {
      title: 'Liquidity drain',
      description: 'Liquidity depth is collapsing across a group of correlated assets.',
      outcomes: {
        vent: { label: 'Exit thin pools', message: 'Thin pools were removed from the active watchlist.' },
        seal: { label: 'Deploy liquidity filter', message: 'The liquidity filter contained the drain and recovered useful data.' }
      }
    },
    power_surge: {
      title: 'Volatility surge',
      description: 'A rapid volume spike is distorting short-term market behavior.',
      outcomes: {
        reroute: { label: 'Route through deep liquidity', message: 'The volatility spike was absorbed by deeper liquidity.' },
        shutdown: { label: 'Pause unstable feeds', message: 'Unstable feeds were paused and the model recovered.' }
      }
    },
    signal_spoof: {
      title: 'Spoofed market signal',
      description: 'A forged feed is attempting to poison the network analysis models.',
      outcomes: {
        trace: { label: 'Trace the hostile relay', message: 'The relay was traced and its data cache recovered.' },
        purge: { label: 'Purge the contaminated feed', message: 'The forged feed was removed before it reached analysis.' }
      }
    }
  },

  crew: {
    operator: { role: 'Field Intelligence Lead', fallbackName: 'Operator' },
    engineer: { role: 'Station Engineer', fallbackName: 'Mara Voss' },
    analyst: { role: 'Signal Analyst', fallbackName: 'Signal Analyst' }
  },

  objects: {
    terminal: {
      name: 'Command Terminal',
      description: 'Processes market intelligence and produces Intel.',
      awaiting: 'Awaiting startup',
      online: 'System online'
    },
    analyzer: {
      name: 'Signal Radar',
      description: 'Opens intercepted assets for evidence-based risk assessment.',
      ready: 'First signal ready',
      screening: 'Screening risk factors',
      navLabel: 'Open intercepted signals',
      navDescription: 'Review the signals the station has intercepted.'
    },
    generator: {
      name: 'Power Control',
      description: 'Maintains the underground station power grid.',
      linked: 'Linked to the Power Room',
      emergency: 'Running on emergency mode',
      expandable: 'Ready for expansion'
    },
    locker: {
      name: 'Equipment Locker',
      description: 'Stores visible operator clothing and tools.',
      stored: count => `${count} item${count === 1 ? '' : 's'} stored`,
      navLabel: 'Open equipment storage',
      navDescription: 'Inspect and equip recovered items.'
    },
    supply: {
      name: 'Surface Supply Access',
      description: 'Receives 2–4 construction Parts every six hours.',
      waiting: 'Shipment waiting',
      collected: 'Shipment collected'
    },
    elevator: {
      name: 'Expansion Elevator',
      description: 'Opens the full station view and every buildable room.',
      nextFloor: room => `Next floor: ${room}`,
      allOpen: 'All available floors are open'
    }
  },

  actions: {
    emergency_lights: {
      label: 'Restore emergency lights',
      description: 'Bring the Command Lab back online.',
      complete: 'Emergency lighting restored',
      reason: 'The lighting is already online.'
    },
    boot_terminal: {
      label: 'Boot the terminal',
      description: 'Start the intelligence workstation and load the first signal.',
      complete: 'Command Terminal online',
      reason: 'Restore the emergency lighting first.'
    },
    repair_power: {
      label: 'Stabilize the grid',
      description: 'Repair the damaged Power Control system.',
      complete: 'Power Control repaired',
      reason: 'Complete the first signal assessment first.'
    },
    daily_supply: {
      label: 'Collect shipment',
      description: 'Recover the waiting Parts shipment.',
      complete: 'Shipment collected',
      reason: 'The next shipment is still inbound.'
    },
    terminal_sync: {
      label: 'Synchronize Intel',
      description: 'Process a fresh station intelligence batch.',
      complete: 'Intelligence batch processed',
      reason: 'The terminal is already synchronizing or was refreshed recently.'
    },
    generator_charge: {
      label: 'Recharge reserve',
      description: 'Restore part of the station Power reserve.',
      complete: 'Power reserve restored',
      reasonFull: 'The Power reserve is almost full.',
      reason: 'Power Control was serviced recently.'
    }
  },

  tasks: {
    active_job: { title: 'Operation in progress', description: 'The assigned operator is completing the current task.' },
    lights: { title: 'Restore the lights', description: 'Activate emergency lighting at Power Control.' },
    terminal: { title: 'Bring the terminal online', description: 'Boot the Command Terminal.' },
    first_signal: { title: 'Assess the first signal', description: 'Inspect the evidence and submit a conclusion.' },
    repair: { title: 'Stabilize station power', description: 'Repair Power Control.' },
    power_floor: { title: 'Open the Power Room', description: 'Use the elevator to expand the Lab.' },
    supply: { title: 'Collect the supply drop', description: 'Recover Parts from the surface access.' },
    recon: { title: 'Assess a market signal', description: 'Review the intercepted evidence.' },
    terminal_sync: { title: 'Synchronize intelligence', description: 'Process a fresh batch at the terminal.' },
    build: room => `Build: ${room}`
  },

  lock: {
    unknown_room: 'Unknown room.',
    restore_lab: 'Restore the Command Lab systems first.',
    lab_2: 'Requires Command Lab level 2.',
    lab_3: 'Requires Command Lab level 3.',
    two_level_three: 'Requires any two rooms at level 3.',
    workshop_3: 'Requires Workshop & Storage level 3.',
    comms_2: 'Requires Communications Hub level 2.',
    antenna_3: 'Requires Signal Array level 3.',
    analysis_4: 'Requires Risk Analysis Center level 4.'
  },

  build: {
    upgrade: 'Upgrade module',
    open: 'Unlock new module',
    floorOpened: room => `${room}: module online`,
    upgradeComplete: room => `${room}: upgrade complete`,
    opening: room => `Opening ${room}`,
    upgrading: room => `Upgrading ${room}`
  },

  signal: {
    safe: risk => `Risk ${risk}/100: deep liquidity and moderate holder concentration make this signal safe to research.`,
    risky: risk => `Risk ${risk}/100: thin liquidity, holder concentration or a mutable contract call for caution.`,
    confirmed: 'Assessment confirmed',
    reviewed: 'Assessment reviewed',
    liveMatch: 'Your assessment matched the verified live-market outcome.',
    liveDiffer: 'The verified market outcome differed from your assessment.',
    liveVerified: 'Live signal verified'
  },

  conversion: {
    automation: 'Your automation system is ready for a live market.',
    analysis: 'Run the same safety checks on live tokens.',
    accuracy: pct => `Your 30-day accuracy is ${pct}%. Test it on live signals.`
  },

  misc: {
    operationComplete: 'Operation complete',
    stationUpdated: 'Intelligence network updated',
    incidentContained: 'Market event resolved'
  }
};

const ru = {
  rooms: {
    lab: {
      name: 'Ядро радара',
      short: 'Основной аналитический движок для активного сканирования рынка.',
      effect: 'Производит данные. Высокие уровни резко поднимают добычу в час.',
      xradar: 'Торговый терминал и базовая аналитика'
    },
    power: {
      name: 'Энергоячейка',
      short: 'Расширяет запас энергии и ускоряет восстановление.',
      effect: '+25 к максимуму энергии и быстрее восстановление за уровень.',
      xradar: 'Надёжная инфраструктура'
    },
    workshop: {
      name: 'Фабрика чипов',
      short: 'Оптимизирует редкое оборудование и офлайн-хранилище разведданных.',
      effect: 'Расширяет офлайн-склад и удешевляет поздние улучшения.',
      xradar: 'Защита позиции и управление инструментами'
    },
    comms: {
      name: 'Рыночный поток',
      short: 'Низколатентная магистраль для живых рыночных данных.',
      effect: 'Сокращает время строительства на 4% за уровень, максимум на 40%.',
      xradar: 'Живой поток рыночных данных'
    },
    automation: {
      name: 'Автосканер',
      short: 'Автономное наблюдение за рынком, пока оператора нет.',
      effect: '+15% к офлайн-добыче данных за уровень.',
      xradar: 'Автоматизация наблюдений'
    },
    antenna: {
      name: 'Трекер китов',
      short: 'Принимает более крупные партии внешних наблюдений.',
      effect: 'Добавляет сигналы в каждую разведывательную волну.',
      xradar: 'Лента новых токенов'
    },
    analysis: {
      name: 'Декодер риска',
      short: 'Раскрывает уровень риска, право эмиссии и концентрацию держателей.',
      effect: 'Новые улики открываются на уровнях 3, 6 и 9.',
      xradar: 'Скоринг безопасности'
    },
    interceptor: {
      name: 'Альфа-перехватчик',
      short: 'Отслеживает согласованную активность крупных кошельков.',
      effect: 'Показывает умные кошельки и открывает редкие находки компонентов.',
      xradar: 'Лидерборд умных кошельков'
    }
  },

  items: {
    field_coat: { name: 'Полевая куртка', effect: 'Базовая защита для работы под землёй.' },
    insulated_gloves: { name: 'Изолирующие перчатки', effect: 'Работы выполняются на 5% быстрее.' },
    analyst_goggles: { name: 'Оптика аналитика', effect: 'Добавляет оператору видимый анализатор.' },
    utility_vest: { name: 'Разгрузочный жилет', effect: 'Поздние улучшения стоят меньше компонентов.' },
    field_tablet: { name: 'Полевой планшет', effect: 'Добавляет один перехваченный сигнал.' },
    headlamp: { name: 'Промышленный фонарь', effect: 'Работы на новых уровнях идут на 5% быстрее.' },
    signal_visor: { name: 'Сигнальный визор', effect: 'Открывает на два фактора улик больше в каждом сигнале.' },
    quant_deck: { name: 'Квант-дек', effect: 'Каждый импульс даёт +2 Интела.' },
    alpha_badge: { name: 'Знак альфы', effect: '+1 Интел за импульс и ещё один фактор улик.' }
  },

  achievements: {
    first_contact: { title: 'Первый контакт', description: 'Оцени свой первый рыночный сигнал.' },
    signal_hunter: { title: 'Охотник за сигналами', description: 'Оцени 25 сигналов.' },
    market_reader: { title: 'Чтец рынка', description: 'Оцени 100 сигналов.' },
    scanner_500: { title: 'Разогретый сканер', description: 'Отправь 500 импульсов.' },
    scanner_5000: { title: 'Глубокое сканирование', description: 'Отправь 5000 импульсов.' },
    first_position: { title: 'Своя шкура', description: 'Закрой первую позицию.' },
    position_veteran: { title: 'Оператор стола', description: 'Закрой 25 позиций.' },
    hot_hand: { title: 'Горячая рука', description: 'Выиграй три позиции подряд.' },
    cold_blooded: { title: 'Хладнокровие', description: 'Выиграй семь позиций подряд.' },
    in_the_black: { title: 'В плюсе', description: 'Заработай 1000 Интела реализованной прибыли.' },
    sharp_eye: { title: 'Острый глаз', description: 'Держи точность 70% минимум на 20 оценках.' },
    live_operator: { title: 'Живой оператор', description: 'Сделай колл по реальному токену из ленты XRadar.' },
    week_one: { title: 'Первая неделя', description: 'Дойди до серии в семь дней.' },
    level_five_room: { title: 'Глубокая специализация', description: 'Подними любой модуль разведки до 5 уровня.' },
    full_station: { title: 'Полный аналитический стек', description: 'Открой все восемь модулей сети.' },
    veteran_operator: { title: 'Ветеран-оператор', description: 'Достигните 10 уровня оператора.' }
  },

  incidents: {
    security_breach: {
      title: 'Атака кластера кошельков',
      description: 'Координированный кластер кошельков проверяет активы с низкой ликвидностью.',
      outcomes: {
        lockdown: { label: 'Заморозить уязвимые маршруты', message: 'Уязвимые маршруты заморожены. Кластер потерял доступ.' },
        isolate: { label: 'Изолировать кластер', message: 'Координированный кластер изолирован и локализован.' }
      }
    },
    coolant_leak: {
      title: 'Отток ликвидности',
      description: 'Глубина ликвидности резко падает у группы связанных активов.',
      outcomes: {
        vent: { label: 'Исключить тонкие пулы', message: 'Тонкие пулы удалены из активного наблюдения.' },
        seal: { label: 'Развернуть фильтр ликвидности', message: 'Фильтр остановил отток и сохранил полезные данные.' }
      }
    },
    power_surge: {
      title: 'Всплеск волатильности',
      description: 'Резкий скачок объёма искажает краткосрочное поведение рынка.',
      outcomes: {
        reroute: { label: 'Направить в глубокую ликвидность', message: 'Всплеск поглощён более глубокими пулами.' },
        shutdown: { label: 'Приостановить нестабильные потоки', message: 'Нестабильные потоки остановлены, модель восстановилась.' }
      }
    },
    signal_spoof: {
      title: 'Подделка рыночного сигнала',
      description: 'Поддельный поток пытается отравить аналитические модели сети.',
      outcomes: {
        trace: { label: 'Отследить враждебный ретранслятор', message: 'Ретранслятор отслежен, его кэш данных изъят.' },
        purge: { label: 'Вычистить заражённый поток', message: 'Поддельный поток удалён до того, как дошёл до анализа.' }
      }
    }
  },

  crew: {
    operator: { role: 'Ведущий полевой аналитик', fallbackName: 'Оператор' },
    engineer: { role: 'Инженер станции', fallbackName: 'Мара Восс' },
    analyst: { role: 'Аналитик сигналов', fallbackName: 'Аналитик сигналов' }
  },

  objects: {
    terminal: {
      name: 'Командный терминал',
      description: 'Обрабатывает рыночную разведку и производит данные.',
      awaiting: 'Ожидает запуска',
      online: 'Система работает'
    },
    analyzer: {
      name: 'Радар сигналов',
      description: 'Открывает перехваченные активы для оценки риска по уликам.',
      ready: 'Первый сигнал готов',
      screening: 'Проверяет факторы риска',
      navLabel: 'Открыть перехваченные сигналы',
      navDescription: 'Посмотреть сигналы, которые перехватила станция.'
    },
    generator: {
      name: 'Энергетический узел',
      description: 'Поддерживает энергосеть подземной станции.',
      linked: 'Подключён к энергетическому этажу',
      emergency: 'Работает в аварийном режиме',
      expandable: 'Готов к расширению'
    },
    locker: {
      name: 'Шкаф экипировки',
      description: 'Хранит видимую одежду и инструменты оператора.',
      stored: count => `${count} ${pluralRu(count, 'предмет', 'предмета', 'предметов')} на хранении`,
      navLabel: 'Открыть склад экипировки',
      navDescription: 'Осмотреть и надеть найденные предметы.'
    },
    supply: {
      name: 'Шлюз поставок',
      description: 'Каждые шесть часов принимает 2–4 компонента.',
      waiting: 'Поставка ожидает',
      collected: 'Поставка принята'
    },
    elevator: {
      name: 'Лифт расширения',
      description: 'Открывает вид всей станции и все доступные помещения.',
      nextFloor: room => `Следующий этаж: ${room}`,
      allOpen: 'Все доступные этажи открыты'
    }
  },

  actions: {
    emergency_lights: {
      label: 'Включить аварийный свет',
      description: 'Вернуть командную лабораторию в строй.',
      complete: 'Аварийное освещение восстановлено',
      reason: 'Освещение уже работает.'
    },
    boot_terminal: {
      label: 'Запустить терминал',
      description: 'Поднять рабочую станцию разведки и загрузить первый сигнал.',
      complete: 'Командный терминал запущен',
      reason: 'Сначала включите аварийное освещение.'
    },
    repair_power: {
      label: 'Стабилизировать сеть',
      description: 'Починить повреждённый энергетический узел.',
      complete: 'Энергетический узел восстановлен',
      reason: 'Сначала разберите первый сигнал.'
    },
    daily_supply: {
      label: 'Принять поставку',
      description: 'Забрать ожидающую партию компонентов.',
      complete: 'Поставка принята',
      reason: 'Следующая поставка ещё в пути.'
    },
    terminal_sync: {
      label: 'Синхронизировать данные',
      description: 'Обработать свежую партию разведданных станции.',
      complete: 'Партия разведданных обработана',
      reason: 'Терминал уже синхронизируется или недавно обновлялся.'
    },
    generator_charge: {
      label: 'Пополнить резерв',
      description: 'Восстановить часть энергетического резерва станции.',
      complete: 'Резерв энергии пополнен',
      reasonFull: 'Резерв энергии почти полон.',
      reason: 'Энергетический узел недавно обслуживали.'
    }
  },

  tasks: {
    active_job: { title: 'Идёт работа', description: 'Назначенный оператор выполняет текущую задачу.' },
    lights: { title: 'Вернуть свет', description: 'Включите аварийное освещение на энергетическом узле.' },
    terminal: { title: 'Оживить терминал', description: 'Запустите командный терминал.' },
    first_signal: { title: 'Разобрать первый сигнал', description: 'Изучите улики и вынесите заключение.' },
    repair: { title: 'Стабилизировать питание', description: 'Почините энергетический узел.' },
    power_floor: { title: 'Открыть энергетический этаж', description: 'Расширьте лабораторию через лифт.' },
    supply: { title: 'Забрать поставку', description: 'Получите компоненты в шлюзе поставок.' },
    recon: { title: 'Оценить рыночный сигнал', description: 'Изучите перехваченные улики.' },
    terminal_sync: { title: 'Синхронизировать разведданные', description: 'Обработайте свежую партию за терминалом.' },
    build: room => `Построить: ${room}`
  },

  lock: {
    unknown_room: 'Неизвестное помещение.',
    restore_lab: 'Сначала восстановите системы командной лаборатории.',
    lab_2: 'Нужна командная лаборатория 2 уровня.',
    lab_3: 'Нужна командная лаборатория 3 уровня.',
    two_level_three: 'Нужны любые два помещения 3 уровня.',
    workshop_3: 'Нужна мастерская и склад 3 уровня.',
    comms_2: 'Нужен коммуникационный центр 2 уровня.',
    antenna_3: 'Нужна антенная комната 3 уровня.',
    analysis_4: 'Нужен аналитический центр 4 уровня.'
  },

  build: {
    upgrade: 'Улучшить модуль',
    open: 'Открыть новый модуль',
    floorOpened: room => `${room}: модуль активирован`,
    upgradeComplete: room => `${room}: улучшение готово`,
    opening: room => `Открывается: ${room}`,
    upgrading: room => `Улучшается: ${room}`
  },

  signal: {
    safe: risk => `Риск ${risk}/100: высокая ликвидность и умеренная концентрация держателей делают сигнал безопасным для изучения.`,
    risky: risk => `Риск ${risk}/100: слабая ликвидность, концентрация держателей или изменяемый контракт требуют осторожности.`,
    confirmed: 'Решение подтверждено',
    reviewed: 'Разбор завершён',
    liveMatch: 'Ваша оценка совпала с подтверждённым исходом на живом рынке.',
    liveDiffer: 'Подтверждённый исход рынка разошёлся с вашей оценкой.',
    liveVerified: 'Живой сигнал подтверждён'
  },

  conversion: {
    automation: 'Ваша система автоматизации готова к живому рынку.',
    analysis: 'Проведите те же проверки безопасности на живых токенах.',
    accuracy: pct => `Ваша точность за 30 дней — ${pct}%. Проверьте её на живых сигналах.`
  },

  misc: {
    operationComplete: 'Работа завершена',
    stationUpdated: 'Аналитическая сеть обновлена',
    incidentContained: 'Рыночное событие обработано'
  }
};

/** Russian needs three plural forms where English needs two. */
function pluralRu(count, one, few, many) {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export const COPY = Object.freeze({ en, ru });
