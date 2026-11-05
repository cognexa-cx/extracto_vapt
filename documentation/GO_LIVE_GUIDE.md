# Go-Live Guide (simple version)

This guide covers what to do before and after deploying the security fixes
(SCR-01 to SCR-17). Do the steps in order. Use a **test copy first**.

## 1. Back up
- Take a full backup of the SQL Server database.
- Copy the current `.env` file somewhere safe.

## 2. Update the `.env` file
The app will **not start** unless these are correct.
Use `local_backend/.env.local.example` as the guide.

| Setting | What to put | How to make it |
|---|---|---|
| `ENVIRONMENT` | `production` (or `development` / `test`) | type it |
| `JWT_SECRET` | random text, 32+ characters | `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `IMAGE_SIGNING_SECRET` | a **different** random text, 32+ characters | same command |
| `ENCRYPTION_KEY` | exactly 64 bytes, base64 | `python -c "import secrets, base64; print(base64.b64encode(secrets.token_bytes(64)).decode())"` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 5 to 60 (default 30) | optional |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 1 to 30 (default 30) | optional |

Warning: if your `ENCRYPTION_KEY` is 32 or 48 bytes today, changing it makes
existing encrypted data unreadable. Do **not** just replace it. Use the
re-encryption script instead (take a database backup first):

```bash
cd local_backend
export OLD_ENCRYPTION_KEY='<your current key>'
export NEW_ENCRYPTION_KEY="$(python -c 'import secrets,base64;print(base64.b64encode(secrets.token_bytes(64)).decode())')"
python scripts/rekey_pii.py            # dry run: changes nothing, shows counts
python scripts/rekey_pii.py --apply    # does it, all-or-nothing, and verifies
```

Then put the new key into `.env` as `ENCRYPTION_KEY` and start the app. Save
the new key somewhere safe (lose it = data unreadable) and keep the old key
until you have checked that everything works. Check your key size with:
`python -c "import base64; print(len(base64.b64decode('YOUR_KEY')))"`.

## 3. Database certificate
The app now checks the SQL Server certificate.
- Best: install a proper certificate on SQL Server, and use the same server
  name in `SQL_SERVER_HOST` as on the certificate.
- Short term only: set `SQL_SERVER_TRUST_CERT=yes` (less safe).

## 4. Optional but recommended
- `STORAGE_ENCRYPTION_KEY`: encrypts saved images. Make one with
  `python -c "import secrets, base64; print(base64.b64encode(secrets.token_bytes(32)).decode())"`.
  Keep this key somewhere other than the image folder and its backups.
- Put the image folder on an encrypted disk and limit who can open it.
- At your web server (for example nginx), set a maximum upload size such as
  `client_max_body_size 20m;`.

## 5. Start the app and check
- Start the backend. If it stops with a message, the message tells you which
  setting is wrong.
- If it says "PII encryption migration incomplete", **do not ignore it**.
  Restore from the backup and ask the developers.

## 6. First login
- If the admin still has a default password, the admin is locked to the
  "Set a new password" screen. Choose a password with 12 or more characters,
  with letters and digits.
- Everyone has to log in again once after this (old sessions end).
- Old image links stop working once; the app creates new ones.

## 7. Tablets and kiosks (per-device keys)
- Log in as Admin and call `POST /api/devices` with a name for each device.
- It returns `device_id` and `device_key`. **The key is shown only once.**
  Save it on that device, sent as `X-Device-Id` and `X-Device-Key`.
- Lost a tablet? Call `POST /api/devices/{device_id}/revoke`. Other tablets
  keep working.
- The old shared `DEVICE_API_KEY` is switched off. To keep it working while you
  move devices, set `ALLOW_LEGACY_SHARED_DEVICE_KEY=yes` and `DEVICE_API_KEY`
  (32+ characters) for a short time, then remove both.

## 8. Test checklist
- [ ] App starts without errors
- [ ] Admin can log in and change the password
- [ ] Staying logged in works after 30 minutes (no sudden logout)
- [ ] Upload a normal invoice image and extract it
- [ ] Open a saved image
- [ ] A registered device can upload; a revoked device cannot
- [ ] Ask the audit team to retest

## Problems?
| What you see | Likely cause |
|---|---|
| "ENVIRONMENT must be explicitly configured" | `ENVIRONMENT` not set |
| "JWT_SECRET must contain at least 32" | secret too short |
| "ENCRYPTION_KEY must decode to exactly 64 bytes" | wrong key size |
| "IMAGE_SIGNING_SECRET ..." | missing, too short, or same as `JWT_SECRET` |
| Cannot connect to database, certificate error | see step 3 |
| 500 error when reading users or records | stored data cannot be decrypted; check the key and the backup |
