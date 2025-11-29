#!/bin/bash
set -e

# Configuration
TEMPLATE_ID=9000
TEMPLATE_NAME="ubuntu-cloud-template"
MEMORY=2048
CORES=2
BRIDGE="vmbr0"
STORAGE="local-lvm"
# IMAGE_URL="https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img"
IMAGE_URL="https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img"
# IMAGE_NAME="jammy-server-cloudimg-amd64.img"
IMAGE_NAME="noble-server-cloudimg-amd64.img"

# Check for virt-customize
if ! command -v virt-customize &> /dev/null; then
    echo "Error: virt-customize is not installed."
    echo "To install it on Proxmox, run: apt-get update && apt-get install libguestfs-tools -y"
    exit 1
fi

echo "Downloading Ubuntu Cloud Image..."
wget -q --show-progress $IMAGE_URL -O $IMAGE_NAME

echo "Installing qemu-guest-agent..."
# Install qemu-guest-agent and reset machine-id for unique clones
virt-customize -a $IMAGE_NAME --install qemu-guest-agent,net-tools --run-command 'systemctl enable qemu-guest-agent' --run-command 'cloud-init clean' --run-command 'rm -rf /var/lib/cloud/instances/*' --run-command 'truncate -s 0 /etc/machine-id'

echo "Creating VM $TEMPLATE_ID ($TEMPLATE_NAME)..."
qm create $TEMPLATE_ID --name "$TEMPLATE_NAME" --memory $MEMORY --cores $CORES --net0 virtio,bridge=$BRIDGE

echo "Importing disk..."
qm importdisk $TEMPLATE_ID $IMAGE_NAME $STORAGE

echo "Configuring VM hardware..."
qm set $TEMPLATE_ID --scsihw virtio-scsi-pci --scsi0 $STORAGE:vm-$TEMPLATE_ID-disk-0
qm set $TEMPLATE_ID --boot order=scsi0
qm set $TEMPLATE_ID --ide2 $STORAGE:cloudinit
qm set $TEMPLATE_ID --serial0 socket --vga std
qm set $TEMPLATE_ID --agent enabled=1

echo "Converting to template..."
qm template $TEMPLATE_ID

echo "Done! Template $TEMPLATE_NAME ($TEMPLATE_ID) created with qemu-guest-agent."
rm $IMAGE_NAME
