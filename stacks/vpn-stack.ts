import { LocalExecProvisioner, TerraformStack } from "cdktf";
import { Resource } from "@cdktf/provider-null/lib/resource";
import { Construct } from "constructs";

type LocalExecProvisionerConfig = {
  command: string;
}

// type LocalExecProvisionerParameter = {
//   type: "local-exec";
// } & LocalExecProvisionerConfig;

class InitLocalExecProvisioner {
  public type: string;
  public command: string;
  constructor(config: LocalExecProvisionerConfig){
    this.type = "local-exec";
    this.command = config.command;
  }
}

export type OpenVPNConfig = {
  configPath: string;
  credentialsPath: string;
}

const connectToOpenVPNProfile = (config: OpenVPNConfig) => `sudo openvpn --config ${config.configPath} --auth-user-pass ${config.credentialsPath} --daemon`;

export class OpenVPNStack extends TerraformStack {
  constructor(scope: Construct, id: string, vpnConfig: OpenVPNConfig) {
    super(scope, id);

    // Step 1: Connect to OpenVPN on macOS
    new Resource(this, "ConnectOpenVPN", {
      provisioners: [
        new InitLocalExecProvisioner({
          command: connectToOpenVPNProfile(vpnConfig)
        }) as LocalExecProvisioner
      ]
    });
  }
}
