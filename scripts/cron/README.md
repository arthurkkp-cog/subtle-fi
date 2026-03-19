# Subtle-Fi Health Check Cron Job

Automated health monitoring for the Subtle-Fi banking platform. Checks the health of critical components and triggers a [Devin API](https://docs.devin.ai/api-reference/overview) session to perform recurring banking maintenance operations when issues are detected.

## What It Does

### Health Checks

| Check | What it probes | Pass criteria |
|-------|---------------|---------------|
| **App HTTP** | `GET /` on the running Next.js app | HTTP 2xx or 3xx |
| **Plaid API** | `POST /institutions/get` on the Plaid sandbox/production API | HTTP 200 |
| **Dwolla API** | OAuth `client_credentials` token exchange | HTTP 200 |
| **SQLite DB** | `PRAGMA integrity_check` on `data/subtle-fi.db` | Returns `ok` |

### Devin API Trigger

When any component is **unhealthy** (or `FORCE_DEVIN_TRIGGER=true`), the script creates a Devin session via the [v3 REST API](https://docs.devin.ai/api-reference/getting-started/teams-quickstart) that performs these common banking maintenance tasks:

1. **Transaction Reconciliation** - Cross-references recent transactions for consistency and flags mismatches.
2. **Expired Session Cleanup** - Purges expired user sessions from the SQLite database.
3. **Compliance Audit Snapshot** - Reports active users, linked bank accounts, and accounts missing KYC data.
4. **Integration Health Report** - Investigates unhealthy components and suggests remediation.

## Setup

### 1. Environment Variables

```bash
# Required
export SUBTLE_FI_BASE_URL="http://localhost:3000"   # or your deployed URL
export DEVIN_API_KEY="your-devin-api-key"            # from https://app.devin.ai/settings
export DEVIN_ORG_ID="your-org-id"                    # from Devin org settings

# Optional (enables deeper integration checks)
export PLAID_CLIENT_ID="your-plaid-client-id"
export PLAID_SECRET="your-plaid-secret"
export PLAID_ENV="sandbox"                           # or "production"
export DWOLLA_KEY="your-dwolla-key"
export DWOLLA_SECRET="your-dwolla-secret"
export DWOLLA_BASE_URL="https://api-sandbox.dwolla.com"
```

### 2. Make Executable

```bash
chmod +x scripts/cron/health-check.sh
```

### 3. Install Crontab

```bash
# Run every 6 hours
0 */6 * * * /path/to/subtle-fi/scripts/cron/health-check.sh >> /var/log/subtle-fi-health.log 2>&1

# Run daily at 2 AM UTC (recommended for banking compliance)
0 2 * * * FORCE_DEVIN_TRIGGER=true /path/to/subtle-fi/scripts/cron/health-check.sh >> /var/log/subtle-fi-health.log 2>&1
```

### 4. Recommended Cron Schedule

| Schedule | Expression | Use case |
|----------|-----------|----------|
| Every 6 hours | `0 */6 * * *` | Health monitoring; triggers Devin only if unhealthy |
| Daily at 2 AM | `0 2 * * *` | Forced maintenance run (set `FORCE_DEVIN_TRIGGER=true`) |
| Every 15 minutes | `*/15 * * * *` | High-frequency monitoring for production |

## Manual Run

```bash
# Health check only (triggers Devin only if something is unhealthy)
./scripts/cron/health-check.sh

# Force a Devin maintenance session even if everything is healthy
FORCE_DEVIN_TRIGGER=true ./scripts/cron/health-check.sh
```

## Sample Output

```
[subtle-fi-health] 2026-03-19 22:30:00 UTC Starting Subtle-Fi health check
[subtle-fi-health] 2026-03-19 22:30:00 UTC Checking app health at http://localhost:3000 ...
[subtle-fi-health] 2026-03-19 22:30:01 UTC OK    App responded with HTTP 200
[subtle-fi-health] 2026-03-19 22:30:01 UTC Checking Plaid API connectivity ...
[subtle-fi-health] 2026-03-19 22:30:02 UTC OK    Plaid API is reachable (HTTP 200)
[subtle-fi-health] 2026-03-19 22:30:02 UTC Checking Dwolla API connectivity ...
[subtle-fi-health] 2026-03-19 22:30:03 UTC OK    Dwolla API is reachable (token exchange HTTP 200)
[subtle-fi-health] 2026-03-19 22:30:03 UTC Running SQLite integrity check on data/subtle-fi.db ...
[subtle-fi-health] 2026-03-19 22:30:03 UTC OK    SQLite integrity check passed
[subtle-fi-health] 2026-03-19 22:30:03 UTC Expired sessions pending cleanup: 12
[subtle-fi-health] 2026-03-19 22:30:03 UTC ------------------------------------------
[subtle-fi-health] 2026-03-19 22:30:03 UTC Health Check Summary:
[subtle-fi-health] 2026-03-19 22:30:03 UTC   App:    healthy
[subtle-fi-health] 2026-03-19 22:30:03 UTC   Plaid:  healthy
[subtle-fi-health] 2026-03-19 22:30:03 UTC   Dwolla: healthy
[subtle-fi-health] 2026-03-19 22:30:03 UTC   DB:     healthy
[subtle-fi-health] 2026-03-19 22:30:03 UTC All checked components are healthy. No Devin session triggered.
```

## Dependencies

- `curl` - HTTP requests
- `jq` - JSON parsing (for Devin API responses)
- `sqlite3` - Database integrity checks (optional; skips DB check if absent)
