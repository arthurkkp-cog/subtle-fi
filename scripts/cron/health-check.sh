#!/usr/bin/env bash
# ------------------------------------------------------------------------------
# Subtle-Fi Health Check & Devin API Trigger
# ------------------------------------------------------------------------------
# This cron job performs two tasks:
#
#   1. HEALTH CHECK  - Probes the Subtle-Fi application and its critical banking
#      integrations (Plaid, Dwolla, SQLite DB) to determine overall health.
#
#   2. DEVIN API TRIGGER - When a component is unhealthy, OR on a fixed schedule,
#      it calls the Devin REST API to spin up a session that performs a common
#      banking maintenance operation (transaction reconciliation, expired-session
#      cleanup, compliance audit, etc.).
#
# Required environment variables (set these before running or in your crontab):
#   SUBTLE_FI_BASE_URL   - Base URL of the running app   (e.g. http://localhost:3000)
#   DEVIN_API_KEY         - Devin API bearer token
#   DEVIN_ORG_ID          - Devin organization ID
#   PLAID_CLIENT_ID       - Plaid API client ID  (optional; skips Plaid check if absent)
#   PLAID_SECRET           - Plaid API secret     (optional; skips Plaid check if absent)
#   DWOLLA_KEY             - Dwolla API key       (optional; skips Dwolla check if absent)
#   DWOLLA_SECRET          - Dwolla API secret    (optional; skips Dwolla check if absent)
#
# Usage:
#   chmod +x scripts/cron/health-check.sh
#   ./scripts/cron/health-check.sh
#
# Crontab example (every 6 hours):
#   0 */6 * * * /path/to/subtle-fi/scripts/cron/health-check.sh >> /var/log/subtle-fi-health.log 2>&1
# ------------------------------------------------------------------------------

set -euo pipefail

# --------------- configuration ------------------------------------------------
SUBTLE_FI_BASE_URL="${SUBTLE_FI_BASE_URL:-http://localhost:3000}"
DEVIN_API_URL="https://api.devin.ai/v3/organizations/${DEVIN_ORG_ID:-}/sessions"
LOG_PREFIX="[subtle-fi-health]"
REPO_URL="https://github.com/arthurkkp-cog/subtle-fi"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# --------------- helpers ------------------------------------------------------
log()  { echo "$LOG_PREFIX $(date -u +"%Y-%m-%d %H:%M:%S UTC") $*"; }
warn() { log "WARN  $*"; }
fail() { log "FAIL  $*"; }
ok()   { log "OK    $*"; }

STATUS_APP="unknown"
STATUS_PLAID="skipped"
STATUS_DWOLLA="skipped"
STATUS_DB="unknown"
UNHEALTHY_COMPONENTS=""

# --------------- 1. App HTTP health -------------------------------------------
check_app_health() {
  log "Checking app health at ${SUBTLE_FI_BASE_URL} ..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${SUBTLE_FI_BASE_URL}/" 2>/dev/null || echo "000")

  if [[ "$HTTP_CODE" =~ ^(200|301|302|307|308)$ ]]; then
    ok "App responded with HTTP ${HTTP_CODE}"
    STATUS_APP="healthy"
  else
    fail "App returned HTTP ${HTTP_CODE}"
    STATUS_APP="unhealthy"
    UNHEALTHY_COMPONENTS="${UNHEALTHY_COMPONENTS}app,"
  fi
}

# --------------- 2. Plaid API connectivity ------------------------------------
check_plaid_health() {
  if [[ -z "${PLAID_CLIENT_ID:-}" || -z "${PLAID_SECRET:-}" ]]; then
    warn "PLAID_CLIENT_ID or PLAID_SECRET not set - skipping Plaid check"
    return
  fi

  log "Checking Plaid API connectivity ..."
  PLAID_ENV="${PLAID_ENV:-sandbox}"
  PLAID_BASE="https://${PLAID_ENV}.plaid.com"

  PLAID_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    -X POST "${PLAID_BASE}/institutions/get" \
    -H "Content-Type: application/json" \
    -d "{
      \"client_id\": \"${PLAID_CLIENT_ID}\",
      \"secret\": \"${PLAID_SECRET}\",
      \"count\": 1,
      \"offset\": 0,
      \"country_codes\": [\"US\"]
    }" 2>/dev/null || echo "000")

  if [[ "$PLAID_RESPONSE" == "200" ]]; then
    ok "Plaid API is reachable (HTTP 200)"
    STATUS_PLAID="healthy"
  else
    fail "Plaid API returned HTTP ${PLAID_RESPONSE}"
    STATUS_PLAID="unhealthy"
    UNHEALTHY_COMPONENTS="${UNHEALTHY_COMPONENTS}plaid,"
  fi
}

# --------------- 3. Dwolla API connectivity -----------------------------------
check_dwolla_health() {
  if [[ -z "${DWOLLA_KEY:-}" || -z "${DWOLLA_SECRET:-}" ]]; then
    warn "DWOLLA_KEY or DWOLLA_SECRET not set - skipping Dwolla check"
    return
  fi

  log "Checking Dwolla API connectivity ..."
  DWOLLA_BASE="${DWOLLA_BASE_URL:-https://api-sandbox.dwolla.com}"

  # Attempt to obtain an access token (client_credentials grant)
  DWOLLA_TOKEN_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
    -X POST "${DWOLLA_BASE}/token" \
    -u "${DWOLLA_KEY}:${DWOLLA_SECRET}" \
    -d "grant_type=client_credentials" 2>/dev/null || echo -e "\n000")

  DWOLLA_HTTP=$(echo "$DWOLLA_TOKEN_RESPONSE" | tail -1)

  if [[ "$DWOLLA_HTTP" == "200" ]]; then
    ok "Dwolla API is reachable (token exchange HTTP 200)"
    STATUS_DWOLLA="healthy"
  else
    fail "Dwolla token exchange returned HTTP ${DWOLLA_HTTP}"
    STATUS_DWOLLA="unhealthy"
    UNHEALTHY_COMPONENTS="${UNHEALTHY_COMPONENTS}dwolla,"
  fi
}

# --------------- 4. SQLite database integrity ---------------------------------
check_db_health() {
  DB_PATH="${SUBTLE_FI_DB_PATH:-$(cd "$(dirname "$0")/../.." && pwd)/data/subtle-fi.db}"

  if [[ ! -f "$DB_PATH" ]]; then
    warn "Database file not found at ${DB_PATH} - skipping DB check"
    STATUS_DB="skipped"
    return
  fi

  log "Running SQLite integrity check on ${DB_PATH} ..."
  INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>/dev/null || echo "error")

  if [[ "$INTEGRITY" == "ok" ]]; then
    ok "SQLite integrity check passed"
    STATUS_DB="healthy"

    # Also report expired sessions count
    EXPIRED=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sessions WHERE expires_at < datetime('now');" 2>/dev/null || echo "?")
    log "Expired sessions pending cleanup: ${EXPIRED}"
  else
    fail "SQLite integrity check failed: ${INTEGRITY}"
    STATUS_DB="unhealthy"
    UNHEALTHY_COMPONENTS="${UNHEALTHY_COMPONENTS}database,"
  fi
}

# --------------- 5. Trigger Devin API session ---------------------------------
trigger_devin_session() {
  local REASON="$1"

  if [[ -z "${DEVIN_API_KEY:-}" ]]; then
    warn "DEVIN_API_KEY not set - cannot trigger Devin session"
    return 1
  fi
  if [[ -z "${DEVIN_ORG_ID:-}" ]]; then
    warn "DEVIN_ORG_ID not set - cannot trigger Devin session"
    return 1
  fi

  # Build a prompt tailored to the health status
  local PROMPT
  PROMPT=$(cat <<EOF
You are an automated banking operations assistant for the Subtle-Fi application (${REPO_URL}).

Health check performed at ${TIMESTAMP}:
  - App HTTP:  ${STATUS_APP}
  - Plaid API: ${STATUS_PLAID}
  - Dwolla API: ${STATUS_DWOLLA}
  - Database:  ${STATUS_DB}

Reason for this session: ${REASON}

Please perform the following recurring banking maintenance tasks in the subtle-fi repo:

1. **Transaction Reconciliation**: Review recent transactions in the database and
   cross-reference them for consistency. Flag any mismatched amounts or orphaned
   records. Summarize findings.

2. **Expired Session Cleanup**: Identify and purge expired user sessions from the
   SQLite database (sessions table where expires_at < now). Report how many were
   removed.

3. **Compliance Audit Snapshot**: Generate a brief compliance summary including:
   - Total number of active users
   - Number of linked bank accounts
   - Any accounts missing KYC data (ssn or date_of_birth fields are NULL)

4. **Integration Health Report**: If any component was marked unhealthy above,
   investigate the root cause and suggest remediation steps.

Output a structured JSON report with your findings.
EOF
)

  log "Triggering Devin session (reason: ${REASON}) ..."

  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 30 \
    -X POST "${DEVIN_API_URL}" \
    -H "Authorization: Bearer ${DEVIN_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$(jq -n \
      --arg prompt "$PROMPT" \
      '{prompt: $prompt}'
    )" 2>/dev/null || echo -e "\n000")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [[ "$HTTP_CODE" =~ ^(200|201|202)$ ]]; then
    SESSION_URL=$(echo "$BODY" | jq -r '.url // .session_url // "unknown"' 2>/dev/null || echo "unknown")
    SESSION_ID=$(echo "$BODY" | jq -r '.session_id // .id // "unknown"' 2>/dev/null || echo "unknown")
    ok "Devin session created successfully"
    log "  Session ID:  ${SESSION_ID}"
    log "  Session URL: ${SESSION_URL}"
  else
    fail "Devin API returned HTTP ${HTTP_CODE}"
    log "  Response body: ${BODY}"
    return 1
  fi
}

# --------------- main ---------------------------------------------------------
main() {
  log "=========================================="
  log "Starting Subtle-Fi health check"
  log "=========================================="

  # Run all health checks
  check_app_health
  check_plaid_health
  check_dwolla_health
  check_db_health

  # Summary
  log "------------------------------------------"
  log "Health Check Summary:"
  log "  App:    ${STATUS_APP}"
  log "  Plaid:  ${STATUS_PLAID}"
  log "  Dwolla: ${STATUS_DWOLLA}"
  log "  DB:     ${STATUS_DB}"
  log "------------------------------------------"

  # Decide whether to trigger Devin
  if [[ -n "$UNHEALTHY_COMPONENTS" ]]; then
    REASON="Unhealthy components detected: ${UNHEALTHY_COMPONENTS%,}"
    trigger_devin_session "$REASON" || warn "Failed to trigger Devin session"
  elif [[ "${FORCE_DEVIN_TRIGGER:-false}" == "true" ]]; then
    REASON="Scheduled maintenance run (all components healthy)"
    trigger_devin_session "$REASON" || warn "Failed to trigger Devin session"
  else
    log "All checked components are healthy. No Devin session triggered."
    log "Set FORCE_DEVIN_TRIGGER=true to trigger maintenance even when healthy."
  fi

  log "=========================================="
  log "Health check complete"
  log "=========================================="
}

main "$@"
