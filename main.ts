import * as dotenv from "dotenv";
import { App } from "cdktf";
import { OpenVPNStack } from "./stacks/vpn-stack";
import { IsoStack } from "./stacks/iso-stack";

// Load environment variables from .env file
dotenv.config();

const app = new App();
new OpenVPNStack(app, "vpn-stack", {
  configPath: process.env.OPENVPN_CONFIG_PATH || "./config.ovpn",
  credentialsPath: process.env.OPENVPN_CREDENTIALS_PATH || "./credentials.txt"
});
new IsoStack(app, "ubuntu-iso-stack", {
  isoPath: process.env.UBUNTU_ISO_PATH || "./ubuntu.iso",
  isoUrl: process.env.UBUNTU_ISO_URL || "https://releases.ubuntu.com/22.04.4/ubuntu-22.04.4-live-server-amd64.iso"
});
app.synth();
