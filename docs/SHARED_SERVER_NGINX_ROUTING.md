# Shared server: ERP + Laravel admin app on one nginx (port 80)

Both apps live on the same production box (`187.127.123.26`) and share host port
80 through the ERP frontend container's nginx (`erp-frontend`). This doc explains
how routing between them works and what broke once already — read this before
touching either app's nginx config again.

## The two apps

| App | Domain | Where it actually runs | Reached via |
|---|---|---|---|
| Ghazanfar ERP (frontend + API) | `erp.ghazanfarbrothers.com`, and the bare IP | `erp-frontend` container (nginx, port 80), proxies `/api/` to `erp-backend` on port 3000 | `default.conf` |
| Laravel admin app ("bridge") | `adminapp.ghazanfarbrothers.com` | `adminapp-laravel-app` + `adminapp-laravel-nginx`, exposed on host port `8081` | `bridge.conf` |

Both nginx config files live in the **same container** (`erp-frontend`), at
`/etc/nginx/conf.d/`:
- `default.conf` — the ERP's own server block (`server_name _;`, i.e. catch-all).
- `bridge.conf` — a small reverse-proxy block that forwards
  `adminapp.ghazanfarbrothers.com` traffic to `http://187.127.123.26:8081`
  (the Laravel app's own nginx).

## What broke (2026-07-20, ~11:31 UTC)

`bridge.conf` was added for the Laravel app, but **neither file declared
`default_server`**. nginx picks a default vhost for unmatched Host headers by
file-load order when nothing says otherwise, and `bridge.conf` sorts before
`default.conf` alphabetically — so it silently became the default. From that
moment, **every request to the ERP (raw IP, `erp.ghazanfarbrothers.com`, or any
Host header that wasn't exactly `adminapp.ghazanfarbrothers.com`) got proxied
into the Laravel app instead** and came back as a 404 or `{"error":"Unauthorized
Access to Bridge"}`. The ERP's own backend (port 3000, confirmed via
`curl localhost:3000/...` from inside the box) was healthy the whole time — this
was purely an nginx routing bug, not an app crash. It also silently killed a
customer-data import that was mid-run against the ERP's API at that exact
timestamp.

## The fix that's applied now

`default.conf`'s listen directive was changed to:

```nginx
listen 80 default_server;
```

`bridge.conf` is untouched. Now:
- Any Host header that isn't `adminapp.ghazanfarbrothers.com` → ERP (`default.conf`).
- `Host: adminapp.ghazanfarbrothers.com` → Laravel bridge (`bridge.conf`), exactly as before.

## Rules going forward

1. **`default.conf` must always keep `default_server`** on its `listen 80` line.
   This is now baked into source (`docker/frontend/nginx.conf` in this repo), so a
   normal rebuild/redeploy of `erp-frontend` keeps the fix. It was originally
   patched live with `docker exec ... sed ...` on the running container only —
   that live patch would have been silently lost on the next container
   recreation had it not been ported back into the repo's Dockerfile source.
2. **`bridge.conf` is NOT in this repo and NOT in the `erp-frontend` image.** It
   was added directly to the running container's writable layer (`docker cp` /
   `docker exec`, outside any build). If `erp-frontend` is ever recreated
   (`docker compose up -d --force-recreate`, a fresh `docker compose build`,
   restoring from an image backup, etc.), **`bridge.conf` will disappear** and
   `adminapp.ghazanfarbrothers.com` routing breaks again. There is a copy at
   `/opt/erp-ssl-proxy/` on the host you can `docker cp` back in if this happens
   — but the durable fix is to move `bridge.conf` into the adminapp's own deploy
   process (or this repo) so it's not solely living in a container's ephemeral
   layer.
3. **Never add a new server block without an explicit `server_name`.** Any new
   app sharing this box needs its own subdomain, matched by `server_name` in its
   own conf.d file — don't rely on it being "the only other one" or on file
   naming/load order.
4. To verify routing after any nginx change on this box:
   ```bash
   docker exec erp-frontend nginx -t                     # config is syntactically valid
   docker exec erp-frontend nginx -s reload
   curl http://<ip>/api/health                            # ERP -> {"status":"healthy",...}
   curl -H "Host: adminapp.ghazanfarbrothers.com" http://<ip>/   # Laravel bridge -> 200
   ```
5. DNS for `adminapp.ghazanfarbrothers.com` is confirmed live (`187.127.123.26`).
   DNS for `erp.ghazanfarbrothers.com` was **missing entirely** until 2026-07-21
   (a stale `ALIAS erp -> erp.ghazanfarbrothers.com.cdn.hstgr.net` record — a
   leftover from Hostinger's subdomain-creation wizard — silently blocked adding
   the real `A` record; it had to be deleted first). Both now correctly resolve
   to `187.127.123.26`.

## HTTPS (added 2026-07-21)

`erp.ghazanfarbrothers.com` has a real Let's Encrypt certificate, but **not on
the standard port 443** — that port is already bound by `sshd` on this box
(SSH-over-443, presumably to get through a restrictive network elsewhere), and
neither the OS firewall (`ufw`) nor Hostinger's separate VPS-level firewall
allowed anything else there. Rather than touch SSH, HTTPS is served on **port
`8443`**: `https://erp.ghazanfarbrothers.com:8443`.

**How it's wired:**
- A standalone `nginx:1.25-alpine` container, `erp-ssl-proxy`, listens on host
  `8443` (mapped to its own container port `443`), attached to the
  `ghazanfar-erp_erp-network` docker network so it can reach the frontend
  directly as `http://frontend:80` — `erp-frontend` itself was **not** modified
  or recreated for this (avoids any risk to the existing container).
- Config: `/opt/erp-ssl-proxy/nginx.conf` on the host (mounted read-only into
  the container), TLS terminates there, then proxies to `frontend:80`.
- Certificate: obtained via `certbot certonly --manual` using two hook scripts
  at `/opt/certbot-hooks/{auth,cleanup}.sh` that place/remove the ACME HTTP-01
  challenge file inside the *running* `erp-frontend` container via `docker exec`
  (its SPA `location /` already serves real files under `.well-known/` via
  `try_files`, so no nginx config change was needed there either).
- Renewal: `certbot renew` (systemd timer, installed automatically) reuses the
  same hooks — confirmed via `certbot renew --dry-run`. A `renew_hook = docker
  restart erp-ssl-proxy` was added to
  `/etc/letsencrypt/renewal/erp.ghazanfarbrothers.com.conf` so the proxy
  actually picks up the renewed cert (nginx only reads cert files at
  startup/reload, not per-request).
- Firewall: had to open `8443/tcp` in **two** independent places — `ufw` on the
  box itself, *and* Hostinger's separate VPS firewall panel (hPanel → VPS →
  Security → Firewall), which by default only allowed 22/80/443. Both are
  needed; opening only one still blocks external traffic.

**If you later free up port 443** (e.g. move SSH to an alternate port): change
`erp-ssl-proxy`'s port mapping from `8443:443` to `443:443`, drop the `8443`
rule from both firewalls, and users get the plain `https://erp.ghazanfarbrothers.com`
URL with no port suffix.
