// AI provider boundary. THIS IS THE ONE PLACE THE UI TALKS TO A MODEL.
//
// Plan of record: Spartain AI uses a LOCAL model (running on the user's
// machine, e.g. an HTTP server on localhost), NOT a hosted API and NOT the
// Anthropic API. Nothing in this file is implemented yet. It is left open
// for contributors; see docs/ROADMAP.md and the "AI provider" GitHub issue.
//
// Contract the UI relies on (keep this signature stable):
//
//   generate({ messages, context, settings, signal }) -> Promise<string>
//     messages : [{ role: 'user' | 'ai', text: string }]  full conversation
//     context  : { title, url, selection } | null        current page, if enabled
//     settings : the object from src/sidepanel/storage.js (endpoint, model name)
//     signal   : AbortSignal so the UI can cancel
//
// Notes for whoever implements this:
// - Calling http://localhost:PORT from the side panel requires adding that
//   origin to "host_permissions" in manifest.json. Justify it in the PR.
// - Stream if you can; the UI can accept partial text via an onToken callback
//   if you add one. Keep the Promise<string> return for the final text.
// - Never embed keys. A local model needs none; a remote one would go through
//   a team-owned backend, not this file.

export class ProviderNotConfiguredError extends Error {
  constructor() {
    super('No AI provider is connected yet. See src/ai/provider.js.');
    this.name = 'ProviderNotConfiguredError';
  }
}

// eslint-disable-next-line no-unused-vars
export async function generate({ messages, context, settings, signal }) {
  // TODO(contributors): implement the local-model call here.
  throw new ProviderNotConfiguredError();
}
