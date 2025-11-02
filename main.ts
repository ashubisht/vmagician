import * as dotenv from "dotenv";
import { App } from "cdktf";
import { OpenVPNStack } from "./stacks/vpn-stack";
import { IsoStack } from "./stacks/iso-stack";
import { WindowsServerStack } from "./stacks/windows-server-stack";

// Load environment variables from .env file
dotenv.config();

const app = new App();

new OpenVPNStack(app, "vpn-stack", {
  configPath: process.env.OPENVPN_CONFIG_PATH || "./config.ovpn",
  credentialsPath: process.env.OPENVPN_CREDENTIALS_PATH || "./credentials.txt"
});

new IsoStack(app, "ubuntu-iso-stack", {
  winrmConfig: {
    host: <string>process.env.WINRM_HOST,
    port: process.env.WINRM_PORT ? parseInt(process.env.WINRM_PORT) : 5985,
    user: <string>process.env.WINRM_USERNAME,
    password: <string>process.env.WINRM_PASSWORD,
    https: process.env.WINRM_USE_HTTPS === "true",
    use_ntlm: process.env.WINRM_USE_NTLM_AUTH === "true",
    insecure: process.env.WINRM_INSECURE === "true",
    timeout: process.env.WINRM_TIMEOUT || "5m"
  },
  isoPath: <string>process.env.ISO_PATH,
  isoUrl: process.env.ISO_URL || "https://releases.ubuntu.com/22.04.4/ubuntu-22.04.4-live-server-amd64.iso"
});

new WindowsServerStack(app, "windows-vm-stack", {
  vmName: <string>process.env.VM_NAME,
  vmPath: <string>process.env.VM_PATH,
  memoryStartupBytes: process.env.VM_MEMORY || "4GB",
  processorCount: process.env.VM_PROCESSORS ? parseInt(process.env.VM_PROCESSORS) : 2,
  switchName: process.env.VM_SWITCH || "Default Switch",
  generation: process.env.VM_GENERATION ? parseInt(process.env.VM_GENERATION) : 2,
  isoPath: <string>process.env.ISO_PATH,
   winrmConfig: {
    host: <string>process.env.WINRM_HOST,
    port: process.env.WINRM_PORT ? parseInt(process.env.WINRM_PORT) : 5985,
    user: <string>process.env.WINRM_USERNAME,
    password: <string>process.env.WINRM_PASSWORD,
    https: process.env.WINRM_USE_HTTPS === "true",
    use_ntlm: process.env.WINRM_USE_NTLM_AUTH === "true",
    insecure: process.env.WINRM_INSECURE === "true",
    timeout: process.env.WINRM_TIMEOUT || "5m"
  }
});

app.synth();
