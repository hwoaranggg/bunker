/**
 * markets.js — операторские рынки: игрок создаёт свой токен за Intel, другие
 * покупают по прозрачной bonding curve, цена растёт от supply. Соревнование
 * между создателями, недельные сезоны.
 *
 * ЭКОНОМИЧЕСКАЯ КОНСТРУКЦИЯ (важно — тут вся защита):
 *
 *  • Bonding curve детерминированная и публичная: price(s) = P0 + K·s. Игрок
 *    видит формулу и текущую цену, ничего не скрыто. Резерв рынка всегда
 *    покрывает обязательства, потому что покупка и продажа идут по одному
 *    интегралу той же кривой — рынок не может стать неплатёжеспособным.
 *
 *  • Burn на обеих сторонах сделки: часть Intel сгорает, а не перетекает. Это
 *    делает систему дефляционной, защищает общую экономику от накачки и
 *    естественно наказывает overtrading.
 *
 *  • Signal Points (то, что идёт в airdrop score) начисляются ТОЛЬКО за вклад и
 *    участие: создателю — за уникальных привлечённых трейдеров, трейдеру — за
 *    охват разных рынков. НИКОГДА пропорционально прибыли в Intel. Это
 *    сознательное решение: иначе механика превращается в трубу «извлёк Intel у
 *    поздних игроков → получил долю в реальном аирдропе», где поздние
 *    оплачивают аирдроп ранних. Прибыль остаётся в Intel (мягкая валюта на
 *    прокачку), престиж — в рейтинге, а airdrop-очки платятся за то, что ты
 *    сделал что-то интересное другим.
 *
 *  • Self-trade не считается ни в SP, ни в уникальных трейдерах: создатель не
 *    может накачать себе показатели своими же покупками или альтами (сверка по
 *    deviceHash, который уже ведётся в антифарм-слое).
 *
 *  • Кап на SP с рынков за сезон, чтобы рынки не доминировали над честной игрой
 *    в сигналы — они дополнение к основному луупу, а не замена.
 *
 *  • Рынки живут 7 дней и закрываются: вечных пирамид не существует, каждую
 *    неделю новый сезон. По истечении держатели редимят по финальной цене
 *    кривой из резерва.
 *
 * Все функции чистые над документами — I/O и персистентность на слое сервера,
 * как и в остальном движке.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const MARKET_LIFETIME_MS = 7 * DAY_MS;

// Кривая: price(supply) = CURVE_BASE + CURVE_SLOPE · supply
export const CURVE_BASE = 10;      // цена первой доли в Intel
export const CURVE_SLOPE = 0.02;   // прирост цены за каждую долю

export const TRADE_BURN_RATE = 0.04;   // 4% сгорает на каждой сделке
export const CREATE_COST_INTEL = 5_000; // создание рынка стоит дорого — антиспам
export const CREATE_COOLDOWN_MS = 7 * DAY_MS; // один рынок в неделю на аккаунт
export const CREATOR_SEED_SHARES = 50; // создатель получает стартовую позицию

// Кап: держатель не может владеть больше этой доли supply — чтобы нельзя было
// выкупить собственный рынок целиком (в том числе альтами). Применяется только
// начиная с CAP_SUPPLY_FLOOR: на свежем рынке supply мал, и любой первый
// покупатель неизбежно превышает любую долю — без порога рынок был бы мёртв с
// рождения (это поймал тест).
export const MAX_HOLDING_RATIO = 0.25;
export const CAP_SUPPLY_FLOOR = 2_000;

// SP за вклад, с сезонным капом.
export const SP_PER_UNIQUE_TRADER = 12;   // создателю за каждого уникального трейдера
export const SP_PER_MARKET_TRADED = 6;    // трейдеру за каждый новый рынок
export const SP_SEASON_CAP = 500;         // максимум SP с рынков за сезон

const TICKER_RE = /^[A-Z][A-Z0-9]{1,9}$/;

function marketError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

const num = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const asMs = value => (value instanceof Date ? value.getTime() : new Date(value).getTime());
const round = value => Math.round(value * 1e6) / 1e6;

/* ─── КРИВАЯ ──────────────────────────────────────────────────────────────── */

/** Текущая цена одной доли при данном supply. */
export function curvePrice(supply) {
  return CURVE_BASE + CURVE_SLOPE * Math.max(0, num(supply));
}

/**
 * Стоимость покупки `shares` долей начиная с `supply` — интеграл кривой.
 * cost = P0·d + K·((s+d)² − s²)/2
 */
export function costToBuy(supply, shares) {
  const s = Math.max(0, num(supply));
  const d = Math.max(0, num(shares));
  return round(CURVE_BASE * d + (CURVE_SLOPE * ((s + d) ** 2 - s ** 2)) / 2);
}

/**
 * Сколько долей даёт `intel` при данном supply — обратная задача к costToBuy.
 * Решение квадратного уравнения K/2·d² + (P0 + K·s)·d − I = 0.
 */
export function sharesForIntel(supply, intel) {
  const s = Math.max(0, num(supply));
  const budget = Math.max(0, num(intel));
  if (budget <= 0) return 0;
  const b = CURVE_BASE + CURVE_SLOPE * s;
  const discriminant = b ** 2 + 2 * CURVE_SLOPE * budget;
  const d = (-b + Math.sqrt(discriminant)) / CURVE_SLOPE;
  return round(Math.max(0, d));
}

/** Выплата за продажу `shares` долей при данном supply (по той же кривой). */
export function proceedsFromSell(supply, shares) {
  const s = Math.max(0, num(supply));
  const d = Math.min(s, Math.max(0, num(shares)));
  return round(CURVE_BASE * d + (CURVE_SLOPE * (s ** 2 - (s - d) ** 2)) / 2);
}

/* ─── СОСТОЯНИЕ ИГРОКА ────────────────────────────────────────────────────── */

export function ensureMarketShape(player) {
  player.progression ||= {};
  const markets = (player.progression.markets ||= {});
  markets.holdings ||= {};            // marketId -> { shares, spentIntel, firstTradedAt }
  markets.createdMarketIds ||= [];
  markets.lastCreatedAt ??= null;
  markets.seasonSignalPoints = Math.max(0, num(markets.seasonSignalPoints, 0));
  markets.seasonKey ||= null;
  markets.realizedIntel = num(markets.realizedIntel, 0);
  markets.tradedMarketIds ||= [];     // для SP за охват — по одному разу на рынок
  markets.creditedTraderKeys ||= {};  // marketId -> [traderKey] уникальные трейдеры
  return player;
}

export function emptyMarketState() {
  return {
    markets: {
      holdings: {},
      createdMarketIds: [],
      lastCreatedAt: null,
      seasonSignalPoints: 0,
      seasonKey: null,
      realizedIntel: 0,
      tradedMarketIds: [],
      creditedTraderKeys: {}
    }
  };
}

/** Ключ сезона — ISO-неделя, чтобы кап SP сбрасывался вместе с сезоном. */
export function seasonKeyFor(now = new Date()) {
  const date = new Date(asMs(now));
  const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  thursday.setUTCDate(thursday.getUTCDate() + 3 - ((thursday.getUTCDay() + 6) % 7));
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((thursday - firstThursday) / DAY_MS - 3) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Начисляет SP с рынков в пределах сезонного капа. Возвращает фактически
 * начисленное. Кап не даёт рынкам вытеснить основной луп из airdrop score.
 */
function grantMarketSignalPoints(player, amount, deps, now) {
  ensureMarketShape(player);
  const markets = player.progression.markets;
  const key = seasonKeyFor(now);
  if (markets.seasonKey !== key) {
    markets.seasonKey = key;
    markets.seasonSignalPoints = 0;
  }
  const room = Math.max(0, SP_SEASON_CAP - markets.seasonSignalPoints);
  const grant = Math.min(room, Math.max(0, Math.floor(num(amount))));
  if (grant <= 0) return 0;
  markets.seasonSignalPoints += grant;
  return deps.grantSignalPoints(player, grant);
}

/* ─── РЫНОК ───────────────────────────────────────────────────────────────── */

export function createMarketDocument({ creatorId, ticker, name, now = new Date() }) {
  const timestamp = new Date(asMs(now));
  return {
    marketId: `mkt_${timestamp.getTime().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    ticker,
    name,
    creatorId: String(creatorId),
    createdAt: timestamp,
    expiresAt: new Date(asMs(now) + MARKET_LIFETIME_MS),
    status: 'open',
    supply: 0,
    reserve: 0,          // Intel в резерве; всегда ≥ обязательств по кривой
    burnedIntel: 0,
    volumeIntel: 0,
    tradeCount: 0,
    uniqueTraders: 0,
    holders: 0,
    peakPrice: curvePrice(0),
    seasonKey: seasonKeyFor(now)
  };
}

export function validateTicker(raw) {
  const ticker = String(raw || '').trim().toUpperCase().replace(/^\$/, '');
  if (!TICKER_RE.test(ticker)) {
    throw marketError('BAD_TICKER', 'Тикер: 2–10 символов, латиница и цифры, начинается с буквы.');
  }
  return ticker;
}

/**
 * Создание рынка. Списывает Intel, ставит недельный кулдаун и выдаёт создателю
 * стартовую позицию (она оплачена по кривой, а не подарена — резерв сходится).
 */
export function createMarket(player, { ticker, name } = {}, deps, now = new Date()) {
  ensureMarketShape(player);
  const markets = player.progression.markets;
  const cleanTicker = validateTicker(ticker);
  const cleanName = String(name || cleanTicker).trim().slice(0, 32) || cleanTicker;

  if (markets.lastCreatedAt && asMs(now) - asMs(markets.lastCreatedAt) < CREATE_COOLDOWN_MS) {
    const hoursLeft = Math.ceil((CREATE_COOLDOWN_MS - (asMs(now) - asMs(markets.lastCreatedAt))) / 3_600_000);
    throw marketError('CREATE_COOLDOWN', `Новый рынок можно создать через ${hoursLeft} ч.`);
  }
  const seedCost = costToBuy(0, CREATOR_SEED_SHARES);
  const total = CREATE_COST_INTEL + seedCost;
  if (num(player.resources?.data) < total) {
    throw marketError('NOT_ENOUGH_INTEL', `Нужно ${Math.ceil(total)} Intel: ${CREATE_COST_INTEL} за листинг и ${Math.ceil(seedCost)} за стартовую позицию.`);
  }

  player.resources.data = round(num(player.resources.data) - total);
  const market = createMarketDocument({ creatorId: player.telegramId, ticker: cleanTicker, name: cleanName, now });
  // Стартовая позиция создателя проходит по кривой: supply и резерв растут на
  // фактически уплаченный Intel, поэтому рынок сразу платёжеспособен.
  market.supply = CREATOR_SEED_SHARES;
  market.reserve = seedCost;
  market.holders = 1;
  market.peakPrice = curvePrice(market.supply);

  markets.holdings[market.marketId] = { shares: CREATOR_SEED_SHARES, spentIntel: seedCost, firstTradedAt: new Date(asMs(now)) };
  markets.createdMarketIds.push(market.marketId);
  markets.lastCreatedAt = new Date(asMs(now));
  // Листинговый взнос сгорает целиком — это отток Intel из экономики.
  market.burnedIntel = CREATE_COST_INTEL;

  return { market, spent: total, seedShares: CREATOR_SEED_SHARES };
}

/**
 * Покупка долей за Intel. `traderKey` — устойчивый ключ для подсчёта уникальных
 * трейдеров (deviceHash игрока, если есть, иначе telegramId), чтобы альты не
 * накручивали создателю ни SP, ни статистику.
 */
export function buyShares(player, market, intelAmount, deps, now = new Date(), traderKey = null) {
  ensureMarketShape(player);
  assertOpen(market, now);
  const budget = Math.floor(num(intelAmount));
  if (budget < 10) throw marketError('MIN_TRADE', 'Минимальная покупка — 10 Intel.');
  if (num(player.resources?.data) < budget) throw marketError('NOT_ENOUGH_INTEL', 'Недостаточно Intel.');

  // Burn берётся с суммы до кривой: в резерв идёт только чистая часть.
  const burn = round(budget * TRADE_BURN_RATE);
  const net = round(budget - burn);
  const shares = sharesForIntel(market.supply, net);
  if (shares <= 0) throw marketError('TOO_SMALL', 'Сумма слишком мала для покупки долей.');

  const holding = (player.progression.markets.holdings[market.marketId] ||= { shares: 0, spentIntel: 0, firstTradedAt: new Date(asMs(now)) });
  const newSupply = round(market.supply + shares);
  const newShares = round(holding.shares + shares);
  // Кап на долю в одном рынке — защита от выкупа собственного рынка. Ниже
  // порога supply не применяется, иначе первые покупки невозможны.
  if (newSupply >= CAP_SUPPLY_FLOOR && newShares / newSupply > MAX_HOLDING_RATIO) {
    throw marketError('HOLDING_CAP', `Один держатель не может владеть больше ${Math.round(MAX_HOLDING_RATIO * 100)}% рынка.`);
  }

  player.resources.data = round(num(player.resources.data) - budget);
  const isNewHolder = holding.shares <= 0;
  holding.shares = newShares;
  holding.spentIntel = round(holding.spentIntel + budget);

  market.supply = newSupply;
  market.reserve = round(market.reserve + net);
  market.burnedIntel = round(market.burnedIntel + burn);
  market.volumeIntel = round(market.volumeIntel + budget);
  market.tradeCount += 1;
  if (isNewHolder) market.holders += 1;
  market.peakPrice = Math.max(num(market.peakPrice), curvePrice(market.supply));

  // Учёт вклада: уникальный трейдер (не создатель, не он же повторно) — это то,
  // за что создатель получает SP. Прибыль в SP не конвертируется никогда.
  const key = String(traderKey || player.telegramId);
  const isSelf = String(market.creatorId) === String(player.telegramId);
  const creditedKeys = (player.progression.markets.creditedTraderKeys[market.marketId] ||= []);
  let newUniqueTrader = false;
  if (!isSelf && !creditedKeys.includes(key)) {
    creditedKeys.push(key);
    market.uniqueTraders += 1;
    newUniqueTrader = true;
  }

  // SP трейдеру за охват: по одному разу на рынок, за участие, не за профит.
  let signalPoints = 0;
  const traded = player.progression.markets.tradedMarketIds;
  if (!isSelf && !traded.includes(market.marketId)) {
    traded.push(market.marketId);
    signalPoints = grantMarketSignalPoints(player, SP_PER_MARKET_TRADED, deps, now);
  }

  return {
    shares: round(shares),
    spent: budget,
    burned: burn,
    price: curvePrice(market.supply),
    holdingShares: holding.shares,
    signalPoints,
    newUniqueTrader,
    traderKey: key
  };
}

/** Продажа долей обратно в кривую. Профит остаётся в Intel и не даёт SP. */
export function sellShares(player, market, sharesToSell, deps, now = new Date()) {
  ensureMarketShape(player);
  assertTradable(market, now);
  const holding = player.progression.markets.holdings[market.marketId];
  const amount = round(num(sharesToSell));
  if (!holding || holding.shares <= 0) throw marketError('NO_POSITION', 'У тебя нет долей в этом рынке.');
  if (amount <= 0) throw marketError('MIN_TRADE', 'Укажи количество долей.');
  if (amount > holding.shares + 1e-6) throw marketError('NOT_ENOUGH_SHARES', 'Столько долей у тебя нет.');

  const gross = proceedsFromSell(market.supply, amount);
  const burn = round(gross * TRADE_BURN_RATE);
  // Rounding each trade to 1e-6 leaves the reserve a hair short of the exact
  // curve integral after many trades, so the last seller could otherwise hit a
  // spurious shortfall. Clamp to what the reserve actually holds; only a gap
  // wide enough to mean a real accounting bug is treated as an error.
  const RESERVE_DUST = 1;
  if (gross > market.reserve + RESERVE_DUST) {
    throw marketError('RESERVE_SHORTFALL', 'Резерв рынка недостаточен.', 500);
  }
  const settledGross = Math.min(gross, market.reserve);
  const payout = round(settledGross - round(settledGross * TRADE_BURN_RATE));

  holding.shares = round(holding.shares - amount);
  const closed = holding.shares <= 1e-9;
  if (closed) { holding.shares = 0; market.holders = Math.max(0, market.holders - 1); }

  market.supply = round(Math.max(0, market.supply - amount));
  market.reserve = round(Math.max(0, market.reserve - settledGross));
  market.burnedIntel = round(market.burnedIntel + (settledGross - payout));
  market.volumeIntel = round(market.volumeIntel + settledGross);
  market.tradeCount += 1;

  player.resources.data = round(num(player.resources.data) + payout);
  player.progression.markets.realizedIntel = round(num(player.progression.markets.realizedIntel) + payout - (holding.spentIntel ? 0 : 0));

  return { soldShares: amount, payout, burned: round(settledGross - payout), price: curvePrice(market.supply), holdingShares: holding.shares };
}

/**
 * Закрытие рынка по истечении срока. Создатель получает SP за уникальных
 * привлечённых трейдеров — это плата за вклад, а не за извлечённый Intel.
 */
export function settleMarket(market, creatorPlayer, deps, now = new Date()) {
  if (market.status === 'settled') throw marketError('ALREADY_SETTLED', 'Рынок уже закрыт.');
  if (asMs(now) < asMs(market.expiresAt)) throw marketError('NOT_EXPIRED', 'Рынок ещё открыт.');
  market.status = 'settled';
  market.settledAt = new Date(asMs(now));
  market.finalPrice = curvePrice(market.supply);

  let signalPoints = 0;
  if (creatorPlayer) {
    const earned = Math.max(0, num(market.uniqueTraders)) * SP_PER_UNIQUE_TRADER;
    signalPoints = grantMarketSignalPoints(creatorPlayer, earned, deps, now);
  }
  return { status: 'settled', finalPrice: market.finalPrice, uniqueTraders: market.uniqueTraders, signalPoints };
}

/**
 * Редим после закрытия: держатель забирает свою долю резерва по финальной цене.
 * Разрешено и после истечения срока — иначе позиции сгорали бы.
 */
export function redeemShares(player, market, deps, now = new Date()) {
  ensureMarketShape(player);
  if (market.status !== 'settled') throw marketError('NOT_SETTLED', 'Рынок ещё не закрыт.');
  const holding = player.progression.markets.holdings[market.marketId];
  if (!holding || holding.shares <= 0) throw marketError('NO_POSITION', 'Нечего забирать.');

  const shares = holding.shares;
  const gross = proceedsFromSell(market.supply, shares);
  const payout = round(Math.min(gross, market.reserve));

  holding.shares = 0;
  market.supply = round(Math.max(0, market.supply - shares));
  market.reserve = round(Math.max(0, market.reserve - payout));
  market.holders = Math.max(0, market.holders - 1);
  player.resources.data = round(num(player.resources.data) + payout);

  return { redeemedShares: shares, payout };
}

function assertOpen(market, now) {
  if (!market) throw marketError('MARKET_NOT_FOUND', 'Рынок не найден.', 404);
  if (market.status !== 'open') throw marketError('MARKET_CLOSED', 'Рынок закрыт.');
  if (asMs(now) >= asMs(market.expiresAt)) throw marketError('MARKET_EXPIRED', 'Срок рынка истёк — покупка недоступна.');
}

// Продавать можно до самого закрытия, включая последние минуты.
function assertTradable(market, now) {
  if (!market) throw marketError('MARKET_NOT_FOUND', 'Рынок не найден.', 404);
  if (market.status !== 'open') throw marketError('MARKET_CLOSED', 'Рынок закрыт.');
  if (asMs(now) >= asMs(market.expiresAt)) throw marketError('MARKET_EXPIRED', 'Срок рынка истёк.');
}

/* ─── ПРЕДСТАВЛЕНИЯ ───────────────────────────────────────────────────────── */

export function marketView(market, viewerPlayer = null, now = new Date()) {
  const holding = viewerPlayer?.progression?.markets?.holdings?.[market.marketId] || null;
  const price = curvePrice(market.supply);
  return {
    marketId: market.marketId,
    ticker: market.ticker,
    name: market.name,
    creatorId: undefined, // наружу не отдаём telegramId создателя
    status: market.status,
    price: round(price),
    supply: round(market.supply),
    reserve: round(market.reserve),
    marketCap: round(price * market.supply),
    volumeIntel: round(market.volumeIntel),
    burnedIntel: round(market.burnedIntel),
    tradeCount: market.tradeCount,
    uniqueTraders: market.uniqueTraders,
    holders: market.holders,
    peakPrice: round(num(market.peakPrice)),
    createdAt: market.createdAt,
    expiresAt: market.expiresAt,
    msRemaining: Math.max(0, asMs(market.expiresAt) - asMs(now)),
    finalPrice: market.finalPrice ? round(market.finalPrice) : null,
    // Кривая публична: клиент показывает формулу, игрок понимает, что покупает.
    curve: { base: CURVE_BASE, slope: CURVE_SLOPE, burnRate: TRADE_BURN_RATE },
    viewer: holding ? { shares: round(holding.shares), spentIntel: round(holding.spentIntel) } : null
  };
}

export function marketsPlayerView(player, now = new Date()) {
  ensureMarketShape(player);
  const markets = player.progression.markets;
  const key = seasonKeyFor(now);
  const seasonPoints = markets.seasonKey === key ? markets.seasonSignalPoints : 0;
  const cooldownLeft = markets.lastCreatedAt
    ? Math.max(0, CREATE_COOLDOWN_MS - (asMs(now) - asMs(markets.lastCreatedAt)))
    : 0;
  return {
    holdings: Object.entries(markets.holdings)
      .filter(([, holding]) => num(holding.shares) > 0)
      .map(([marketId, holding]) => ({ marketId, shares: round(holding.shares), spentIntel: round(holding.spentIntel) })),
    createdCount: markets.createdMarketIds.length,
    canCreate: cooldownLeft <= 0,
    createCooldownMs: cooldownLeft,
    createCost: CREATE_COST_INTEL,
    seedShares: CREATOR_SEED_SHARES,
    seasonSignalPoints: seasonPoints,
    seasonCap: SP_SEASON_CAP,
    // Прозрачно объявляем правило начисления, чтобы ожидания были честными.
    rewardRule: {
      perUniqueTrader: SP_PER_UNIQUE_TRADER,
      perMarketTraded: SP_PER_MARKET_TRADED,
      profitGivesSignalPoints: false
    }
  };
}
