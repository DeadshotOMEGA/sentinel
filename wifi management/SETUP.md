# Sentinel Ubuntu Setup

This repo is currently empty on this machine, so the setup below is a strong baseline rather than an exact dependency match from project files.

## What the script installs

- Core tooling: `git`, `curl`, `wget`, `jq`, `build-essential`, `pkg-config`
- Python build dependencies for common packages: OpenSSL, SQLite, zlib, bz2, ffi, lzma, tk, XML, YAML
- App/media/system libraries often needed by web and data projects: Cairo, JPEG, GLib, libmagic, FFmpeg
- Database client libraries and CLIs: PostgreSQL client headers, `sqlite3`, `redis-tools`
- Containers: Docker Engine, Buildx, Compose plugin
- Version managers and package tooling:
  - `pyenv` for Python versions
  - `uv` for Python environments and dependency sync
  - `fnm` for Node.js, with the latest LTS installed by default

## Run it

```bash
cd /home/sentinel000/Projects/Sentinel
chmod +x setup-ubuntu-sentinel.sh
sudo bash ./setup-ubuntu-sentinel.sh
```

Then restart your shell:

```bash
source ~/.bashrc
```

## Good follow-up commands

Install a Python version once you know the project target:

```bash
pyenv install 3.12.9
pyenv global 3.12.9
python --version
```

Verify the baseline:

```bash
git --version
docker --version
uv --version
fnm --version
node --version
npm --version
```

## Hotspot Recovery

This machine's NetworkManager hotspot profile is named `Sentinel Hotspot`, but the WiFi network it currently broadcasts is `Stone Frigate`.

If the TP-Link USB adapter gets into the bad state where the profile looks active but other devices cannot see the SSID, use the recovery helper instead of physically unplugging it:

```bash
cd /home/sentinel000/Projects/Sentinel
chmod +x recover-sentinel-hotspot.sh
sudo bash ./recover-sentinel-hotspot.sh
```

What it does:

- reapplies the known-good radio settings for this adapter: 2.4 GHz (`bg`) on channel `1`
- disables WiFi power saving on the hotspot profile
- brings the hotspot down cleanly
- rebinds the Realtek USB WiFi driver, with a USB-level reset fallback
- brings the hotspot back up
- waits for the SSID to become visible again before declaring success

Notes for this hardware:

- the TP-Link `rtw88_8822bu` adapter has been more reliable on channel `1` than on auto-selected channels
- `WPA3 Personal` (`sae`) has been flaky for hotspot mode on this adapter, so the stable setup here is currently `wpa-psk`

You can optionally pass a different NetworkManager connection name as the first argument:

```bash
sudo bash ./recover-sentinel-hotspot.sh "Sentinel Hotspot"
```

By default it waits up to 20 seconds, checking every 2 seconds. You can override that per run if needed:

```bash
sudo SSID_WAIT_TIMEOUT=30 SSID_POLL_INTERVAL=2 ./recover-sentinel-hotspot.sh
```

You can also override the radio settings per run if you ever want to test a different channel:

```bash
sudo HOTSPOT_BAND=bg HOTSPOT_CHANNEL=6 ./recover-sentinel-hotspot.sh
```

## Webapp Trigger

There is not a truly rootless version of the full recovery flow because the USB reset steps write to privileged sysfs paths and the hotspot profile is a system NetworkManager connection.

The safe pattern for a webapp is:

- keep the real recovery helper root-owned in `/usr/local/sbin`
- allow only your webapp's Unix user to run that one exact command with `sudo -n`
- call the helper from the backend, not from browser-side code

Files in this repo for that setup:

- [install-webapp-hotspot-recovery.sh](/home/sentinel000/Projects/Sentinel/install-webapp-hotspot-recovery.sh): installs a root-owned helper and a minimal `sudoers` rule
- [request-hotspot-recovery.sh](/home/sentinel000/Projects/Sentinel/request-hotspot-recovery.sh): a no-args launcher that a backend can call

Example install for a webapp running as `www-data`:

```bash
cd /home/sentinel000/Projects/Sentinel
chmod +x install-webapp-hotspot-recovery.sh request-hotspot-recovery.sh
sudo bash ./install-webapp-hotspot-recovery.sh www-data
```

After that, the backend process running as `www-data` can trigger recovery with:

```bash
/home/sentinel000/Projects/Sentinel/request-hotspot-recovery.sh
```

Security notes:

- do not point `sudoers` at the copy inside this repo, because this repo lives in a user-writable location
- keep the webapp trigger no-args so other users cannot pass arbitrary values through to the privileged helper
- the recovery helper now takes a lock, so concurrent web requests will fail fast instead of stepping on each other

## Likely extras depending on Sentinel

You may also want one or more of these once the real repo is present:

- `direnv` for automatic env loading
- `just` or `make` task runners
- `pnpm` or `yarn` if the project uses them
- `postgresql` and `redis-server` if you want local services, not just clients
- `libopencv-dev`, `tesseract-ocr`, or CUDA packages for CV/ML workloads
- `playwright` browser deps for end-to-end tests

## After the repo is populated

Once `Sentinel` has a real codebase, inspect project files and tighten setup around:

- `package.json`
- `pyproject.toml`
- `requirements*.txt`
- `Dockerfile`
- `.nvmrc`
- `.python-version`

At that point you can trim or extend the package list to exactly match the project.
