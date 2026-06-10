# Life Game Web Dashboard

Use `assets/life-game-web-template/` when the user wants a private web UI for their Life Game task list and progress.

## What the template provides

- Node.js HTTP server, no database required.
- Reads and writes an existing `life-game.md` file.
- Dashboard cards for level, XP, reward points, and next-level progress.
- Grouped task list with search/filter.
- Complete/reopen/edit/delete task actions; completing a task updates XP, points, task status, and history.
- Add-task form that inserts a task into the selected category.
- Category creation, including empty categories that remain selectable before tasks are added.
- Body metric recording for weight/body fat, with same-day updates avoiding duplicate daily XP rewards.
- Recent activity derived from the XP history log, so task completions do not depend on a manually maintained summary block.
- Escaped frontend rendering for task/category/history text.
- Authentication by username/password or bearer/token login.
- Backup before every write under `memory/.life-game-backups/` relative to the Life Game file workspace.

## Deployment workflow

1. Copy `assets/life-game-web-template/` into the target workspace or server.
2. Copy `.env.example` to `.env` and set strong private values:
   - `LIFE_GAME_FILE`: absolute path to the user's `life-game.md`.
   - `BODY_METRICS_FILE`: absolute path to the user's `body-metrics.md`.
   - `HEALTH_PROFILE_FILE` / `HEALTH_LOG_DIR`: optional health-coach integration paths.
   - `LIFE_GAME_USER` / `LIFE_GAME_PASSWORD`: optional username login.
   - `LIFE_GAME_TOKEN`: optional token login / bearer token.
   - `LIFE_GAME_SESSION_SECRET`: long random secret for signed sessions.
   - `BASE_PATH`: optional path prefix such as `/lifegame`; use empty for root.
3. Run with `node server.js`, or create a systemd service using the configured `.env`.
4. If exposing publicly, put it behind HTTPS reverse proxy and route only the chosen `BASE_PATH` to the local service.
5. Add `X-Robots-Tag: noindex, nofollow` at the reverse proxy for privacy.

## Privacy and safety rules

- Never commit a real `.env`, token, password, cookie, domain-specific credential, or private `life-game.md` data.
- Commit only `.env.example` with placeholder values.
- Prefer binding the Node service to `127.0.0.1` and exposing it through HTTPS reverse proxy.
- Keep backups local; do not copy user backup files into the skill repository.
- If adapting from a live deployment, grep for domains, IPs, tokens, usernames, chat IDs, and personal task data before committing.

## Minimal Nginx path example

```nginx
location = /lifegame { return 301 /lifegame/; }
location /lifegame/ {
    add_header X-Robots-Tag "noindex, nofollow" always;
    proxy_pass http://127.0.0.1:8090;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
