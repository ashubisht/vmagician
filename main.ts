import { App } from "cdktf";
import { OpenVPNStack } from "./stacks/vpn-stack";

const app = new App();
new OpenVPNStack(app, "MyTerraformCDK");
app.synth();
