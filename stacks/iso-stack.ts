import { LocalExecProvisioner, TerraformStack } from "cdktf";
import { Resource } from "@cdktf/provider-null/lib/resource";
import { NullProvider } from "@cdktf/provider-null/lib/provider";
import { Construct } from "constructs";

type LocalExecProvisionerConfig = {
  command: string;
  when?: "create" | "destroy";
}

class InitLocalExecProvisioner implements LocalExecProvisioner {
  public readonly type: "local-exec" = "local-exec";
  public command: string;
  public when?: "create" | "destroy";
  constructor(config: LocalExecProvisionerConfig){
    this.command = config.command;
    this.when = config.when;
  }
}

export type IsoConfig = {
  isoPath: string;
  isoUrl: string;
}

const downloadIso = (isoPath: string, isoUrl: string): string => {
  // Check if ISO already exists
  const checkExists = `if [ -f "${isoPath}" ]; then echo "ISO already exists at ${isoPath}"; exit 0; fi`;
  // Download ISO: if any of curl or wget is installed, use it to download the ISO
  const downloadCmd = `curl -L -o "${isoPath}" "${isoUrl}" || wget -O "${isoPath}" "${isoUrl}"`;
  return `${checkExists}; ${downloadCmd} && echo "ISO downloaded to ${isoPath}"`;
};

const removeIso = (isoPath: string): string => {
  return `if [ -f "${isoPath}" ]; then rm "${isoPath}" && echo "ISO removed from ${isoPath}"; else echo "ISO not found at ${isoPath}"; fi`;
};

export class IsoStack extends TerraformStack {
  constructor(scope: Construct, id: string, config: IsoConfig) {
    super(scope, id);

    // Add null provider
    new NullProvider(this, "null");

    new Resource(this, "DownloadIso", {
      provisioners: [
        new InitLocalExecProvisioner({
          command: downloadIso(config.isoPath, config.isoUrl),
          when: "create"
        }),
        new InitLocalExecProvisioner({
          command: removeIso(config.isoPath),
          when: "destroy"
        })
      ]
    });
  }
}

