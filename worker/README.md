# Lehan AI Film Studio — OpenAI Worker

This is a **backend foundation**, not a deployed or active AI integration yet.

## Security design

- The browser never receives the OpenAI API key.
- Requests are accepted only from the GitHub Pages origin configured in `src/index.js`.
- The Worker validates the Cloudflare Access JWT signature, issuer, audience, and expiry.
- The Worker accepts only `POST /api/chat`, JSON requests, bounded input sizes, and bounded output tokens.
- OpenAI Responses API requests use `store: false`.
- The Worker does not write to the film workspace or mutate canonical project data.

CORS origin checks alone are not authentication. **Do not deploy this Worker as a public endpoint without configuring Cloudflare Access in front of it.**

## Required Cloudflare setup

1. Create a Cloudflare Worker named `lehan-ai-film-studio-ai` and deploy this folder.
2. Attach a Cloudflare Access application/policy to the Worker hostname. Allow only the intended user identity.
3. Set Worker variables:
   - `CF_ACCESS_TEAM_DOMAIN`: your Cloudflare Access team domain, without `https://`.
   - `CF_ACCESS_AUD`: the exact Application Audience (AUD) tag from the Access application.
   - `OPENAI_MODEL`: a model available to your OpenAI API project.
4. Add `OPENAI_API_KEY` as an encrypted Worker secret. Never put it in `vars`, GitHub, or browser code.
5. Test the Access-protected endpoint before connecting the PWA.

Example secret setup using Wrangler:
```sh
npx wrangler secret put OPENAI_API_KEY
```

## Endpoint contract

`POST /api/chat`

Request:
```json
{
  "message": "Review the active episode outline.",
  "context": "{...active project context JSON...}"
}
```

Response:
```json
{
  "reply": "Review and recommendations...",
  "model": "configured-model",
  "responseId": "..."
}
```

## Important limitations before production

- This Worker is not deployed by GitHub Pages and has not been connected to the PWA.
- Configure Cloudflare Access before exposing the Worker hostname.
- Add Cloudflare-side rate limiting and OpenAI project spending limits before real use.
- The app must send the Access-protected request with the correct authentication flow; this needs a real browser test.
- API usage is billed separately from a ChatGPT subscription.
- Google Flow rendering and CapCut editing remain separate workflows.
