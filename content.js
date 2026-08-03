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
      name: 'Command Lab',
      short: 'The intelligence terminal and central operations floor.',
      effect: 'Produces Intel. Higher levels sharply increase hourly output.',
      xradar: 'Trading terminal and core analytics'
    },
    power: {
      name: 'Power Room',
      short: 'The station grid, reserve cells and emergency machinery.',
      effect: '+25 maximum Power and faster regeneration per level.',
      xradar: 'Reliable infrastructure'
    },
    workshop: {
      name: 'Workshop & Storage',
      short: 'Engineering tools, recovered parts and protected storage.',
      effect: 'Extends offline storage and discounts late upgrades.',
      xradar: 'Position protection and tooling'
    },
    comms: {
      name: 'Communications Hub',
      short: 'A low-latency backbone for every station system.',
      effect: 'Reduces all construction time by 4% per level, up to 40%.',
      xradar: 'Live market data stream'
    },
    automation: {
      name: 'Automation Servers',
      short: 'Autonomous market monitoring while the operator is away.',
      effect: '+15% offline Intel production per level.',
      xradar: 'Automated monitoring'
    },
    antenna: {
      name: 'Signal Array',
      short: 'Receives larger batches of external market observations.',
      effect: 'Adds more signals to each intelligence wave.',
      xradar: 'New token feed'
    },
    analysis: {
      name: 'Risk Analysis Center',
      short: 'Reveals risk bands, mint authority and holder concentration.',
      effect: 'More evidence becomes visible at levels 3, 6 and 9.',
      xradar: 'Safety scoring'
    },
    interceptor: {
      name: 'Wallet Interceptor',
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
    headlamp: { name: 'Industrial Headlamp', effect: 'Work on new levels completes 5% faster.' }
  },

  achievements: {
    level_five_room: { title: 'Deep specialization', description: 'Upgrade any room to level 5.' },
    full_station: { title: 'Station complete', description: 'Open all eight station rooms.' },
    veteran_operator: { title: 'Veteran operator', description: 'Reach operator level 10.' }
  },

  incidents: {
    security_breach: {
      title: 'Security breach',
      description: 'An unknown device is probing the station network while the surface lock reports forced entry.',
      outcomes: {
        lockdown: { label: 'Lock down the elevator', message: 'Elevator sealed. The intrusion team withdrew.' },
        isolate: { label: 'Isolate the signal network', message: 'Signal network isolated. The hostile probe was contained.' }
      }
    },
    coolant_leak: {
      title: 'Coolant leak',
      description: 'A fractured coolant line is overheating the automation racks.',
      outcomes: {
        vent: { label: 'Vent the server room', message: 'Pressure released. The racks are stable.' },
        seal: { label: 'Seal and recycle coolant', message: 'The fracture was sealed and spare material recovered.' }
      }
    },
    power_surge: {
      title: 'Grid overload',
      description: 'A surface surge is cascading through the lower station grid.',
      outcomes: {
        reroute: { label: 'Reroute through reserve cells', message: 'The surge was absorbed by reserve cells.' },
        shutdown: { label: 'Shut down noncritical systems', message: 'Noncritical systems went dark and the grid recovered.' }
      }
    },
    signal_spoof: {
      title: 'Spoofed market signal',
      description: 'A forged feed is attempting to poison the station analysis models.',
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
    upgrade: 'Upgrade room',
    open: 'Open new floor',
    floorOpened: room => `${room}: floor opened`,
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
    stationUpdated: 'Station systems updated',
    incidentContained: 'Security incident contained'
  }
};

const ru = {
  rooms: {
    lab: {
      name: 'Командная лаборатория',
      short: 'Разведтерминал и центральный операционный этаж.',
      effect: 'Производит данные. Высокие уровни резко поднимают добычу в час.',
      xradar: 'Торговый терминал и базовая аналитика'
    },
    power: {
      name: 'Энергетический этаж',
      short: 'Сеть станции, резервные ячейки и аварийные машины.',
      effect: '+25 к максимуму энергии и быстрее восстановление за уровень.',
      xradar: 'Надёжная инфраструктура'
    },
    workshop: {
      name: 'Мастерская и склад',
      short: 'Инструменты, найденные детали и защищённое хранилище.',
      effect: 'Расширяет офлайн-склад и удешевляет поздние улучшения.',
      xradar: 'Защита позиции и управление инструментами'
    },
    comms: {
      name: 'Коммуникационный центр',
      short: 'Магистраль с низкой задержкой для всех систем станции.',
      effect: 'Сокращает время строительства на 4% за уровень, максимум на 40%.',
      xradar: 'Живой поток рыночных данных'
    },
    automation: {
      name: 'Серверная автоматизации',
      short: 'Автономное наблюдение за рынком, пока оператора нет.',
      effect: '+15% к офлайн-добыче данных за уровень.',
      xradar: 'Автоматизация наблюдений'
    },
    antenna: {
      name: 'Антенная комната',
      short: 'Принимает более крупные партии внешних наблюдений.',
      effect: 'Добавляет сигналы в каждую разведывательную волну.',
      xradar: 'Лента новых токенов'
    },
    analysis: {
      name: 'Аналитический центр',
      short: 'Раскрывает уровень риска, право эмиссии и концентрацию держателей.',
      effect: 'Новые улики открываются на уровнях 3, 6 и 9.',
      xradar: 'Скоринг безопасности'
    },
    interceptor: {
      name: 'Узел перехвата',
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
    headlamp: { name: 'Промышленный фонарь', effect: 'Работы на новых уровнях идут на 5% быстрее.' }
  },

  achievements: {
    level_five_room: { title: 'Глубокая специализация', description: 'Поднимите любое помещение до 5 уровня.' },
    full_station: { title: 'Станция достроена', description: 'Откройте все восемь помещений станции.' },
    veteran_operator: { title: 'Ветеран-оператор', description: 'Достигните 10 уровня оператора.' }
  },

  incidents: {
    security_breach: {
      title: 'Взлом периметра',
      description: 'Неизвестное устройство прощупывает сеть станции, а поверхностный замок сообщает о взломе.',
      outcomes: {
        lockdown: { label: 'Заблокировать лифт', message: 'Лифт запечатан. Группа проникновения отступила.' },
        isolate: { label: 'Изолировать сеть сигналов', message: 'Сеть сигналов изолирована. Враждебный зонд локализован.' }
      }
    },
    coolant_leak: {
      title: 'Утечка хладагента',
      description: 'Треснувшая магистраль хладагента перегревает стойки автоматизации.',
      outcomes: {
        vent: { label: 'Продуть серверную', message: 'Давление сброшено. Стойки стабильны.' },
        seal: { label: 'Заварить и собрать хладагент', message: 'Трещина заварена, часть материала удалось вернуть.' }
      }
    },
    power_surge: {
      title: 'Перегрузка сети',
      description: 'Скачок с поверхности каскадом идёт по нижней сети станции.',
      outcomes: {
        reroute: { label: 'Пустить через резервные ячейки', message: 'Скачок погашен резервными ячейками.' },
        shutdown: { label: 'Отключить некритичные системы', message: 'Некритичные системы обесточены, сеть восстановилась.' }
      }
    },
    signal_spoof: {
      title: 'Подделка рыночного сигнала',
      description: 'Поддельный поток пытается отравить аналитические модели станции.',
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
    upgrade: 'Улучшить помещение',
    open: 'Открыть новый этаж',
    floorOpened: room => `${room}: этаж открыт`,
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
    stationUpdated: 'Системы станции обновлены',
    incidentContained: 'Инцидент безопасности локализован'
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
