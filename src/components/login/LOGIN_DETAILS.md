# Login Details

This document summarizes the login-related endpoints, payloads, and usage notes for the login UI component.

**Related file**: [src/components/login/LoginCard.tsx](src/components/login/LoginCard.tsx)

## Purpose

Provide a concise reference for developers and testers about available login flows used by the front-end:

- HR login (application DB)
- AD login (Active Directory validation via API)
- Admin verification check

## Endpoints

- HR login endpoint (used by `postJSON` in the frontend):
  - POST `/CBRSAPI/CBRSUPERUserLogin`
  - Payload: `{ "Username": "<username>", "Password": "<password>" }`
  - Expected response example: `{ "Logged": true, "Errormsg": "" }`

- User details fetch (after successful login):
  - POST `/CBRSAPI/CBRSEPFNOLogin`
  - Payload: `{ "Username": "<username>", "Password": "<password>" }`
  - Returns user profile / details used by the app

- AD login validation (used for AD Sign In flow):
  - POST `/SMART_API/api/UserManagement/ValidateADLoginCEBINFO`
  - Payload: `{ "ad_user_name": "<username>", "ad_password": "<password>" }`
  - Frontend expects `response.ok` and a JSON body containing `isSuccess: true` when valid

- Admin verification (used when "Admin User" checkbox is checked):
  - GET `/misapi/api/roleinfo/admin`
  - Expected response: payload with `data` array; admin check looks for matching `EpfNo` equal to the username

## Frontend behavior summary

- The login UI offers two flows: HR Sign In and AD Sign In. Both call different endpoints but share the same UX.
- After a successful login (either HR or AD), the app fetches additional user details using `/CBRSAPI/CBRSEPFNOLogin`.
- If the "Admin User" checkbox is checked, the frontend performs an extra GET to `/misapi/api/roleinfo/admin` to confirm admin privileges before navigating.
- On successful login the app navigates to `/adminhome` (when admin) or `/home` (regular user).

## Example curl requests

- HR login (example):

  curl -X POST "http://<host>/CBRSAPI/CBRSUPERUserLogin" \
    -H "Content-Type: application/json" \
    -d '{"Username":"REPLACE_USERNAME","Password":"REPLACE_PASSWORD"}'

- AD validation (example):

  curl -X POST "http://<host>/SMART_API/api/UserManagement/ValidateADLoginCEBINFO" \
    -H "Content-Type: application/json" \
    -d '{"ad_user_name":"REPLACE_USERNAME","ad_password":"REPLACE_PASSWORD"}'

## Response handling notes

- HR login: check `Logged` property in the returned JSON to determine success.
- AD login: the frontend checks `response.ok` and the JSON field `isSuccess`.
- Admin check: response is expected to contain a `data` array. The frontend checks if any `EpfNo` in `data` matches the username.

## Local development / testing

- Ensure local proxy / CORS settings allow the frontend to call these backend paths or configure `vite` proxy as needed.
- The app removes localStorage key `userData` before login attempts; user profile is later set via `setUser`.

## Security and best practices

- Do NOT store plaintext credentials in source control. Use environment-specific test accounts only in secure vaults.
- Avoid committing secrets to this repository. If you need sample credentials for local testing, store them outside the repo or in an ignored `.env.local` file.
- All network errors should be surfaced via the UI (the component uses `react-toastify` for notifications).

## Troubleshooting

- If AD login always fails: inspect network request to `/SMART_API/api/UserManagement/ValidateADLoginCEBINFO` and check backend logs.
- If admin verification fails unexpectedly: log the admin payload and ensure `EpfNo` values are in the expected format (string vs number).

---

If you want this file moved or renamed, or want example test credentials (stored securely), tell me where to place them.
