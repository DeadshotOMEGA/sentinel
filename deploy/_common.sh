#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${DEPLOY_DIR}/.env"
STATE_FILE="${DEPLOY_DIR}/.appliance-state"
BASE_COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.yml"
GRAFANA_OVERRIDE_FILE="${DEPLOY_DIR}/docker-compose.grafana-lan.yml"
WIKI_OVERRIDE_FILE="${DEPLOY_DIR}/docker-compose.wiki-lan.yml"
NETWORK_STATUS_SCRIPT="${DEPLOY_DIR}/write-network-status.sh"

DOCKER_CMD=(docker)
COMPOSE_FILE_ARGS=()
WITH_OBS="false"
ALLOW_GRAFANA_LAN="false"
ALLOW_WIKI_LAN="false"
UPDATE_HAS_PRE_UPDATE_BACKUP="${UPDATE_HAS_PRE_UPDATE_BACKUP:-false}"

log() {
  printf '[sentinel] %s\n' "$*"
}

warn() {
  printf '[sentinel][warn] %s\n' "$*" >&2
}

die() {
  printf '[sentinel][error] %s\n' "$*" >&2
  exit 1
}

shell_join() {
  local joined="" part quoted
  for part in "$@"; do
    printf -v quoted '%q' "${part}"
    if [[ -n "${joined}" ]]; then
      joined+=" "
    fi
    joined+="${quoted}"
  done
  printf '%s\n' "${joined}"
}

run_root() {
  if [[ "${EUID}" -eq 0 ]]; then
    "$@"
  else
    command -v sudo >/dev/null 2>&1 || die "sudo is required for this operation"
    sudo "$@"
  fi
}

set_docker_cmd() {
  if docker info >/dev/null 2>&1; then
    DOCKER_CMD=(docker)
    return
  fi

  if command -v sudo >/dev/null 2>&1 && sudo docker info >/dev/null 2>&1; then
    DOCKER_CMD=(sudo docker)
    return
  fi

  die "Docker daemon is not reachable. Start Docker or run with privileges."
}

docker_cmd() {
  "${DOCKER_CMD[@]}" "$@"
}

ensure_docker_and_compose_v2() {
  if ! command -v docker >/dev/null 2>&1; then
    log "Docker not found. Installing Docker Engine + Compose v2..."
    install_docker_engine
  fi

  set_docker_cmd

  if ! docker_cmd compose version >/dev/null 2>&1; then
    log "Docker Compose v2 plugin missing. Installing Docker Engine + Compose v2..."
    install_docker_engine
    set_docker_cmd
  fi

  local version
  version="$(docker_cmd compose version --short 2>/dev/null || true)"
  [[ -n "${version}" ]] || die "Docker Compose v2 is required (docker compose)."
  log "Using docker command: ${DOCKER_CMD[*]}"
  log "Detected Docker Compose v2: ${version}"
}

install_docker_engine() {
  run_root apt-get update -y
  run_root apt-get install -y ca-certificates curl gnupg lsb-release
  run_root install -m 0755 -d /etc/apt/keyrings

  if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | run_root gpg --dearmor -o /etc/apt/keyrings/docker.asc
    run_root chmod a+r /etc/apt/keyrings/docker.asc
  fi

  local arch codename
  arch="$(dpkg --print-architecture)"
  codename="$(. /etc/os-release && echo "$VERSION_CODENAME")"

  cat <<REPO | run_root tee /etc/apt/sources.list.d/docker.list >/dev/null
deb [arch=${arch} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${codename} stable
REPO

  run_root apt-get update -y
  run_root apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  run_root systemctl enable --now docker

  if [[ -n "${SUDO_USER:-}" ]]; then
    run_root usermod -aG docker "${SUDO_USER}"
    warn "Added ${SUDO_USER} to docker group. Re-login may be required."
  fi
}

check_ghcr_reachability() {
  local code
  code="$(curl -sSIL --max-time 10 -o /dev/null -w '%{http_code}' https://ghcr.io/v2/ || true)"
  case "${code}" in
    200|401|403|405)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

print_network_recovery_help() {
  cat <<'HELP'
GHCR is unreachable from this network.

1. Make sure this laptop is connected to the internet-facing network.
2. If you use the Sentinel hotspot, reconnect to the approved hotspot SSID and retry.
3. If you use building/public Wi-Fi, complete any required captive portal in a browser.
4. Re-run this command.

If the laptop is still offline, disconnect/reconnect Wi-Fi and retry.
HELP
}

require_explicit_version() {
  local version="${1:-}"
  local shown=""
  version="$(printf '%s' "${version}" | tr -d '\r' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  version="${version%\"}"
  version="${version#\"}"
  version="${version%\'}"
  version="${version#\'}"
  printf -v shown '%q' "${version}"
  [[ -n "${version}" ]] || die "SENTINEL_VERSION is required (example: v1.0.0)."
  [[ "${version}" != "latest" ]] || die "SENTINEL_VERSION must be explicit and cannot be 'latest'."
  [[ "${version}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+([.-][A-Za-z0-9.-]+)?$ ]] || die "SENTINEL_VERSION must look like vX.Y.Z (got: ${shown})"
}

ensure_env_file() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    [[ -f "${DEPLOY_DIR}/.env.example" ]] || die "Missing .env.example"

    if [[ -w "${DEPLOY_DIR}" ]]; then
      cp "${DEPLOY_DIR}/.env.example" "${ENV_FILE}"
      chmod 600 "${ENV_FILE}"
    else
      run_root install -m 600 "${DEPLOY_DIR}/.env.example" "${ENV_FILE}"
    fi
  fi

  if [[ "${EUID}" -ne 0 ]]; then
    if [[ ! -w "${ENV_FILE}" ]]; then
      run_root chown "${USER}:$(id -gn "${USER}")" "${ENV_FILE}"
      chmod 600 "${ENV_FILE}"
    fi
  elif [[ -n "${SUDO_USER:-}" ]]; then
    if [[ ! -w "${ENV_FILE}" ]]; then
      run_root chown "${SUDO_USER}:$(id -gn "${SUDO_USER}")" "${ENV_FILE}"
      chmod 600 "${ENV_FILE}"
    fi
  fi
}

is_placeholder_env_value() {
  local value="${1:-}"
  local value_lower
  value="$(printf '%s' "${value}" | tr -d '\r' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  value_lower="$(printf '%s' "${value}" | tr '[:upper:]' '[:lower:]')"

  case "${value_lower}" in
    ""|changeme|change-this-*|replace-me|replace-this-*|replace_*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

generate_random_secret() {
  local length="${1:-48}"
  local value

  if command -v openssl >/dev/null 2>&1; then
    value="$(openssl rand -base64 96 | tr -dc 'A-Za-z0-9' | head -c "${length}")"
  else
    value="$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c "${length}")"
  fi

  if [[ -z "${value}" ]]; then
    die "Failed to generate random secret value"
  fi
  printf '%s\n' "${value}"
}

bootstrap_env_defaults() {
  local keys key value generated_value generated_count
  generated_count=0
  keys=(
    POSTGRES_PASSWORD
    WIKI_POSTGRES_PASSWORD
    JWT_SECRET
    API_KEY_SECRET
    SESSION_SECRET
    SOCKET_IO_SECRET
    GRAFANA_ADMIN_PASSWORD
    SWAGGER_PASSWORD
  )

  for key in "${keys[@]}"; do
    value="$(env_value "${key}")"
    if is_placeholder_env_value "${value}"; then
      generated_value="$(generate_random_secret 40)"
      upsert_env "${key}" "${generated_value}"
      generated_count=$((generated_count + 1))
    fi
  done

  if is_placeholder_env_value "$(env_value GHCR_OWNER)"; then
    upsert_env "GHCR_OWNER" "deadshotomega"
  fi

  if is_placeholder_env_value "$(env_value MDNS_HOSTNAME)"; then
    upsert_env "MDNS_HOSTNAME" "sentinel"
  fi

  if is_placeholder_env_value "$(env_value APP_PUBLIC_URL)"; then
    upsert_env "APP_PUBLIC_URL" "http://$(env_value MDNS_HOSTNAME sentinel).local"
  fi

  if is_placeholder_env_value "$(env_value APP_HTTPS_PORT)"; then
    upsert_env "APP_HTTPS_PORT" "443"
  fi

  if is_placeholder_env_value "$(env_value WIKI_DOMAIN)"; then
    upsert_env "WIKI_DOMAIN" "docs.sentinel.local"
  fi

  if is_placeholder_env_value "$(env_value WIKI_BASE_URL)"; then
    upsert_env "WIKI_BASE_URL" "http://$(env_value WIKI_DOMAIN docs.sentinel.local)"
  fi

  if is_placeholder_env_value "$(env_value NEXT_PUBLIC_WIKI_BASE_URL)"; then
    upsert_env "NEXT_PUBLIC_WIKI_BASE_URL" "$(env_value WIKI_BASE_URL)"
  fi

  if is_placeholder_env_value "$(env_value NEXT_PUBLIC_HELP_FALLBACK_MODE)"; then
    upsert_env "NEXT_PUBLIC_HELP_FALLBACK_MODE" "hybrid"
  fi

  if is_placeholder_env_value "$(env_value NEXT_PUBLIC_HELP_PREVIEW_ENABLED)"; then
    upsert_env "NEXT_PUBLIC_HELP_PREVIEW_ENABLED" "false"
  fi

  if is_placeholder_env_value "$(env_value WIKI_IMAGE_TAG)"; then
    upsert_env "WIKI_IMAGE_TAG" "2.5.312"
  fi

  if is_placeholder_env_value "$(env_value KROKI_IMAGE_TAG)"; then
    upsert_env "KROKI_IMAGE_TAG" "0.30.0"
  fi

  if is_placeholder_env_value "$(env_value KROKI_SERVER_URL)"; then
    upsert_env "KROKI_SERVER_URL" "http://kroki:8000"
  fi

  if is_placeholder_env_value "$(env_value WIKI_LAN_PORT)"; then
    upsert_env "WIKI_LAN_PORT" "3020"
  fi

  if is_placeholder_env_value "$(env_value HOTSPOT_CONNECTION_NAME)"; then
    upsert_env "HOTSPOT_CONNECTION_NAME" "Sentinel Hotspot"
  fi

  if is_placeholder_env_value "$(env_value NETWORK_REACHABILITY_CHECK_URL)"; then
    upsert_env "NETWORK_REACHABILITY_CHECK_URL" "https://connectivitycheck.gstatic.com/generate_204"
  fi

  if is_placeholder_env_value "$(env_value NETWORK_REMOTE_REACHABILITY_TARGET)"; then
    upsert_env "NETWORK_REMOTE_REACHABILITY_TARGET" ""
  fi

  if is_placeholder_env_value "$(env_value NETWORK_STATUS_SNAPSHOT_INTERVAL_SECONDS)"; then
    upsert_env "NETWORK_STATUS_SNAPSHOT_INTERVAL_SECONDS" "30"
  fi

  if [[ "${generated_count}" -gt 0 ]]; then
    log "Auto-generated ${generated_count} secure .env values for first-time setup."
    log "Generated values were written to ${ENV_FILE}."
  fi
}

write_admin_credentials_snapshot() {
  local credentials_dir="/opt/sentinel/credentials"
  local credentials_file="${credentials_dir}/service-secrets.env"
  local tmp_file
  tmp_file="$(mktemp)"

  cat >"${tmp_file}" <<SNAPSHOT
# Sentinel service credentials snapshot
# Generated (UTC): $(date -u +'%Y-%m-%dT%H:%M:%SZ')
# Access: root-only (chmod 600)

POSTGRES_USER=$(env_value POSTGRES_USER sentinel)
POSTGRES_PASSWORD=$(env_value POSTGRES_PASSWORD)
WIKI_POSTGRES_USER=$(env_value WIKI_POSTGRES_USER wikijs)
WIKI_POSTGRES_PASSWORD=$(env_value WIKI_POSTGRES_PASSWORD)
JWT_SECRET=$(env_value JWT_SECRET)
API_KEY_SECRET=$(env_value API_KEY_SECRET)
SESSION_SECRET=$(env_value SESSION_SECRET)
SOCKET_IO_SECRET=$(env_value SOCKET_IO_SECRET)
SWAGGER_USERNAME=$(env_value SWAGGER_USERNAME admin)
SWAGGER_PASSWORD=$(env_value SWAGGER_PASSWORD)
GRAFANA_ADMIN_USER=$(env_value GRAFANA_ADMIN_USER admin)
GRAFANA_ADMIN_PASSWORD=$(env_value GRAFANA_ADMIN_PASSWORD)
SNAPSHOT

  run_root install -d -m 700 "${credentials_dir}"
  run_root install -m 600 "${tmp_file}" "${credentials_file}"
  rm -f "${tmp_file}"

  log "Service credential snapshot saved to ${credentials_file} (root-only)."
}

upsert_env() {
  local key="${1}" value="${2}" file="${3:-$ENV_FILE}"
  if grep -qE "^${key}=" "${file}"; then
    if [[ -w "${file}" && -w "$(dirname "${file}")" ]]; then
      sed -i "s#^${key}=.*#${key}=${value}#" "${file}"
    else
      run_root sed -i "s#^${key}=.*#${key}=${value}#" "${file}"
    fi
  else
    if [[ -w "${file}" ]]; then
      printf '%s=%s\n' "${key}" "${value}" >>"${file}"
    else
      printf '%s=%s\n' "${key}" "${value}" | run_root tee -a "${file}" >/dev/null
    fi
  fi
}

load_state() {
  if [[ -f "${STATE_FILE}" ]]; then
    # shellcheck disable=SC1090
    source "${STATE_FILE}"
  fi

  WITH_OBS="${WITH_OBS:-false}"
  ALLOW_GRAFANA_LAN="${ALLOW_GRAFANA_LAN:-false}"
  ALLOW_WIKI_LAN="${ALLOW_WIKI_LAN:-false}"
}

save_state() {
  cat >"${STATE_FILE}" <<STATE
WITH_OBS=${WITH_OBS}
ALLOW_GRAFANA_LAN=${ALLOW_GRAFANA_LAN}
ALLOW_WIKI_LAN=${ALLOW_WIKI_LAN}
LAN_CIDR=${LAN_CIDR:-}
CURRENT_VERSION=${CURRENT_VERSION:-}
PREVIOUS_VERSION=${PREVIOUS_VERSION:-}
STATE
}

set_compose_file_args() {
  COMPOSE_FILE_ARGS=(-f "${BASE_COMPOSE_FILE}")
  if [[ "${ALLOW_GRAFANA_LAN}" == "true" ]]; then
    COMPOSE_FILE_ARGS+=(-f "${GRAFANA_OVERRIDE_FILE}")
  fi
  if [[ "${ALLOW_WIKI_LAN}" == "true" ]]; then
    COMPOSE_FILE_ARGS+=(-f "${WIKI_OVERRIDE_FILE}")
  fi
}

compose() {
  local profile_args=()
  if [[ "${WITH_OBS}" == "true" ]]; then
    profile_args+=(--profile obs)
  fi
  if docker_cmd compose --env-file "${ENV_FILE}" "${COMPOSE_FILE_ARGS[@]}" "${profile_args[@]}" "$@"; then
    return 0
  fi

  if [[ "${DOCKER_CMD[*]}" != "sudo docker" ]] \
    && command -v sudo >/dev/null 2>&1 \
    && sudo docker info >/dev/null 2>&1; then
    warn "docker compose failed with '${DOCKER_CMD[*]}'; retrying with sudo docker."
    DOCKER_CMD=(sudo docker)
    docker_cmd compose --env-file "${ENV_FILE}" "${COMPOSE_FILE_ARGS[@]}" "${profile_args[@]}" "$@"
    return $?
  fi

  return 1
}

compose_command_prefix() {
  local args=("${DOCKER_CMD[@]}" compose --env-file "${ENV_FILE}" "${COMPOSE_FILE_ARGS[@]}")
  if [[ "${WITH_OBS}" == "true" ]]; then
    args+=(--profile obs)
  fi
  shell_join "${args[@]}"
}

database_non_prisma_table_count() {
  local postgres_user postgres_db raw_count
  postgres_user="$(env_value POSTGRES_USER sentinel)"
  postgres_db="$(env_value POSTGRES_DB sentinel)"

  raw_count="$(
    compose exec -T postgres psql -U "${postgres_user}" -d "${postgres_db}" -tAc \
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> '_prisma_migrations';" \
      2>/dev/null || true
  )"

  raw_count="$(printf '%s' "${raw_count}" | tr -d '[:space:]')"
  if [[ "${raw_count}" =~ ^[0-9]+$ ]]; then
    printf '%s\n' "${raw_count}"
  else
    printf '0\n'
  fi
}

db_table_exists() {
  local table_name="${1}"
  local postgres_user postgres_db exists
  postgres_user="$(env_value POSTGRES_USER sentinel)"
  postgres_db="$(env_value POSTGRES_DB sentinel)"

  exists="$(
    compose exec -T postgres psql -U "${postgres_user}" -d "${postgres_db}" -tAc \
      "SELECT to_regclass('public.${table_name}') IS NOT NULL;" \
      2>/dev/null || true
  )"
  exists="$(printf '%s' "${exists}" | tr -d '[:space:]')"
  [[ "${exists}" == "t" ]]
}

failed_prisma_migrations() {
  local postgres_user postgres_db has_table migrations
  postgres_user="$(env_value POSTGRES_USER sentinel)"
  postgres_db="$(env_value POSTGRES_DB sentinel)"

  has_table="$(
    compose exec -T postgres psql -U "${postgres_user}" -d "${postgres_db}" -tAc \
      "SELECT to_regclass('public._prisma_migrations') IS NOT NULL;" \
      2>/dev/null || true
  )"
  has_table="$(printf '%s' "${has_table}" | tr -d '[:space:]')"
  [[ "${has_table}" == "t" ]] || return 0

  migrations="$(
    compose exec -T postgres psql -U "${postgres_user}" -d "${postgres_db}" -tAc \
      "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL;" \
      2>/dev/null || true
  )"

  printf '%s\n' "${migrations}" | sed '/^[[:space:]]*$/d'
}

resolve_failed_prisma_migrations() {
  local found_any="false"
  while IFS= read -r migration; do
    [[ -n "${migration}" ]] || continue
    found_any="true"
    warn "Found failed migration state for ${migration}; marking as rolled back."
    compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/database exec prisma migrate resolve --rolled-back ${migration}"
  done < <(failed_prisma_migrations)

  if [[ "${found_any}" == "true" ]]; then
    log "Failed migration states were resolved."
  fi
}

wait_for_service_health() {
  local service="${1}"
  local timeout="${2:-180}"
  local elapsed=0

  while (( elapsed < timeout )); do
    local container_id
    container_id="$(compose ps -q "${service}" 2>/dev/null | head -n1 || true)"

    if [[ -n "${container_id}" ]]; then
      local status
      status="$(docker_cmd inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "${container_id}" 2>/dev/null || true)"
      case "${status}" in
        healthy|running)
          return 0
          ;;
        unhealthy|exited|dead)
          warn "Service ${service} is ${status}"
          return 1
          ;;
      esac
    fi

    sleep 3
    elapsed=$((elapsed + 3))
  done

  warn "Timed out waiting for service ${service} to become healthy"
  return 1
}

prisma_schema_parity_clean() {
  compose exec -T backend sh -lc 'cd /app && pnpm --filter @sentinel/database exec prisma migrate diff --from-schema prisma/schema.prisma --to-config-datasource --exit-code'
}

prisma_db_to_schema_diff_human() {
  compose exec -T backend sh -lc 'cd /app && pnpm --filter @sentinel/database exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma'
}

prisma_db_to_schema_diff_script() {
  compose exec -T backend sh -lc 'cd /app && rm -f /tmp/sentinel-prisma-diff.sql && pnpm --filter @sentinel/database exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script --output /tmp/sentinel-prisma-diff.sql && cat /tmp/sentinel-prisma-diff.sql && rm -f /tmp/sentinel-prisma-diff.sql'
}

normalize_sql_script() {
  local script="${1:-}"
  printf '%s\n' "${script}" \
    | tr -d '\r' \
    | sed -E \
      -e '/^[[:space:]]*$/d' \
      -e '/^[[:space:]]*--/d' \
      -e '/^[[:space:]]*Loaded Prisma config from /d' \
      -e 's/^[[:space:]]+//; s/[[:space:]]+$//'
}

normalized_approved_prisma_drift_sql() {
  printf 'ALTER TABLE "remote_systems" ALTER COLUMN "updated_at" DROP DEFAULT;\n'
}

db_column_default_expr() {
  local table_name="${1}"
  local column_name="${2}"
  local postgres_user postgres_db default_expr
  postgres_user="$(env_value POSTGRES_USER sentinel)"
  postgres_db="$(env_value POSTGRES_DB sentinel)"

  default_expr="$(
    compose exec -T postgres psql -U "${postgres_user}" -d "${postgres_db}" -tAc \
      "SELECT column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table_name}' AND column_name = '${column_name}';" \
      2>/dev/null || true
  )"

  printf '%s\n' "$(printf '%s' "${default_expr}" | tr -d '\r' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
}

default_expr_is_now_like() {
  local raw="${1:-}"
  local normalized
  normalized="$(printf '%s' "${raw}" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
  [[ "${normalized}" =~ ^(current_timestamp(\([0-9]+\))?|now\(\)|transaction_timestamp\(\))$ ]]
}

print_prisma_drift_help() {
  local compose_prefix
  compose_prefix="$(compose_command_prefix)"

  warn "Common cause: an older appliance database drifted from the canonical Prisma baseline."
  warn "Only the exact DROP DEFAULT case for public.remote_systems.updated_at is auto-remediated."
  if [[ "${UPDATE_HAS_PRE_UPDATE_BACKUP}" == "true" ]]; then
    warn "A pre-update backup was already created earlier in this run."
  fi
  warn "No broad drift ignore was applied."
  warn "For more detail, rerun on the appliance from any directory:"
  warn "  ${compose_prefix} exec -T backend sh -lc 'cd /app && pnpm --filter @sentinel/database exec prisma migrate status'"
  warn "  ${compose_prefix} exec -T backend sh -lc 'cd /app && pnpm --filter @sentinel/database exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma'"
  warn "  ${compose_prefix} exec -T postgres psql -U $(env_value POSTGRES_USER sentinel) -d $(env_value POSTGRES_DB sentinel) -c \"SELECT column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'remote_systems' AND column_name = 'updated_at';\""
}

apply_approved_remote_systems_updated_at_default_remediation() {
  local postgres_user postgres_db live_default
  postgres_user="$(env_value POSTGRES_USER sentinel)"
  postgres_db="$(env_value POSTGRES_DB sentinel)"
  live_default="$(db_column_default_expr remote_systems updated_at)"

  if [[ -z "${live_default}" ]]; then
    warn "Approved drift candidate did not have a live default on public.remote_systems.updated_at."
    return 1
  fi

  if ! default_expr_is_now_like "${live_default}"; then
    warn "Approved drift candidate had an unexpected live default on public.remote_systems.updated_at: ${live_default}"
    return 1
  fi

  log "Approved compatibility drift detected on public.remote_systems.updated_at; canonical schema expects no default."
  log "Live default expression on public.remote_systems.updated_at: ${live_default}"
  log 'Applying one-time schema correction: ALTER TABLE "remote_systems" ALTER COLUMN "updated_at" DROP DEFAULT;'

  compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "${postgres_user}" -d "${postgres_db}" \
    -c 'ALTER TABLE "remote_systems" ALTER COLUMN "updated_at" DROP DEFAULT;'

  log "Rechecking canonical Prisma schema parity after approved remediation"
  if ! prisma_schema_parity_clean; then
    warn "Approved compatibility drift remediation did not produce a clean canonical Prisma schema diff."
    return 1
  fi

  log "Approved compatibility drift remediation completed successfully."
  return 0
}

verify_prisma_schema_parity() {
  local diff_script normalized_diff approved_diff
  approved_diff="$(normalized_approved_prisma_drift_sql)"

  log "Verifying database schema matches the canonical Prisma schema"

  if prisma_schema_parity_clean; then
    return 0
  fi

  warn "Canonical Prisma schema parity check failed. Capturing executable database-to-schema drift SQL."
  if ! diff_script="$(prisma_db_to_schema_diff_script)"; then
    warn "Failed to capture executable Prisma drift SQL."
    warn "Capturing human-readable drift summary (database -> schema)."
    prisma_db_to_schema_diff_human || true
    print_prisma_drift_help
    die "Database schema drift detected; canonical Prisma schema parity is not clean."
  fi

  normalized_diff="$(normalize_sql_script "${diff_script}" | paste -sd' ' -)"
  if [[ "${normalized_diff}" == "${approved_diff}" ]]; then
    if apply_approved_remote_systems_updated_at_default_remediation; then
      return 0
    fi

    warn "Approved compatibility drift remediation failed or left additional drift behind."
  else
    warn "Detected non-allowlisted Prisma drift SQL:"
    warn "  ${normalized_diff:-<empty>}"
  fi

  warn "Capturing human-readable drift summary (database -> schema)."
  prisma_db_to_schema_diff_human || true
  print_prisma_drift_help
  die "Database schema drift detected; canonical Prisma schema parity is not clean."
}

run_safe_migrations() {
  local table_count
  local bootstrap_schema="false"
  local bootstrap_reason=""
  log "Running one-shot safe migration deploy"
  wait_for_service_health postgres 120 || die "Postgres is not healthy; cannot run migrations"
  wait_for_service_health backend 120 || die "Backend is not healthy; cannot run migrations"

  table_count="$(database_non_prisma_table_count)"
  if [[ "${table_count}" == "0" ]]; then
    bootstrap_schema="true"
    bootstrap_reason="empty database schema"
  fi

  if ! db_table_exists members || ! db_table_exists badges; then
    bootstrap_schema="true"
    if [[ -n "${bootstrap_reason}" ]]; then
      bootstrap_reason+=", missing core tables (members/badges)"
    else
      bootstrap_reason="missing core tables (members/badges)"
    fi
  fi

  resolve_failed_prisma_migrations

  if [[ "${bootstrap_schema}" == "true" ]]; then
    log "Detected ${bootstrap_reason}; bootstrapping schema and baselining migrations."
    compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/database exec prisma db push"
    compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/database prisma:baseline"
  else
    compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/database prisma:migrate:deploy:safe"
  fi

  log "Verifying migration status"
  compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/database exec prisma migrate status"

  verify_prisma_schema_parity

  run_bootstrap_sentinel_account
}

run_bootstrap_schema_and_baseline() {
  log "Bootstrapping schema (create all tables) and baselining migrations"
  wait_for_service_health postgres 120 || die "Postgres is not healthy; cannot bootstrap schema"
  wait_for_service_health backend 120 || die "Backend is not healthy; cannot bootstrap schema"

  resolve_failed_prisma_migrations
  compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/database exec prisma db push"
  compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/database prisma:baseline"

  log "Verifying migration status"
  compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/database exec prisma migrate status"

  verify_prisma_schema_parity

  run_bootstrap_sentinel_account
}

run_bootstrap_sentinel_account() {
  log "Ensuring protected Sentinel bootstrap badge/PIN account exists"
  wait_for_service_health backend 120 || die "Backend is not healthy; cannot bootstrap Sentinel account"
  compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/backend sentinel:bootstrap-account"
  log "Ensuring default enum values are present (insert-missing only)"
  compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/backend sentinel:seed-default-enums"
}

wait_for_healthz() {
  local timeout="${1:-180}"
  local elapsed=0
  until curl -fsS --max-time 5 http://127.0.0.1/healthz >/dev/null 2>&1; do
    sleep 3
    elapsed=$((elapsed + 3))
    if (( elapsed >= timeout )); then
      warn "Health check timed out after ${timeout}s"
      return 1
    fi
  done
  return 0
}

detect_lan_cidr() {
  local iface cidr
  iface="$(ip -4 route show default | awk '/default/ {print $5; exit}')"
  [[ -n "${iface}" ]] || return 1
  cidr="$(ip -o -4 addr show dev "${iface}" scope global | awk '{print $4; exit}')"
  [[ -n "${cidr}" ]] || return 1
  printf '%s\n' "${cidr}"
}

detect_server_ip() {
  ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i=="src") {print $(i+1); exit}}'
}

normalize_mdns_hostname() {
  local raw="${1:-}"
  raw="$(printf '%s' "${raw}" | tr -d '\r' | tr '[:upper:]' '[:lower:]' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  raw="${raw%.local}"
  [[ -n "${raw}" ]] || die "MDNS_HOSTNAME must not be empty"
  [[ "${raw}" =~ ^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$ ]] \
    || die "MDNS_HOSTNAME must be a valid single-label hostname (letters, numbers, hyphens)"
  printf '%s\n' "${raw}"
}

ensure_mdns_hostname() {
  local mdns_hostname current_hostname
  mdns_hostname="$(normalize_mdns_hostname "$(env_value MDNS_HOSTNAME sentinel)")"
  upsert_env "MDNS_HOSTNAME" "${mdns_hostname}"

  if ! command -v avahi-daemon >/dev/null 2>&1 || ! dpkg -s libnss-mdns >/dev/null 2>&1; then
    log "Installing mDNS support packages (avahi-daemon, libnss-mdns)"
    if ! run_root apt-get update -y >/dev/null 2>&1; then
      warn "Failed to run apt-get update while preparing mDNS packages."
    fi
    if ! run_root apt-get install -y avahi-daemon libnss-mdns >/dev/null 2>&1; then
      warn "Failed to install avahi-daemon/libnss-mdns; mDNS hostname may not resolve."
    fi
  fi

  current_hostname="$(hostnamectl --static 2>/dev/null || hostname 2>/dev/null || true)"
  current_hostname="$(printf '%s' "${current_hostname%%.*}" | tr '[:upper:]' '[:lower:]')"

  if [[ "${current_hostname}" != "${mdns_hostname}" ]]; then
    log "Setting appliance hostname to '${mdns_hostname}' for mDNS (${mdns_hostname}.local)"
    if command -v hostnamectl >/dev/null 2>&1; then
      if ! run_root hostnamectl set-hostname "${mdns_hostname}"; then
        run_root hostname "${mdns_hostname}" || true
      fi
    else
      run_root hostname "${mdns_hostname}" || true
      run_root sh -c "printf '%s\n' '${mdns_hostname}' >/etc/hostname" || true
    fi
  fi

  if command -v systemctl >/dev/null 2>&1; then
    if ! run_root systemctl enable --now avahi-daemon >/dev/null 2>&1; then
      warn "Unable to enable/start avahi-daemon; mDNS may not be available."
    fi
    run_root systemctl restart avahi-daemon >/dev/null 2>&1 || true
  fi

}

ensure_local_wiki_host_alias() {
  local wiki_domain tmp_file
  wiki_domain="$(env_value WIKI_DOMAIN docs.sentinel.local)"
  wiki_domain="$(printf '%s' "${wiki_domain}" | tr -d '\r' | tr '[:upper:]' '[:lower:]' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  [[ -n "${wiki_domain}" ]] || die "WIKI_DOMAIN must not be empty"

  tmp_file="$(mktemp)"
  awk -v domain="${wiki_domain}" '
    BEGIN {
      marker = "# sentinel-wiki-host-alias"
    }
    {
      skip = index($0, marker) > 0
      if (!skip) {
        for (i = 1; i <= NF; i++) {
          if ($i == domain) {
            skip = 1
            break
          }
        }
      }
      if (!skip) {
        print
      }
    }
  ' /etc/hosts >"${tmp_file}"
  printf '127.0.0.1\t%s %s\n' "${wiki_domain}" "# sentinel-wiki-host-alias" >>"${tmp_file}"
  run_root install -m 644 "${tmp_file}" /etc/hosts
  rm -f "${tmp_file}"

  log "Ensured local hosts alias for Wiki.js: http://${wiki_domain}"
}

detect_ssh_port() {
  local port
  port="$(sshd -T 2>/dev/null | awk '/^port / {print $2; exit}' || true)"
  if [[ -z "${port}" ]]; then
    port=22
  fi
  printf '%s\n' "${port}"
}

configure_firewall() {
  local cidr="${1}"
  [[ -n "${cidr}" ]] || die "LAN CIDR is required for firewall setup"

  if ! command -v ufw >/dev/null 2>&1; then
    run_root apt-get update -y
    run_root apt-get install -y ufw
  fi

  local ssh_port
  ssh_port="$(detect_ssh_port)"

  if [[ -n "${SSH_CONNECTION:-}" ]] || ss -tln | grep -qE '(:22\s|:2222\s)'; then
    log "SSH session/service detected; preserving SSH access on port ${ssh_port}."
    run_root ufw allow "${ssh_port}/tcp" >/dev/null || true
  fi

  run_root ufw default deny incoming
  run_root ufw default allow outgoing
  run_root ufw allow from "${cidr}" to any port 80 proto tcp >/dev/null || true
  run_root ufw allow from "${cidr}" to any port 443 proto tcp >/dev/null || true
  local grafana_lan_port
  grafana_lan_port="$(env_value GRAFANA_LAN_PORT 3010)"
  run_root ufw --force delete allow from "${cidr}" to any port "${grafana_lan_port}" proto tcp >/dev/null || true
  run_root ufw --force delete deny in to any port "${grafana_lan_port}" proto tcp >/dev/null || true
  if [[ "${ALLOW_GRAFANA_LAN}" == "true" ]]; then
    run_root ufw allow from "${cidr}" to any port "${grafana_lan_port}" proto tcp >/dev/null || true
    run_root ufw deny in to any port "${grafana_lan_port}" proto tcp >/dev/null || true
  fi
  local wiki_lan_port
  wiki_lan_port="$(env_value WIKI_LAN_PORT 3020)"
  run_root ufw --force delete allow from "${cidr}" to any port "${wiki_lan_port}" proto tcp >/dev/null || true
  run_root ufw --force delete deny in to any port "${wiki_lan_port}" proto tcp >/dev/null || true
  if [[ "${ALLOW_WIKI_LAN}" == "true" ]]; then
    run_root ufw allow from "${cidr}" to any port "${wiki_lan_port}" proto tcp >/dev/null || true
    run_root ufw deny in to any port "${wiki_lan_port}" proto tcp >/dev/null || true
  fi
  run_root ufw deny in to any port 80 proto tcp >/dev/null || true
  run_root ufw deny in to any port 443 proto tcp >/dev/null || true
  run_root ufw --force enable >/dev/null

  local firewall_extras=""
  if [[ "${ALLOW_GRAFANA_LAN}" == "true" ]]; then
    firewall_extras+=", optional Grafana LAN"
  fi
  if [[ "${ALLOW_WIKI_LAN}" == "true" ]]; then
    firewall_extras+=", optional Wiki LAN"
  fi

  log "UFW inbound policy applied: allow ${cidr} -> tcp/80,tcp/443${firewall_extras}"
}

ensure_compose_pull_with_login_fallback() {
  if compose pull; then
    return 0
  fi

  warn "Image pull failed. Attempting docker login to ghcr.io..."
  docker_cmd login ghcr.io || die "docker login to ghcr.io failed"
  compose pull
}

print_health_diagnostics() {
  compose ps || true
  compose logs --tail=80 caddy backend frontend postgres wikijs-postgres wikijs || true
}

env_value() {
  local key="${1}" default_value="${2:-}"
  local value
  value="$(grep -E "^${key}=" "${ENV_FILE}" 2>/dev/null | cut -d= -f2- || true)"
  if [[ -n "${value}" ]]; then
    printf '%s\n' "${value}"
    return 0
  fi
  printf '%s\n' "${default_value}"
}

normalize_boolean_env() {
  local value="${1:-}"
  value="$(printf '%s' "${value}" | tr '[:upper:]' '[:lower:]' | tr -d '\r' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  case "${value}" in
    1|true|yes|y|on)
      printf 'true\n'
      ;;
    *)
      printf 'false\n'
      ;;
  esac
}

resolve_desktop_user() {
  if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
    printf '%s\n' "${SUDO_USER}"
    return 0
  fi

  if [[ -n "${USER:-}" && "${USER}" != "root" ]]; then
    printf '%s\n' "${USER}"
    return 0
  fi

  return 1
}

desktop_user_home() {
  local user="${1:-}"
  local home_dir
  [[ -n "${user}" ]] || return 1
  home_dir="$(getent passwd "${user}" | cut -d: -f6 || true)"
  [[ -n "${home_dir}" ]] || return 1
  printf '%s\n' "${home_dir}"
}

run_as_desktop_user() {
  local user="${1:-}"
  shift || true
  [[ -n "${user}" ]] || return 1

  if [[ "${EUID}" -eq 0 ]]; then
    runuser -u "${user}" -- "$@"
    return $?
  fi

  "$@"
}

cleanup_hotspot_connectivity_helpers() {
  local desktop_user="${1:-}" home_dir="${2:-}"
  [[ -n "${desktop_user}" && -n "${home_dir}" ]] || return 0

  run_root rm -f "${home_dir}/.local/share/applications/sentinel-hotspot-connect.desktop"
  run_root rm -f "${home_dir}/.local/share/applications/sentinel-captive-portal-recover.desktop"
  run_root rm -f "${home_dir}/.config/autostart/sentinel-captive-portal-watch.desktop"
}

configure_hotspot_recovery_sudoers() {
  local desktop_user="${1:-}" sudoers_file systemctl_path tmp_file
  [[ -n "${desktop_user}" ]] || return 0

  systemctl_path="$(command -v systemctl || true)"
  if [[ -z "${systemctl_path}" ]]; then
    warn "systemctl is unavailable; skipping hotspot recovery sudoers helper."
    return 0
  fi

  sudoers_file="/etc/sudoers.d/sentinel-hotspot-recovery"
  tmp_file="$(mktemp)"
  cat >"${tmp_file}" <<SUDOERS
# Managed by Sentinel deploy helpers. Allows non-interactive hotspot recovery.
Cmnd_Alias SENTINEL_HOTSPOT_RECOVERY_CMDS = ${systemctl_path} start sentinel-host-hotspot-recovery.service, ${systemctl_path} restart sentinel-host-hotspot-recovery.service, ${DEPLOY_DIR}/process-host-hotspot-recovery-requests.sh, ${DEPLOY_DIR}/recover-host-hotspot.sh *
${desktop_user} ALL=(root) NOPASSWD: SENTINEL_HOTSPOT_RECOVERY_CMDS
SUDOERS

  run_root install -m 440 "${tmp_file}" "${sudoers_file}"
  rm -f "${tmp_file}"
}

configure_hotspot_connectivity_helpers() {
  local desktop_user home_dir applications_dir handler_file tmp_file desktop_group
  desktop_user="$(resolve_desktop_user || true)"

  if [[ -z "${desktop_user}" ]]; then
    warn "Unable to determine desktop user; skipping hotspot reconnect URI helper setup."
  else
    home_dir="$(desktop_user_home "${desktop_user}" || true)"
    if [[ -z "${home_dir}" ]]; then
      warn "Unable to resolve home directory for ${desktop_user}; skipping hotspot reconnect URI helper setup."
    else
      desktop_group="$(id -gn "${desktop_user}")"
      applications_dir="${home_dir}/.local/share/applications"
      handler_file="${applications_dir}/sentinel-hotspot-connect.desktop"

      if ! dpkg -s xdg-utils >/dev/null 2>&1; then
        log "Installing hotspot reconnect helper dependency (xdg-utils)"
        run_root apt-get update -y >/dev/null
        run_root apt-get install -y xdg-utils >/dev/null
      fi

      run_root install -d -m 755 -o "${desktop_user}" -g "${desktop_group}" "${applications_dir}"
      cleanup_hotspot_connectivity_helpers "${desktop_user}" "${home_dir}"

      tmp_file="$(mktemp)"
      cat >"${tmp_file}" <<DESKTOP
[Desktop Entry]
Type=Application
Version=1.0
Name=Sentinel Hotspot Connect
Comment=Reconnect this laptop to the approved Sentinel hotspot
Exec=${DEPLOY_DIR}/sentinel-hotspot-connect.sh --uri %u
Terminal=false
NoDisplay=true
MimeType=x-scheme-handler/sentinel-hotspot;
Categories=Network;
DESKTOP
      run_root install -m 644 "${tmp_file}" "${handler_file}"
      rm -f "${tmp_file}"

      run_root chown "${desktop_user}:${desktop_group}" "${handler_file}"

      if command -v update-desktop-database >/dev/null 2>&1; then
        run_as_desktop_user "${desktop_user}" update-desktop-database "${applications_dir}" >/dev/null 2>&1 || true
      fi

      if command -v xdg-mime >/dev/null 2>&1; then
        run_as_desktop_user "${desktop_user}" xdg-mime default sentinel-hotspot-connect.desktop x-scheme-handler/sentinel-hotspot >/dev/null 2>&1 || true
      fi

      log "Hotspot reconnect URI helper installed for ${desktop_user}."
    fi
  fi

  if ! command -v systemctl >/dev/null 2>&1; then
    warn "systemctl is unavailable; skipping host hotspot recovery path setup."
    return 0
  fi

  configure_hotspot_recovery_sudoers "${desktop_user}"

  run_root install -d -m 755 \
    "${DEPLOY_DIR}/runtime/hotspot-recovery" \
    "${DEPLOY_DIR}/runtime/hotspot-recovery/requests" \
    "${DEPLOY_DIR}/runtime/hotspot-recovery/processed" \
    "${DEPLOY_DIR}/runtime/hotspot-recovery/failed" \
    "${DEPLOY_DIR}/runtime/system-update" \
    "${DEPLOY_DIR}/runtime/system-update/requests" \
    "${DEPLOY_DIR}/runtime/system-update/processed" \
    "${DEPLOY_DIR}/runtime/system-update/failed"
  run_root chmod 755 \
    "${DEPLOY_DIR}/recover-host-hotspot.sh" \
    "${DEPLOY_DIR}/process-host-hotspot-recovery-requests.sh" \
    "${DEPLOY_DIR}/process-system-update-requests.sh" \
    "${DEPLOY_DIR}/sentinel-hotspot-connect.sh" >/dev/null 2>&1 || true

  run_root tee /etc/systemd/system/sentinel-host-hotspot-recovery.service >/dev/null <<UNIT
[Unit]
Description=Sentinel host hotspot recovery processor
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=${DEPLOY_DIR}
ExecStart=${DEPLOY_DIR}/process-host-hotspot-recovery-requests.sh
UNIT

  run_root tee /etc/systemd/system/sentinel-host-hotspot-recovery.path >/dev/null <<UNIT
[Unit]
Description=Sentinel host hotspot recovery queue watcher

[Path]
PathExistsGlob=${DEPLOY_DIR}/runtime/hotspot-recovery/requests/*.json
Unit=sentinel-host-hotspot-recovery.service

[Install]
WantedBy=multi-user.target
UNIT

  run_root systemctl daemon-reload
  run_root systemctl enable --now sentinel-host-hotspot-recovery.path
  run_root systemctl start sentinel-host-hotspot-recovery.service

  log "Host hotspot recovery watcher enabled."

  run_root tee /etc/systemd/system/sentinel-system-update-request.service >/dev/null <<UNIT
[Unit]
Description=Sentinel queued latest-system-update request processor
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=${DEPLOY_DIR}
ExecStart=${DEPLOY_DIR}/process-system-update-requests.sh
UNIT

  run_root tee /etc/systemd/system/sentinel-system-update-request.path >/dev/null <<UNIT
[Unit]
Description=Sentinel queued latest-system-update watcher

[Path]
PathExistsGlob=${DEPLOY_DIR}/runtime/system-update/requests/*.json
Unit=sentinel-system-update-request.service

[Install]
WantedBy=multi-user.target
UNIT

  run_root systemctl daemon-reload
  run_root systemctl enable --now sentinel-system-update-request.path
  run_root systemctl start sentinel-system-update-request.service

  log "System update request watcher enabled."
}

configure_network_status_telemetry() {
  local interval_seconds runtime_dir

  if ! command -v systemctl >/dev/null 2>&1; then
    warn "systemctl is unavailable; skipping host network telemetry timer setup."
    return 0
  fi

  interval_seconds="$(env_value NETWORK_STATUS_SNAPSHOT_INTERVAL_SECONDS 30)"
  if [[ ! "${interval_seconds}" =~ ^[0-9]+$ ]] || (( interval_seconds < 10 )); then
    interval_seconds="30"
  fi

  runtime_dir="${DEPLOY_DIR}/runtime/network-status"
  run_root install -d -m 755 "${runtime_dir}"
  run_root chmod 755 "${NETWORK_STATUS_SCRIPT}" >/dev/null 2>&1 || true

  run_root tee /etc/systemd/system/sentinel-network-status.service >/dev/null <<UNIT
[Unit]
Description=Sentinel host network telemetry snapshot
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=${DEPLOY_DIR}
ExecStart=${NETWORK_STATUS_SCRIPT}
UNIT

  run_root tee /etc/systemd/system/sentinel-network-status.timer >/dev/null <<UNIT
[Unit]
Description=Sentinel host network telemetry snapshot timer

[Timer]
OnBootSec=20s
OnUnitActiveSec=${interval_seconds}s
AccuracySec=5s
Unit=sentinel-network-status.service

[Install]
WantedBy=timers.target
UNIT

  run_root systemctl daemon-reload
  run_root systemctl enable --now sentinel-network-status.timer
  run_root systemctl start sentinel-network-status.service

  log "Host network telemetry timer enabled (${interval_seconds}s interval)."
}

write_systemd_unit() {
  local compose_args="-f ${BASE_COMPOSE_FILE}"
  local profile_args=""

  if [[ "${ALLOW_GRAFANA_LAN}" == "true" ]]; then
    compose_args+=" -f ${GRAFANA_OVERRIDE_FILE}"
  fi
  if [[ "${ALLOW_WIKI_LAN}" == "true" ]]; then
    compose_args+=" -f ${WIKI_OVERRIDE_FILE}"
  fi
  if [[ "${WITH_OBS}" == "true" ]]; then
    profile_args="--profile obs"
  fi

  run_root tee /etc/systemd/system/sentinel-appliance.service >/dev/null <<UNIT
[Unit]
Description=Sentinel Appliance Stack
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${DEPLOY_DIR}
ExecStart=/usr/bin/docker compose --env-file ${ENV_FILE} ${compose_args} ${profile_args} up -d
ExecStop=/usr/bin/docker compose --env-file ${ENV_FILE} ${compose_args} ${profile_args} down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
UNIT

  run_root systemctl daemon-reload
  run_root systemctl enable sentinel-appliance.service
  run_root systemctl start sentinel-appliance.service
}
