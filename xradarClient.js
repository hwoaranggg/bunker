export class XRadarClient {
  constructor({ baseUrl = '', apiKey = '' } = {}) {
    this.baseUrl = String(baseUrl || '').replace(/\/$/, '');
    this.apiKey = String(apiKey || '');
  }

  get configured() {
    return Boolean(this.baseUrl && this.apiKey);
  }

  async health() {
    if (!this.baseUrl) return 'not-configured';
    try {
      const response = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(2_000) });
      return response.ok ? 'ok' : 'degraded';
    } catch {
      return 'unavailable';
    }
  }

  async wave(count = 5) {
    if (!this.configured) throw xradarError('XRADAR_NOT_CONFIGURED', 'Live XRadar waves are not configured.', 503);
    const url = new URL('/api/game/wave', this.baseUrl);
    url.searchParams.set('count', String(Math.max(3, Math.min(8, Number(count) || 5))));
    const data = await this.request(url, { method: 'GET' });
    if (!Array.isArray(data.wave)) throw xradarError('XRADAR_BAD_RESPONSE', 'XRadar returned an invalid wave.', 502);
    return data.wave;
  }

  async resolve(id, decision) {
    if (!this.configured) throw xradarError('XRADAR_NOT_CONFIGURED', 'Live XRadar waves are not configured.', 503);
    const data = await this.request(new URL('/api/game/wave/resolve', this.baseUrl), {
      method: 'POST',
      body: JSON.stringify({ id, decision })
    });
    if (typeof data.correct !== 'boolean') throw xradarError('XRADAR_BAD_RESPONSE', 'XRadar returned an invalid result.', 502);
    return data;
  }

  // What the token actually did over the position's horizon. `pct: null` means
  // the radar has no confirmed movement yet — never treat that as zero.
  async outcome(id, horizon) {
    if (!this.configured) throw xradarError('XRADAR_NOT_CONFIGURED', 'Live XRadar outcomes are not configured.', 503);
    const data = await this.request(new URL('/api/game/wave/outcome', this.baseUrl), {
      method: 'POST',
      body: JSON.stringify({ id, horizon })
    });
    if (typeof data.pct !== 'number' && data.pct !== null) throw xradarError('XRADAR_BAD_RESPONSE', 'XRadar returned an invalid outcome.', 502);
    return data;
  }

  async verifyConversion({ telegramId, event }) {
    if (!this.configured) throw xradarError('XRADAR_NOT_CONFIGURED', 'XRadar conversion verification is not configured.', 503);
    return this.request(new URL('/api/game/conversion/verify', this.baseUrl), {
      method: 'POST',
      body: JSON.stringify({ telegramId, event })
    });
  }

  // Cumulative, XRadar-verified trading totals for a player. The terminal owns
  // on-chain verification; the game only ever credits the delta over what it
  // has already paid, so this can be re-polled safely.
  async tradingSummary({ telegramId }) {
    if (!this.configured) throw xradarError('XRADAR_NOT_CONFIGURED', 'XRadar trading summary is not configured.', 503);
    const data = await this.request(new URL('/api/game/trading/summary', this.baseUrl), {
      method: 'POST',
      body: JSON.stringify({ telegramId })
    });
    // A summary is only actionable when the terminal confirms the account is
    // verified; unverified accounts return zeroed totals.
    return {
      verified: Boolean(data.verified),
      tradeCount: Math.max(0, Math.floor(Number(data.tradeCount) || 0)),
      volumeUsd: Math.max(0, Number(data.volumeUsd) || 0)
    };
  }

  async request(url, options) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {})
      },
      signal: AbortSignal.timeout(8_000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      // Surface the terminal's own status and error code — without this the
      // failure collapses into a generic "unavailable" and it's impossible to
      // tell a missing key (401) from an empty token feed (503) or a missing
      // route (404).
      const detail = data.error || data.message || `HTTP ${response.status}`;
      console.error(`[xradar] ${options.method || 'GET'} ${url.pathname} -> ${response.status} ${detail}`);
      throw xradarError('XRADAR_UNAVAILABLE', `XRadar: ${detail} (HTTP ${response.status})`, 502);
    }
    return data;
  }
}

function xradarError(code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}
