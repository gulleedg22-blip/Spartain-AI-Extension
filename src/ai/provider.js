// AI provider boundary. THIS IS THE ONE PLACE THE UI TALKS TO A MODEL.
//
// Two backends, chosen by settings.provider:
//   'local'     a model server on the user's machine (Ollama's /api/chat).
//               Default and recommended. No key, nothing leaves the computer.
//   'anthropic' the Anthropic API with a key the user typed into Settings.
//               The key lives in chrome.storage.local on that computer only.
//               It is never in the repo and never sent anywhere but Anthropic.
//   'proxy'     a team proxy (see proxy/README.md) that holds the key server
//               side. The user enters the proxy URL and a passcode.
//
// Contract: generate({ messages, context, settings, signal }) -> Promise<string>
//   messages : [{ role: 'user' | 'ai', text }]  full conversation
//   context  : { title, url, selection } | null  current page, if enabled
//   settings : from src/sidepanel/storage.js
//   signal   : AbortSignal

export class ProviderNotConfiguredError extends Error {
  constructor(message) {
    super(message ?? 'No AI provider is configured. Open Settings.');
    this.name = 'ProviderNotConfiguredError';
  }
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-5-5';
const ANTHROPIC_MODELS = new Set(['claude-sonnet-5-5', 'claude-haiku-4-5', 'claude-opus-5-5']);
const MAX_TOKENS = 1024;

function systemPrompt(context, settings) {
  const who = settings.displayName ? ` The user's name is ${settings.displayName}.` : '';
  let s = `You are Spartan AI, a concise study assistant for De La Salle High School students, in a Chrome side panel.${who} Answer plainly and briefly.`;
  if (context?.title || context?.url) {
    s += `\n\nThe user is viewing: "${context.title}" (${context.url}).`;
  }
  if (context?.selection) {
    s += `\n\nSelected text on the page:\n"""\n${context.selection}\n"""`;
  }
  return s;
}

// Convert UI history to alternating user/assistant turns. Consecutive same-role
// messages (e.g. after an error) are merged so the API never sees two users in a row.
function toTurns(messages) {
  const turns = [];
  for (const m of messages) {
    const role = m.role === 'ai' ? 'assistant' : 'user';
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += '\n\n' + m.text;
    else turns.push({ role, content: m.text });
  }
  if (turns[0]?.role === 'assistant') turns.shift();
  return turns;
}

async function generateLocal({ messages, context, settings, signal }) {
  const base = (settings.modelEndpoint || '').replace(/\/+$/, '');
  if (!base) throw new ProviderNotConfiguredError('Set the local model endpoint in Settings.');
  if (!settings.modelName) throw new ProviderNotConfiguredError('Set a model name in Settings (for example "llama3").');

  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    signal,
    body: JSON.stringify({
      model: settings.modelName,
      stream: false,
      messages: [{ role: 'system', content: systemPrompt(context, settings) }, ...toTurns(messages)],
    }),
  }).catch((e) => {
    throw new Error(`Could not reach the local model at ${base}. Is it running? (${e.message})`);
  });
  if (!res.ok) throw new Error(`Local model returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.message?.content;
  if (typeof text !== 'string') throw new Error('Local model returned an unexpected response shape.');
  return text.trim();
}

function anthropicBody({ messages, context, settings }) {
  const model = ANTHROPIC_MODELS.has(settings.anthropicModel) ? settings.anthropicModel : DEFAULT_ANTHROPIC_MODEL;
  return JSON.stringify({
    model,
    max_tokens: MAX_TOKENS,
    fallbacks: 'default',
    system: systemPrompt(context, settings),
    messages: toTurns(messages),
  });
}

async function readAnthropicResponse(res, label) {
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error?.message ?? ''; } catch { /* ignore */ }
    if (res.status === 401) throw new Error(label === 'proxy' ? 'The proxy rejected the passcode. Check it in Settings.' : 'Anthropic rejected the API key. Check it in Settings.');
    throw new Error(`${label === 'proxy' ? 'Proxy' : 'Anthropic API'} returned ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  const data = await res.json();
  if (data.stop_reason === 'refusal') return 'The model declined to answer that request.';
  const text = (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  if (!text) throw new Error('The model returned no text.');
  return text.trim();
}

async function generateProxy(args) {
  const { settings, signal } = args;
  const url = (settings.proxyUrl || '').trim().replace(/\/+$/, '');
  if (!url) throw new ProviderNotConfiguredError('Enter the team proxy URL in Settings.');
  if (!settings.proxyPasscode) throw new ProviderNotConfiguredError('Enter the team passcode in Settings.');
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json', 'x-spartan-passcode': settings.proxyPasscode },
    body: anthropicBody(args),
  }).catch((e) => { throw new Error(`Could not reach the proxy at ${url} (${e.message}).`); });
  return readAnthropicResponse(res, 'proxy');
}

async function generateAnthropic(args) {
  const { settings, signal } = args;
  const key = settings.anthropicApiKey?.trim();
  if (!key) throw new ProviderNotConfiguredError('Enter your Anthropic API key in Settings.');

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': ANTHROPIC_VERSION,
      // Required for calls from a browser context. The key is the user's own and stays on their machine.
      'anthropic-dangerous-direct-browser-access': 'true',
      // Route refusals from safety classifiers to a fallback model automatically.
      'anthropic-beta': 'server-side-fallback-2026-07-01',
    },
    body: anthropicBody(args),
  }).catch((e) => {
    throw new Error(`Could not reach the Anthropic API (${e.message}).`);
  });
  return readAnthropicResponse(res, 'anthropic');
}

export async function generate(args) {
  const provider = args.settings?.provider ?? 'local';
  if (provider === 'anthropic') return generateAnthropic(args);
  if (provider === 'proxy') return generateProxy(args);
  if (provider === 'local') return generateLocal(args);
  throw new ProviderNotConfiguredError(`Unknown provider "${provider}".`);
}
