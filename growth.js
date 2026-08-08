export const GENESIS_EVENT_ID = 'genesis-2026';
export const GENESIS_LIMIT = 1_000;

const SOURCE_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const TELEGRAM_NAME_RE = /^[A-Za-z0-9_]{4,64}$/;

export function sanitizeGrowthSource(value, fallback = 'direct') {
  const normalized = String(value || '').trim().toLowerCase().replace(/^src[_-]/, '');
  return SOURCE_RE.test(normalized) ? normalized : fallback;
}

export function parseLaunchParameter(value) {
  const parameter = String(value || '').trim();
  if (!parameter) return { referralCode: '', source: 'direct' };
  if (/^src[_-]/i.test(parameter)) {
    return { referralCode: '', source: sanitizeGrowthSource(parameter) };
  }
  if (/^xr[a-z0-9]+$/i.test(parameter)) {
    return { referralCode: parameter.toUpperCase(), source: 'referral' };
  }
  return { referralCode: '', source: sanitizeGrowthSource(parameter) };
}

export function miniAppBaseUrl({ botUsername = '', appShortName = '' } = {}) {
  const bot = String(botUsername || '').trim().replace(/^@/, '');
  const app = String(appShortName || '').trim();
  if (!TELEGRAM_NAME_RE.test(bot)) return '';
  if (app && !TELEGRAM_NAME_RE.test(app)) return '';
  return `https://t.me/${bot}${app ? `/${app}` : ''}`;
}

export function miniAppLaunchUrl(config, startParameter = '') {
  const base = miniAppBaseUrl(config);
  if (!base) return '';
  const parameter = String(startParameter || '').trim();
  return parameter ? `${base}?startapp=${encodeURIComponent(parameter)}` : `${base}?startapp`;
}

export function activationEligible(player) {
  const taps = Number(player?.progression?.signalEmpire?.scan?.taps || 0);
  const assessments = Number(player?.stats?.reconAttempts || 0);
  return taps >= 25 && assessments >= 1;
}

export function growthState(source = 'direct') {
  return {
    source: sanitizeGrowthSource(source),
    activatedAt: null,
    sharedAt: null,
    shareCount: 0,
    genesis: {
      eventId: GENESIS_EVENT_ID,
      number: null,
      claimedAt: null,
      status: 'pending'
    }
  };
}

export function ensureGrowthState(player) {
  player.progression ||= {};
  player.progression.growth ||= growthState();
  const growth = player.progression.growth;
  growth.source = sanitizeGrowthSource(growth.source);
  growth.activatedAt ??= null;
  growth.sharedAt ??= null;
  growth.shareCount = Math.max(0, Number(growth.shareCount || 0));
  growth.genesis ||= growthState().genesis;
  growth.genesis.eventId ||= GENESIS_EVENT_ID;
  growth.genesis.number ??= null;
  growth.genesis.claimedAt ??= null;
  growth.genesis.status ||= growth.genesis.number ? 'claimed' : growth.activatedAt ? 'capacity_reached' : 'pending';
  return growth;
}

export function publicGrowthState(player) {
  const growth = ensureGrowthState(player);
  return {
    source: growth.source,
    activated: Boolean(growth.activatedAt),
    activatedAt: growth.activatedAt,
    shared: Boolean(growth.sharedAt),
    shareCount: growth.shareCount,
    genesis: {
      eventId: growth.genesis.eventId,
      number: growth.genesis.number,
      claimedAt: growth.genesis.claimedAt,
      status: growth.genesis.status,
      limit: GENESIS_LIMIT
    },
    activation: {
      pulses: Math.min(25, Number(player?.progression?.signalEmpire?.scan?.taps || 0)),
      pulsesRequired: 25,
      assessments: Math.min(1, Number(player?.stats?.reconAttempts || 0)),
      assessmentsRequired: 1
    }
  };
}
