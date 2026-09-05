# Deploy EduVerse TeleHealth (no Vercel)

Ship the Docker image to **Fly.io** (simpler) or **AWS App Runner**. Both consume the same `Dockerfile`.

Required secrets:

- `DATABASE_URL` — Postgres connection string
- `AUTH_SECRET` — `openssl rand -base64 32`
- `AUTH_URL` — public HTTPS origin, e.g. `https://chart.example.com`
- `APP_VERSION` — semver shown on `/api/version`
- `APP_COMMIT` — optional git SHA for Sparkles
- `EMAIL_SERVER` / `EMAIL_FROM` — optional SMTP for magic links
- `SEED_ON_BOOT` — `true` only on the first boot of a new database
- `ATTACHMENT_DIR` — default `/app/data/attachments` (attach a volume)

Magic-link responses never include a verify URL or token.

---

## Fly.io (preferred)

1. Install the Fly CLI and log in.

2. Create the app and a Postgres cluster in `atl` (or nearest Georgia-friendly region):

   ```bash
   fly apps create eduverse-telehealth
   fly postgres create --name eduverse-telehealth-db --region atl
   fly postgres attach eduverse-telehealth-db -a eduverse-telehealth
   ```

3. Set secrets:

   ```bash
   fly secrets set AUTH_SECRET="$(openssl rand -base64 32)" AUTH_URL="https://eduverse-telehealth.fly.dev"
   fly secrets set APP_VERSION="1.0.0"
   ```

4. First boot only, seed staff accounts:

   ```bash
   fly secrets set SEED_ON_BOOT="true"
   fly deploy
   fly secrets unset SEED_ON_BOOT
   ```

5. Health: Fly is configured in `fly.toml` to probe `GET /api/health`.

6. Attach a volume if you will store note attachments on disk:

   ```bash
   fly volumes create chart_files --region atl --size 10
   ```

   Then mount it in `fly.toml`:

   ```toml
   [[mounts]]
     source = "chart_files"
     destination = "/app/data"
   ```

Rotate seed passwords immediately after first login.

---

## AWS App Runner

1. Push the image to Amazon ECR:

   ```bash
   aws ecr create-repository --repository-name eduverse-telehealth
   docker build -t eduverse-telehealth .
   docker tag eduverse-telehealth:latest <account>.dkr.ecr.<region>.amazonaws.com/eduverse-telehealth:latest
   aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
   docker push <account>.dkr.ecr.<region>.amazonaws.com/eduverse-telehealth:latest
   ```

2. Provision Amazon RDS Postgres (or Aurora) in a private subnet. App Runner needs a VPC connector that can reach RDS.

3. Create an App Runner service from the ECR image.

   - Port: `3000`
   - Health check: HTTP `/api/health`
   - Environment / secrets (SSM or Secrets Manager): `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `APP_VERSION`
   - Set `SEED_ON_BOOT=true` for the first revision only, then remove it.

4. Point a custom domain (ACM certificate) at the service. `AUTH_URL` must match that HTTPS origin so cookies stay `Secure`.

5. For attachments, prefer an EFS mount or object storage later. The image writes metadata to Postgres and files to `ATTACHMENT_DIR`.

The entrypoint runs `prisma migrate deploy` before `node server.js`, so schema changes apply on each new revision.

---

## Miss Sparkles hooks

| Check | URL |
| --- | --- |
| Health | `https://<host>/api/health` |
| Version | `https://<host>/api/version` |

Expect `ok: true` and `db: "up"` on health. Alert on HTTP 503 (database down) or missing version.
