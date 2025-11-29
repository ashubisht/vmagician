
# VMagician 🪄

Welcome to **VMagician** – your spellbinding toolkit for conjuring virtual machines out of thin air! Whether you’re a wizard of Windows Hyper-V or a prodigy of Proxmox, VMagician lets you spin up, manage, and vanish VMs with a flick of your wand (or, you know, a single command). Powered by Terraform and CDKTF, it’s the magical way to automate your infrastructure, no incantations required.

✨ **Why VMagician?**
- Multi-platform: Cast your VM spells on both Hyper-V and Proxmox.
- Code as magic: Define your infrastructure in TypeScript and let the magic happen.
- Flexible, fun, and open source – because automation should never be boring!

Ready to become a VM sorcerer? Read on!

## Prerequisites

This project requires the following dependencies and setup for your chosen virtualization platform.

### 1. Virtualization Platforms

Choose and configure one of the following platforms.

#### Hyper-V

Hyper-V must be enabled on your Windows Server to use this project. Run the following PowerShell command as Administrator:

```powershell
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All
```

After running the command, restart your server if prompted.

You can verify Hyper-V is enabled by running:

```powershell
Get-WindowsFeature -Name Hyper-V
```

The `Install State` should be `Installed`.

For more details, see the official Microsoft documentation: https://docs.microsoft.com/en-us/virtualization/hyper-v-on-windows/

### 1. Node.js

**Required Version:** Node.js >= 18.0

**Installation:**

- **macOS (using Homebrew):**
  ```bash
  brew install node
  ```

- **macOS (using nvm - recommended):**
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
  nvm install --lts
  nvm alias default node
  nvm use default
  ```

- **Linux/Windows:** Download LTS version from [nodejs.org](https://nodejs.org/)

**Verify installation:**
```bash
node --version
npm --version
```

### 3. Terraform

Terraform is required for infrastructure provisioning.

**Installation:**

- **macOS (using Homebrew with HashiCorp tap):**
  ```bash
  brew tap hashicorp/tap
  brew install hashicorp/tap/terraform
  terraform -install-autocomplete
  ```

- **Other platforms:** Download from [terraform.io](https://www.terraform.io/downloads)

**Verify installation:**
```bash
terraform --version
```

### 4. CDKTF (Cloud Development Kit for Terraform)

CDKTF is installed as a Node.js package dependency when you install project dependencies (see Setup section below).

You can also install it globally:
```bash
npm install -g cdktf-cli
```

**Verify installation:**
```bash
cdktf --version
```

### 5. Windows Remote Management (WinRM) for Hyper-V

WinRM must be enabled and properly configured on your Windows Server for remote management operations. Run these PowerShell commands as Administrator on your Windows Server:

```powershell
# Enable PowerShell remoting
Enable-PSRemoting -Force

# Configure WinRM
winrm quickconfig -q
winrm set winrm/config/service/auth '@{Basic="true"}'
winrm set winrm/config/service '@{AllowUnencrypted="true"}'
winrm set winrm/config/winrs '@{MaxMemoryPerShellMB="2048"}'

# Open firewall ports for WinRM
New-NetFirewallRule -Name "WinRM-HTTP-In-TCP" -DisplayName "Windows Remote Management (HTTP-In)" -Direction Inbound -LocalPort 5985 -Protocol TCP -Action Allow

# To enable firewall for any type of Network (Private, Domain or Public)
Set-NetFirewallRule -Name "WINRM-HTTP-In-TCP-PUBLIC" -RemoteAddress Any # Where WINRM-HTTP-In-TCP-PUBLIC is name of firewall rule
```

⚠️ **Security Note:** The above configuration enables basic authentication and unencrypted traffic for WinRM. In production environments, you should:
- Use HTTPS (port 5986) instead of HTTP
- Configure SSL certificates
- Use more restrictive firewall rules
- Consider using NTLM or Kerberos authentication

For production setup, consult your security team and Windows Server documentation.

### 6. OpenVPN

The OpenVPN command-line tool is required for VPN connectivity.

**Note:** The OpenVPN Connect app (GUI application) and the `openvpn` command-line tool are separate. You need the command-line tool installed.

**Installation:**

- **macOS (using Homebrew):**
  ```bash
  brew install openvpn
  ```

- **Linux:** Install via your distribution's package manager
  - Ubuntu/Debian: `sudo apt-get install openvpn`
  - Fedora/RHEL: `sudo dnf install openvpn`

**Verify installation:**
```bash
openvpn --version
```

For more details, see the official Microsoft documentation: https://docs.microsoft.com/en-us/virtualization/hyper-v-on-windows/

#### Proxmox VE

Ensure your Proxmox VE server is set up and accessible. You will need to create an API token for authentication.

**Create an API Token:**

1.  Log in to the Proxmox VE web interface.
2.  Go to **Datacenter > Permissions > API Tokens**.
3.  Click **Add**.
4.  Select a user (e.g., `root@pam`) and enter a **Token ID** (e.g., `cdktf-token`).
5.  Optionally, set an expiration date and disable permissions for specific paths.
6.  Click **Add**.
7.  **Important:** Copy the **Token ID** and **Secret** immediately. The secret will not be shown again.

You will use the Token ID and Secret in your environment variables (`PROXMOX_TOKEN_ID` and `PROXMOX_TOKEN_SECRET`).

For more details, see the [Proxmox VE API documentation](https://pve.proxmos.com/pve-docs/api-viewer/index.html).

**Create Ubuntu Cloud-Init Template:**

For the Proxmox template-based VM stack (`proxmox-template-vm-stack`), you need to create a cloud-init enabled Ubuntu template on your Proxmox server.

1.  **Install libguestfs-tools on Proxmox:**
    ```bash
    ssh root@<PROXMOX_IP>
    apt-get update && apt-get install libguestfs-tools -y
    ```

2.  **Copy and run the template creation script:**
    ```bash
    # From your local machine
    scp create_template.sh root@<PROXMOX_IP>:~/
    
    # On Proxmox server
    ssh root@<PROXMOX_IP>
    chmod +x create_template.sh
    ./create_template.sh
    ```

This script will:
- Download the latest Ubuntu Noble (24.04) cloud image
- Install and enable qemu-guest-agent
- Clean cloud-init state for proper instance initialization
- Create a Proxmox VM template (ID: 9000) ready for cloning

### 2. Node.js

## Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd vmagician
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Install CDKTF providers:**
   ```bash
   npm run get
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Configure sudo for OpenVPN (macOS):**
   
   On macOS, OpenVPN requires root privileges to create TUN/TAP network interfaces. To avoid password prompts during automation, configure sudo to run OpenVPN without a password.
   
   **Automated setup (recommended):**
   
   This command will automatically detect your username and OpenVPN path, then add the sudoers configuration:
   
   ```bash
   OPENVPN_PATH=$(which openvpn)
   CURRENT_USER=$(whoami)
   echo "$CURRENT_USER ALL=(ALL) NOPASSWD: $OPENVPN_PATH" | sudo tee /etc/sudoers.d/openvpn
   ```
   
   **Manual setup (alternative):**
   
   If you prefer to edit manually:
   
   ```bash
   # Get your username and OpenVPN path
   echo "Username: $(whoami)"
   echo "OpenVPN path: $(which openvpn)"
   
   # Then edit sudoers
   sudo visudo -f /etc/sudoers.d/openvpn
   ```
   
   Add this line (replace with your detected values):
   ```
   your_username ALL=(ALL) NOPASSWD: /path/to/openvpn
   ```

6. **Configure environment variables:**
   
   Copy the example environment file and edit with your configuration:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your Hyper-V or Proxmox details, as well as your OpenVPN paths. See the `.env.example` file for a full list of variables.

## Usage

### Proxmox Template-Based VM Stack

The `proxmox-template-vm-stack` creates VMs from the Ubuntu cloud-init template.

**Deploy a VM:**
```bash
cdktf deploy proxmox-template-vm-stack
```

**Get the VM IP address:**
```bash
terraform output -state=terraform.proxmox-template-vm-stack.tfstate vm-ip
```

**Get the SSH private key:**
```bash
terraform output -state=terraform.proxmox-template-vm-stack.tfstate -raw private-key > priv
chmod 400 priv
```

**SSH into the VM:**
```bash
ssh -i priv <CI_USER>@<VM_IP>
```

Replace `<CI_USER>` with the value from your `.env` file and `<VM_IP>` with the IP from the output.

**Destroy the VM:**
```bash
cdktf destroy proxmox-template-vm-stack
```

### General Usage

### Generate Terraform configuration:
```bash
npm run synth
```

### Apply infrastructure:
```bash
cdktf deploy
```

### Destroy infrastructure:
```bash
cdktf destroy
```

## Development

- **Watch mode (auto-compile TypeScript):**
  ```bash
  npm run watch
  ```

- **Run tests:**
  ```bash
  npm test
  ```

- **Upgrade CDKTF:**
  ```bash
  npm run upgrade
  ```
