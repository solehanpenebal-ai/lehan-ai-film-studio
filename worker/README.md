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
- `OPENAI_MODEL`: a model enabled for the OpenAI API project.

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
4. Configure the three runtime variables above.
5. Add `OPENAI_API_KEY` as an encrypted secret.
6. Keep `workers.dev` disabled until authentication and rate limits are reviewed.
7. Test missing token (must return 401), wrong email (401), unverified email (401), valid allowed user (reaches provider configuration), CORS preflight, and the real browser flow.
8. Only then connect the app UI to Firebase sign-in and this Worker.

## Important

- API usage is billed separately from a ChatGPT subscription.
- Do not deploy an unauthenticated endpoint or expose the OpenAI key.
- Google Flow rendering and CapCut editing remain separate workflows.
