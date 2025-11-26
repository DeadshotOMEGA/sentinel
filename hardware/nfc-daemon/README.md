# Sentinel NFC Daemon

NFC badge reader daemon for Raspberry Pi with PN532 HAT.

## Development

```bash
cd hardware/nfc-daemon
bun install
bun run dev
```

In dev mode, type card UIDs in the terminal and press Enter to simulate scans.

## Production Deployment

1. Copy files to Pi:
```bash
scp -r hardware/nfc-daemon pi@192.168.1.101:/opt/sentinel/hardware/
```

2. Install service:
```bash
sudo cp nfc-daemon.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nfc-daemon
sudo systemctl start nfc-daemon
```

3. Check status:
```bash
sudo systemctl status nfc-daemon
sudo journalctl -u nfc-daemon -f
```

## Configuration

Create `/etc/sentinel/nfc-daemon.json`:
```json
{
  "kioskId": "primary-entrance",
  "apiUrl": "http://192.168.1.100:3000",
  "kioskNotifyUrl": "http://localhost:5174",
  "pollInterval": 100,
  "debounceTime": 5000
}
```

Or use environment variables:
- `KIOSK_ID`
- `API_URL`
- `KIOSK_NOTIFY_URL`
