# Anime Developer Portfolio

Zero-dependency Node.js app (Node 18+). Public site `/`, admin `/admin1`.

## Run
    cp .env.example .env     # set ADMIN_PASSWORD
    npm start                # http://localhost:3000

## Config (.env)
ADMIN_PASSWORD (server-only, hashed with scrypt in memory), PORT, DATA_DIR (content.json + uploads/), TRUST_PROXY=1 behind a proxy, NODE_ENV=production for Secure cookies.

## Deploy (Render / Railway / VPS)
Use HTTPS. Set env vars above, start command `npm start`, and mount a **persistent disk** at DATA_DIR (e.g. /var/data) — otherwise content and uploads vanish on redeploy. Back up that folder.
Security: sessions are HttpOnly + SameSite=Strict cookies, every /api/admin route requires a session, login is limited to 5 tries / 15 min per IP. Change the default password.

## Storage
Uploads (images, mp4/webm, audio; 200 MB max) go to DATA_DIR/uploads. For S3/R2, replace the upload handler in server.js; or paste any external URL into media fields.
