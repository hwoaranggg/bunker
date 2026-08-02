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

  async verifyConversion({ telegramId, event }) {
    if (!this.configured) throw xradarError('XRADAR_NOT_CONFIGURED', 'XRadar conversion verification is not configured.', 503);
    return this.request(new URL('/api/game/conversion/verify', this.baseUrl), {
      method: 'POST',
      body: JSON.stringify({ telegramId, event })
    });
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
    if (!response.ok || data.ok === false) throw xradarError('XRADAR_UNAVAILABLE', data.message || 'XRadar is temporarily unavailable.', 502);
    return data;
  }
}

function xradarError(code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}
