// Netlify Function — Anthropic Messages proxy. The API key stays on the server.
const crypto = require('crypto');

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
const fail = (statusCode, message, code) => json(statusCode, { error: { message, code } });

// Only this site's own pages may call the function, and — once MNEMO_ACCESS_CODE is set
// in Netlify — only with that code. Returns an error response, or null when allowed.
function guard(event) {
  const h = Object.fromEntries(Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  const hosts = [h.host, h['x-forwarded-host'], process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.DEPLOY_URL]
    .filter(Boolean).map(v => String(v).replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase());
  let origin = '';
  try { origin = new URL(h.origin).host.toLowerCase(); } catch (e) {}
  if (!origin || !(hosts.includes(origin) || /^localhost(:\d+)?$/.test(origin))) return fail(403, 'Forbidden origin', 'origin');
  const expected = process.env.MNEMO_ACCESS_CODE;
  if (expected) {
    const digest = v => crypto.createHash('sha256').update(String(v || '')).digest();
    if (!crypto.timingSafeEqual(digest(h['x-mnemo-code']), digest(expected))) return fail(401, 'Access code required', 'access_code');
  }
  return null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');
  const denied = guard(event);
  if (denied) return denied;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fail(500, 'ANTHROPIC_API_KEY not set in Netlify environment variables');

  let body;
  try { body = JSON.parse(event.body || ''); } catch (e) { return fail(400, 'Invalid JSON'); }
  if (!body || typeof body.model !== 'string' || !/^claude-[a-z0-9.-]{1,60}$/.test(body.model) || !Array.isArray(body.messages)) return fail(400, 'Invalid request');

  // Forward only what the app uses, with a ceiling on output size.
  const payload = { model: body.model, messages: body.messages, max_tokens: Math.min(4096, Math.max(1, Number(body.max_tokens) || 1024)) };
  if (typeof body.system === 'string') payload.system = body.system;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(payload)
    });
    return { statusCode: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: await response.text() };
  } catch (err) {
    return fail(502, err.message);
  }
};
