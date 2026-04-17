#!/usr/bin/env bash

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run as root: sudo bash $0"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "[1/7] Updating apt metadata"
apt-get update

echo "[2/7] Installing core development packages"
apt-get install -y \
  apt-transport-https \
  build-essential \
  ca-certificates \
  curl \
  ffmpeg \
  git \
  gnupg \
  jq \
  libbz2-dev \
  libcairo2-dev \
  libffi-dev \
  libgdbm-dev \
  libgirepository1.0-dev \
  libjpeg-dev \
  liblzma-dev \
  libmagic1 \
  libpq-dev \
  libsasl2-dev \
  libsqlite3-dev \
  libssl-dev \
  libxml2-dev \
  libxmlsec1-dev \
  libxslt1-dev \
  libyaml-dev \
  make \
  pkg-config \
  postgresql-client \
  redis-tools \
  software-properties-common \
  sqlite3 \
  tk-dev \
  unzip \
  wget \
  xz-utils \
  zlib1g-dev \
  zsh

echo "[3/7] Installing Docker"
install -m 0755 -d /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi

ARCH="$(dpkg --print-architecture)"
CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME}")"

cat >/etc/apt/sources.list.d/docker.list <<EOF
deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable
EOF

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

if id -u "${SUDO_USER:-}" >/dev/null 2>&1; then
  usermod -aG docker "${SUDO_USER}"
fi

TARGET_HOME="/root"
TARGET_USER="root"
if [[ -n "${SUDO_USER:-}" ]] && getent passwd "${SUDO_USER}" >/dev/null; then
  TARGET_HOME="$(getent passwd "${SUDO_USER}" | cut -d: -f6)"
  TARGET_USER="${SUDO_USER}"
fi

echo "[4/7] Installing fnm (Node version manager)"
if [[ ! -x "${TARGET_HOME}/.local/share/fnm/fnm" ]]; then
  su - "${TARGET_USER}" -c 'curl -fsSL https://fnm.vercel.app/install | bash -s -- --install-dir "$HOME/.local/share/fnm" --skip-shell'
fi

FNM_BIN="${TARGET_HOME}/.local/share/fnm/fnm"
if [[ -x "${FNM_BIN}" ]]; then
  su - "${TARGET_USER}" -c "\"${FNM_BIN}\" install --lts"
  su - "${TARGET_USER}" -c "\"${FNM_BIN}\" default lts-latest"
fi

echo "[5/7] Installing uv (Python package/project manager)"
if [[ ! -x "${TARGET_HOME}/.local/bin/uv" ]]; then
  su - "${TARGET_USER}" -c 'curl -LsSf https://astral.sh/uv/install.sh | sh'
fi

echo "[6/7] Installing pyenv"
if [[ ! -d "${TARGET_HOME}/.pyenv" ]]; then
  su - "${TARGET_USER}" -c 'curl -fsSL https://pyenv.run | bash'
fi

echo "[7/7] Writing shell profile snippets"
PROFILE_SNIPPET="${TARGET_HOME}/.profile_sentinel_setup"
cat >"${PROFILE_SNIPPET}" <<'EOF'
export PATH="$HOME/.local/bin:$PATH"

if [ -d "$HOME/.pyenv/bin" ]; then
  export PYENV_ROOT="$HOME/.pyenv"
  export PATH="$PYENV_ROOT/bin:$PATH"
  eval "$(pyenv init -)"
fi

if [ -d "$HOME/.local/share/fnm" ]; then
  export PATH="$HOME/.local/share/fnm:$PATH"
  eval "$(fnm env --use-on-cd --shell bash)"
fi
EOF

chown "${TARGET_USER}:${TARGET_USER}" "${PROFILE_SNIPPET}"

for shell_rc in "${TARGET_HOME}/.bashrc" "${TARGET_HOME}/.zshrc"; do
  if [[ -f "${shell_rc}" ]]; then
    if ! grep -Fq ".profile_sentinel_setup" "${shell_rc}"; then
      echo "" >>"${shell_rc}"
      echo "[ -f \"\$HOME/.profile_sentinel_setup\" ] && . \"\$HOME/.profile_sentinel_setup\"" >>"${shell_rc}"
    fi
  else
    cat >"${shell_rc}" <<'EOF'
[ -f "$HOME/.profile_sentinel_setup" ] && . "$HOME/.profile_sentinel_setup"
EOF
    chown "${TARGET_USER}:${TARGET_USER}" "${shell_rc}"
  fi
done

cat <<EOF

Setup complete.

Next steps:
  1. Restart your shell or run: source ~/.bashrc
  2. Re-log in once so docker group membership applies cleanly
  3. Install a Python version for the project, for example:
       pyenv install 3.12.9
       pyenv global 3.12.9
  4. Check tool versions:
       git --version
       docker --version
       uv --version
       fnm --version
       node --version
       npm --version
EOF
