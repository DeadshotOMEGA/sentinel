#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${DEPLOY_DIR}/.env"
STATE_FILE="${DEPLOY_DIR}/.appliance-state"
BASE_COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.yml"
GRAFANA_OVERRIDE_FILE="${DEPLOY_DIR}/docker-compose.grafana-lan.yml"

DOCKER_CMD=(docker)
COMPOSE_FILE_ARGS=()
WITH_OBS="false"
ALLOW_GRAFANA_LAN="false"

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

print_captive_portal_help() {
  cat <<'HELP'
GHCR is unreachable from this network.

1. Open a browser on this laptop and visit any HTTP site (for example http://neverssl.com).
2. Complete the captive portal splash/checkbox flow.
3. Re-run this command.

If portal still does not appear, disconnect/reconnect Wi-Fi and retry.
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
    cp "${DEPLOY_DIR}/.env.example" "${ENV_FILE}"
    chmod 600 "${ENV_FILE}"
  fi
}

upsert_env() {
  local key="${1}" value="${2}" file="${3:-$ENV_FILE}"
  if grep -qE "^${key}=" "${file}"; then
    sed -i "s#^${key}=.*#${key}=${value}#" "${file}"
  else
    printf '%s=%s\n' "${key}" "${value}" >>"${file}"
  fi
}

load_state() {
  if [[ -f "${STATE_FILE}" ]]; then
    # shellcheck disable=SC1090
    source "${STATE_FILE}"
  fi

  WITH_OBS="${WITH_OBS:-false}"
  ALLOW_GRAFANA_LAN="${ALLOW_GRAFANA_LAN:-false}"
}

save_state() {
  cat >"${STATE_FILE}" <<STATE
WITH_OBS=${WITH_OBS}
ALLOW_GRAFANA_LAN=${ALLOW_GRAFANA_LAN}
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
}

compose() {
  local profile_args=()
  if [[ "${WITH_OBS}" == "true" ]]; then
    profile_args+=(--profile obs)
  fi

  docker_cmd compose --env-file "${ENV_FILE}" "${COMPOSE_FILE_ARGS[@]}" "${profile_args[@]}" "$@"
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

  log "Verifying schema parity against migration files"
  compose exec -T backend sh -lc 'cd /app && pnpm --filter @sentinel/database exec prisma migrate diff --from-migrations prisma/migrations --to-url "$DATABASE_URL" --exit-code'

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

  log "Verifying schema parity against migration files"
  compose exec -T backend sh -lc 'cd /app && pnpm --filter @sentinel/database exec prisma migrate diff --from-migrations prisma/migrations --to-url "$DATABASE_URL" --exit-code'

  run_bootstrap_sentinel_account
}

run_bootstrap_sentinel_account() {
  log "Ensuring protected Sentinel bootstrap badge/PIN account exists"
  wait_for_service_health backend 120 || die "Backend is not healthy; cannot bootstrap Sentinel account"
  compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/backend sentinel:bootstrap-account"
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
  run_root ufw deny in to any port 80 proto tcp >/dev/null || true
  run_root ufw --force enable >/dev/null

  log "UFW inbound policy applied: allow ${cidr} -> tcp/80, deny other inbound to tcp/80"
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
  compose logs --tail=80 caddy backend frontend postgres || true
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

write_systemd_unit() {
  local compose_args="-f ${BASE_COMPOSE_FILE}"
  local profile_args=""

  if [[ "${ALLOW_GRAFANA_LAN}" == "true" ]]; then
    compose_args+=" -f ${GRAFANA_OVERRIDE_FILE}"
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
