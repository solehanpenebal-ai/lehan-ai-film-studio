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
- Add Cloudflare rate limiting and OpenAI project spending limits before real usage.

## Deployment and testing checklist

1. Create a Firebase project on Spark (no payment method required for Firebase Authentication's no-cost options).
2. Enable Email/Password sign-in or Google sign-in; do not enable phone/SMS sign-in for this no-card setup.
3. Create one user and verify the email address.
4. Configure the three runtime variables above, including a verified model ID enabled for the API project.
5. Add `OPENAI_API_KEY` as an encrypted secret.
6. Keep `workers.dev` disabled until authentication and rate limits are reviewed.
7. Test missing token (must return 401), wrong email (401), unverified email (401), valid allowed user (reaches provider configuration), CORS preflight, and the real browser flow.
8. Only then connect the app UI to Firebase sign-in and this Worker.

## Important

- API usage is billed separately from a ChatGPT subscription.
- Do not deploy an unauthenticated endpoint or expose the OpenAI key.
- Google Flow rendering and CapCut editing remain separate workflows.

## Dashboard setup guide (Android / no computer)

This route uses the Cloudflare web dashboard and does not require a terminal.

### A. Create the Worker shell

1. Open the Cloudflare dashboard in a browser and sign in.
2. Open **Workers & Pages** and choose **Create application** / **Create Worker** (the exact label may vary).
3. Create a Worker named `lehan-ai-film-studio-ai`.
4. Open its code editor (**Edit code**).
5. Replace the starter code with the complete contents of this repository file: `worker/src/index.js`.
6. Save and deploy the code. Do not share the editor with anyone and do not paste secrets into the source code.

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

**Important deployment gate:** Do not enable broad public access or announce the AI feature as live until the authentication tests pass and Cloudflare rate limiting plus OpenAI project spending limits have been configured. The current Worker restricts access to one verified email, but this is not a substitute for rate and spending controls.

