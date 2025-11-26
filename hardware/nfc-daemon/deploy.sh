#!/bin/bash
# Deploy NFC daemon to Raspberry Pi

set -e

PI_HOST="${PI_HOST:-pi@192.168.1.101}"
INSTALL_DIR="/opt/sentinel/hardware/nfc-daemon"

echo "Deploying Sentinel NFC Daemon to $PI_HOST..."

# Create remote directory
ssh "$PI_HOST" "sudo mkdir -p $INSTALL_DIR"

# Copy files
echo "Copying files..."
rsync -avz --exclude 'node_modules' --exclude 'dist' \
  ./ "$PI_HOST:/tmp/nfc-daemon/"

# Move to install directory and install dependencies
echo "Installing on remote..."
ssh "$PI_HOST" << 'EOF'
sudo mv /tmp/nfc-daemon/* /opt/sentinel/hardware/nfc-daemon/
cd /opt/sentinel/hardware/nfc-daemon
sudo bun install --production

# Install systemd service
sudo cp nfc-daemon.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nfc-daemon

echo "Deployment complete!"
echo "Start with: sudo systemctl start nfc-daemon"
echo "Check status: sudo systemctl status nfc-daemon"
echo "View logs: sudo journalctl -u nfc-daemon -f"
EOF

echo "Deployment successful!"
