# Lehan AI Film Studio — OpenAI Worker

This Worker is a backend foundation. It is **not an active AI integration** until the runtime variables and OpenAI secret are configured, the Worker is deployed, and the endpoint is tested.

## Authentication design (no Cloudflare Access dependency)

The Worker authenticates one explicitly allowed Firebase user:

- Firebase Authentication is used with the no-cost Spark plan and an email/password or Google sign-in provider. Do not use phone/SMS authentication for this setup.
- The browser obtains a Firebase ID token after sign-in and sends it as `Authorization: Bearer <ID_TOKEN>`.
- The Worker verifies the JWT signature using Google's Secure Token public JWKs and validates `aud`, `iss`, `sub`, `exp`, `iat`, `auth_time`, `email`, and `email_verified`.
- The Worker only accepts the exact email configured in `FIREBASE_ALLOWED_EMAIL`.
- The browser never receives the OpenAI API key.
- CORS only allows the production GitHub Pages origin. CORS is not authentication; Firebase token verification is required.

## Runtime configuration

Set these under the Worker **Settings → Variables and Secrets → Runtime variables**:

- `FIREBASE_PROJECT_ID`: exact Firebase project ID (public project identifier).
- `FIREBASE_ALLOWED_EMAIL`: the one verified email address allowed to use this Worker.
- `OPENAI_MODEL`: a model ID enabled for the OpenAI API project. This is required; the Worker intentionally has no guessed/default model ID and returns a configuration error if it is missing.

Add `OPENAI_API_KEY` separately as an encrypted Worker secret. Never put it in GitHub, a plain variable, app JavaScript, or chat messages.

## Endpoint

`POST /api/chat`

Headers:
```http
Content-Type: application/json
Authorization: Bearer <Firebase ID token>
```

Body:
```json
{
  "message": "Review the active episode outline.",
  "context": "{...active project context JSON...}"
}
```

## Limits and protections

- Only `POST /api/chat` is accepted.
- Exact allowed browser origin only.
- 48 KiB request body, 6,000-character message, 30,000-character context.
- 1,800 maximum output tokens.
- OpenAI Responses API uses `store: false`.
- The Worker does not write to workspace storage or mutate approved film canon.
- Firebase token verification keys are cached in memory for up to one hour.
- A Cloudflare Rate Limiting binding (`ASTRA_AI_RATE_LIMITER`) allows up to 5 authenticated chat requests per 60 seconds per Firebase user ID. Cloudflare documents this limiter as approximate and location-local; it is not a strict global quota or a spending cap. Configure a separate OpenAI project budget/usage alert before paid use.

## Deployment and testing checklist

1. Create a Firebase project on Spark (no payment method required for Firebase Authentication's no-cost options).
2. Enable Email/Password sign-in or Google sign-in; do not enable phone/SMS sign-in for this no-card setup.
3. Create one user and verify the email address.
4. Configure the three runtime variables above, including a verified model ID enabled for the API project.
5. Configure the `ASTRA_AI_RATE_LIMITER` binding from `worker/wrangler.toml` (5 requests per 60 seconds). The namespace ID must be unique within your Cloudflare account.
6. Add `OPENAI_API_KEY` as an encrypted secret.
7. Keep `workers.dev` disabled until authentication and rate limits are reviewed.
8. Test missing token (401), wrong email (401), unverified email (401), valid allowed user, excess requests (429), CORS preflight, and the real browser flow.
9. Only then connect the app UI to Firebase sign-in and this Worker.

## Important

- API usage is billed separately from a ChatGPT subscription.
- Do not deploy an unauthenticated endpoint or expose the OpenAI key.
- Google Flow rendering and CapCut editing remain separate workflows.

## Dashboard setup guide (Android / no computer)

This route uses the Cloudflare web dashboard and does not require a terminal.

### A. Deploy the Worker from GitHub (recommended for Android)

This method deploys the Worker together with `wrangler.toml`, including the `ASTRA_AI_RATE_LIMITER` binding. Do not use a manual code-only deployment for this project because that can omit the rate-limit binding.

1. Open the Cloudflare dashboard and go to **Workers & Pages**.
2. Select **Create application** → **GitHub** and authorize Cloudflare to access only the repository `solehanpenebal-ai/lehan-ai-film-studio`.
3. Select that repository and its production branch.
4. Set the Worker name to `lehan-ai-film-studio-ai`.
5. Set **Root directory** to `worker`. This is essential: the folder contains both `wrangler.toml` and `src/index.js`.
6. Leave **Build command** empty. Use **Deploy command** `npm run deploy` (or the default `npx wrangler deploy`).
7. Select **Save and Deploy**. Confirm that the build succeeds and the Worker name is `lehan-ai-film-studio-ai`.
8. Copy the deployed `workers.dev` URL. Do not paste any API key into the URL field in the app.

Cloudflare Workers Builds supports connecting a GitHub repository and configuring a root directory and deploy command. See the official [Workers Builds documentation](https://developers.cloudflare.com/workers/ci-cd/builds/).

### B. Add runtime variables and the API secret

Open the Worker → **Settings** → **Variables and Secrets** → **Add**.

Add these as **Text** variables:

| Name | Value |
|---|---|
| `FIREBASE_PROJECT_ID` | Exact Project ID shown in Firebase Project settings |
| `FIREBASE_ALLOWED_EMAIL` | The one email address you verified in Firebase |
| `OPENAI_MODEL` | Exact model ID enabled for your OpenAI API project |

Add this separately as type **Secret**:

| Name | Value |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key |

After adding them, select **Deploy**. Never send the API key to ChatGPT, put it in the Firebase web config, or save it in GitHub.

### C. Configure Firebase

1. Open Firebase Console and create/select the project.
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. In **Authentication → Settings → Authorized domains**, ensure `solehanpenebal-ai.github.io` is present. Add it if absent.
4. Create the one account whose email exactly matches `FIREBASE_ALLOWED_EMAIL`.
5. Verify that email using the message Firebase sends.
6. In **Project settings → General → Your apps**, register a Web app if one does not exist. Copy its Firebase web config into the Lehan AI Film Studio Firebase configuration panel. This web config is distinct from the OpenAI API key.

### D. Connect the app

1. Open the deployed Lehan AI Film Studio site.
2. Open **Astra AI Companion**.
3. Save the Firebase Web App config.
4. Enter the Worker URL shown by Cloudflare, normally `https://lehan-ai-film-studio-ai.<your-account-subdomain>.workers.dev`.
5. Sign in with the verified, allowed email.
6. Send a short test message. A successful answer should show the configured model name.

### E. Verify access before normal use

- A request without a Firebase token must return HTTP 401.
- A different email or unverified email must return HTTP 401.
- The correct verified email should pass authentication.
- If it returns HTTP 503, check Worker variables/secrets and deployment.
- If the browser reports a network/CORS error, confirm the Worker URL and the GitHub Pages origin.

**Important deployment gate:** Do not enable broad public access or announce the AI feature as live until authentication tests pass, the `ASTRA_AI_RATE_LIMITER` binding is present, and OpenAI project spending controls are configured. Cloudflare Worker rate limiting is approximate and location-local; it does not guarantee a strict global request ceiling or cap OpenAI charges.

