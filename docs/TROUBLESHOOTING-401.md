# Understanding 401 "Not authenticated" / "Authentication required" errors

## What’s going on

The app uses **cookie-based sessions**. When you log in, the backend sets a session cookie (`checkin.sid`). Every later request to the API is supposed to send that cookie so the server can treat you as logged in.

A **401** means the server did **not** see a valid session for that request. So either there was no session to begin with, or the cookie wasn’t sent, or the server lost the session.

## How the flow works

1. **On load**  
   The app calls `GET /api/me` to restore your session.  
   - If the server has a session for you → 200, app shows dashboard.  
   - If not → **401 "Not authenticated"**, app shows the login screen.

2. **After login**  
   You submit the form → `POST /api/login` → server sets `req.session.user` and sends back `Set-Cookie` with the session id.  
   The next request (e.g. `GET /api/mood-history/7`) must send that cookie. If it doesn’t, you get **401 "Authentication required"**.

3. **Director/teacher features**  
   Endpoints like `/api/director/all-users`, `/api/director/all-journal-entries`, etc. all use the same session. If the session isn’t there, every one of them returns 401.

So the errors you see are the server correctly rejecting requests that don’t have a valid session.

## Common causes and fixes

### 1. You’re not logged in

- **Cause:** You opened the app (or refreshed) and never logged in, or the session had already expired.
- **Fix:** Use the login screen. After a successful login, the first request that fails with 401 is the real problem (see below).

### 2. Login “succeeds” but the next request is 401

- **Cause:** The login response returns `{ success: true, user }`, but the **session cookie is not stored or not sent** on the next request.
- **Typical reasons:**
  - **Cross-origin:** The page is served from a different origin than the API (e.g. `http://localhost:8080` vs `http://localhost:3000`, or `file://` vs `http://localhost:3000`). Browsers only send cookies to the same origin (or to the API origin when CORS allows it with `credentials: true`). If the page origin and API origin differ, ensure you always use the same origin for both, or that the API is configured for that frontend origin and credentials (the backend uses `cors({ origin: true, credentials: true })`).
  - **Mixed hostnames:** You opened the app as `http://127.0.0.1:3000` but the cookie was set for `localhost` (or the other way around). Use one hostname consistently (e.g. always `http://localhost:3000`).
  - **Secure cookie in production:** In production the session cookie is `secure: true`, so it’s only sent over **HTTPS**. If you’re on `http://` in production, the browser won’t send the cookie → 401 on every request after login.

### 3. Backend restarted

- **Cause:** Sessions are stored in memory (default `express-session` store). Restarting the Node process clears them.
- **Fix:** Log in again after every backend restart. For production, you’d typically use a persistent session store (e.g. Redis or a database).

### 4. Cookies disabled or cleared

- **Cause:** Browser cookies are disabled, or you cleared site data.
- **Fix:** Enable cookies for the app’s origin and log in again.

### 5. Multiple backend processes

- **Cause:** More than one Node process (e.g. cluster or several instances) with the default in-memory store. Login hits process A and sets the session there; the next request hits process B, which has no session.
- **Fix:** Use a shared session store (e.g. Redis) so all processes see the same session, or run a single process.

## Quick checks

- Open DevTools → Application (or Storage) → Cookies → select your app’s origin. After login you should see a cookie (e.g. `checkin.sid`). If it’s missing on the next request, the issue is cookie storage or cross-origin/secure.
- In Network, inspect the **login** response: `Set-Cookie` should be present. Then inspect the **next** request (e.g. `/api/mood-history/7`): the `Cookie` header should include that session cookie.
- Use the **same URL** for the app and the API when testing (e.g. always `http://localhost:3000` with the backend serving both the page and `/api/*`).

## Summary

| Symptom | Likely cause |
|--------|----------------|
| 401 on first load (`/api/me`) | Not logged in or no session – expected; app should show login. |
| 401 on every request after login | Cookie not set or not sent (cross-origin, hostname, secure, or cookies disabled). |
| 401 after restarting backend | In-memory sessions cleared – log in again. |
| 401 only sometimes | Multiple backend processes without a shared session store. |

Fixing the 401 is always about making sure the server has a session for the request (usually by ensuring the session cookie is set at login and sent on every subsequent API call from the same browser/origin).
