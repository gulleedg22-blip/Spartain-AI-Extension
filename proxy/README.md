# Team proxy (optional)

Lets a group share one Anthropic key without anyone seeing it. The key lives in a Cloudflare Worker. Users enter a passcode in the extension. The Worker checks the passcode, forwards the request to Anthropic, and returns the reply.

If the passcode leaks: change the passcode. The key never left the Worker.

## Deploy (owner, once, about 5 minutes)

1. Make a free account at https://dash.cloudflare.com.
2. In this folder:

   ```bash
   cd proxy
   npx wrangler login
   npx wrangler secret put ANTHROPIC_API_KEY   # paste a FRESH key from console.anthropic.com
   npx wrangler secret put PASSCODE            # pick something long; this is what friends type in
   npx wrangler deploy
   ```

3. Wrangler prints a URL like `https://spartain-proxy.<your-name>.workers.dev`. That is the proxy URL.
4. In the Anthropic console, set a monthly spend limit. Everyone using the passcode bills this key.

## Use (everyone)

Extension > Settings > Provider: **Team proxy**. Enter the proxy URL and the passcode. Save.

## Limits built in

- Model allowlist: `claude-sonnet-5-5`, `claude-haiku-4-5`
- `max_tokens` capped at 1024 per reply
- Request body capped at 200 KB
- Wrong passcode: 401, nothing forwarded

Add Cloudflare rate limiting in the dashboard if usage grows. Rotate the passcode from the dashboard (Workers > spartain-proxy > Settings > Variables) or with `wrangler secret put PASSCODE`.
