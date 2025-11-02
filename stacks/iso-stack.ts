import { TerraformStack, RemoteExecProvisioner } from "cdktf";
import { Resource } from "@cdktf/provider-null/lib/resource";
import { NullProvider } from "@cdktf/provider-null/lib/provider";
import { Construct } from "constructs";

type RemoteExecProvisionerConfig = {
  inline?: string[];
  script?: string;
  scripts?: string[];
  when?: "create" | "destroy";
  connection: {
    type: "winrm";
    host: string;
    user: string;
    password: string;
    port?: number;
    https?: boolean;
    insecure?: boolean;
    use_ntlm?: boolean;
    timeout?: string;
  };
}

class InitRemoteExecProvisioner implements RemoteExecProvisioner {
  public readonly type: "remote-exec" = "remote-exec";
  public inline?: string[];
  public script?: string;
  public scripts?: string[];
  public when?: "create" | "destroy";
  public connection: {
    type: "winrm";
    host: string;
    user: string;
    password: string;
    port?: number;
    https?: boolean;
    insecure?: boolean;
    use_ntlm?: boolean;
    timeout?: string;
  };

  constructor(config: RemoteExecProvisionerConfig) {
    this.inline = config.inline;
    this.script = config.script;
    this.scripts = config.scripts;
    this.when = config.when;
    this.connection = config.connection;
  }
}

export type IsoConfig = {
  isoPath: string;
  isoUrl: string;
  winrmConfig: {
    host: string;
    user: string;
    password: string;
    port: number;
    https: boolean;
    use_ntlm: boolean;
    insecure: boolean;
    timeout: string;
  };
}

// Note: Use Windows-style paths for isoPath, e.g., 'C:\\ISOs\\ubuntu.iso'
const downloadIso = (isoPath: string, isoUrl: string): string[] => {
  // Join all PowerShell commands into a single script and wrap with powershell -Command
  const psScript = [
      `if (Test-Path '${isoPath}') { Write-Host 'ISO already exists at ${isoPath}'; exit 0 };`,
      `try {`,
      `    $ProgressPreference = 'SilentlyContinue';`,
      `    curl.exe -L -o '${isoPath}' '${isoUrl}';`,
      `    Write-Host 'ISO downloaded to ${isoPath}';`,
      `} catch {`,
      `    Write-Error 'Failed to download ISO: $_';`,
      `    exit 1;`,
      `}`
  ].join(' ');
  return [
    `powershell -Command "${psScript.replace(/"/g, '\"')}"`
  ];
};

const removeIso = (isoPath: string): string[] => {
  const psScript = [
    `if (Test-Path '${isoPath}') {`,
    `    Remove-Item '${isoPath}' -Force;`,
    `    Write-Host 'ISO removed from ${isoPath}';`,
    `} else {`,
    `    Write-Host 'ISO not found at ${isoPath}';`,
    `}`
  ].join(' ');
  return [
    `powershell -Command "${psScript.replace(/"/g, '\"')}"`
  ];
};

export class IsoStack extends TerraformStack {
  constructor(scope: Construct, id: string, config: IsoConfig) {
    super(scope, id);

    // Add null provider
    new NullProvider(this, "null");

    new Resource(this, "DownloadIso", {
      provisioners: [
        new InitRemoteExecProvisioner({
          inline: downloadIso(config.isoPath, config.isoUrl),
          when: "create",
          connection: {
            type: "winrm",
            host: config.winrmConfig.host,
            user: config.winrmConfig.user,
            password: config.winrmConfig.password,
            port: config.winrmConfig.port,
            https: config.winrmConfig.https,
            use_ntlm: config.winrmConfig.use_ntlm,
            insecure: config.winrmConfig.insecure,
            timeout: config.winrmConfig.timeout
          }
        }),
        new InitRemoteExecProvisioner({
          inline: removeIso(config.isoPath),
          when: "destroy",
          connection: {
            type: "winrm",
            host: config.winrmConfig.host,
            user: config.winrmConfig.user,
            password: config.winrmConfig.password,
            port: config.winrmConfig.port || 5985,
            https: config.winrmConfig.https || false,
            use_ntlm: config.winrmConfig.use_ntlm || false,
            insecure: config.winrmConfig.insecure,
            timeout: config.winrmConfig.timeout
          }
        })
      ]
    });
  }
}

