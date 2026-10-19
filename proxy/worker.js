// Spartan AI team proxy. Deploy on Cloudflare Workers (free tier is enough).
//
// Holds ONE Anthropic API key as a Worker secret and forwards chat requests
// from the extension. The extension never sees the key; it sends a passcode.
// If the passcode leaks, change the passcode. The key stays safe.
//
// Secrets (set with `wrangler secret put <NAME>`):
//   ANTHROPIC_API_KEY   the key
//   PASSCODE            what users type into the extension's Settings
//
// Hard limits below protect your bill: model allowlist, max_tokens cap,
// request size cap. Also set a monthly spend limit in the Anthropic console.

const ALLOWED_MODELS = new Set(['claude-sonnet-5-5', 'claude-haiku-4-5', 'claude-opus-5-5']); // remove opus to cap cost
const MAX_TOKENS_CAP = 1024;
const MAX_BODY_BYTES = 200_000;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-spartan-passcode',
};

function reply(status, body, extra = {}) {
  return new Response(body, { status, headers: { ...CORS, 'content-type': 'application/json', ...extra } });
}
const err = (status, message) => reply(status, JSON.stringify({ error: { message } }));

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST') return err(405, 'POST only');
    if (!env.PASSCODE || !env.ANTHROPIC_API_KEY) return err(500, 'Proxy is not configured');

    const pass = request.headers.get('x-spartan-passcode') ?? '';
    if (!timingSafeEqual(pass, env.PASSCODE)) return err(401, 'Wrong passcode');

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return err(413, 'Request too large');
    let body;
    try { body = JSON.parse(raw); } catch { return err(400, 'Body must be JSON'); }

    if (!ALLOWED_MODELS.has(body.model)) return err(400, `Model not allowed: ${body.model}`);
    body.max_tokens = Math.min(Number(body.max_tokens) || MAX_TOKENS_CAP, MAX_TOKENS_CAP);
    delete body.stream; // keep responses simple and bounded

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'server-side-fallback-2026-07-01',
      },
      body: JSON.stringify(body),
    });
    return reply(upstream.status, await upstream.text());
  },
};

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
