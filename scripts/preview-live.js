// Preview with live waves wired to the local radar stub, so the signal reveal
// and the "track it in XRadar" call to action can be worked on offline.
// Development only — the wave data is synthetic (see dev-radar-stub.js).

import { startRadarStub, STUB_API_KEY } from './dev-radar-stub.js';

const stub = await startRadarStub({ apiKey: STUB_API_KEY });

process.env.XRADAR_BASE_URL = `http://127.0.0.1:${stub.port}`;
process.env.XRADAR_GAME_API_KEY = STUB_API_KEY;

await import('./preview.js');
