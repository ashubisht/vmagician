
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
    port: number;
    https: boolean;
    insecure: boolean;
    use_ntlm: boolean;
    timeout: string;
  };
};

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
    port: number;
    https: boolean;
    insecure: boolean;
    use_ntlm: boolean;
    timeout: string;
  };
  constructor(config: RemoteExecProvisionerConfig) {
    this.inline = config.inline;
    this.script = config.script;
    this.scripts = config.scripts;
    this.when = config.when;
    this.connection = config.connection;
  }
}

export type WindowsServerConfig = {
  vmName: string;
  vmPath: string;
  memoryStartupBytes: string;
  processorCount: number;
  switchName: string;
  generation: number;
  isoPath: string;
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

const createWindowsServerVm = (config: WindowsServerConfig): string[] => {
  const vmName = config.vmName;
  const vmPath = config.vmPath;
  const rawMemory: any = config.memoryStartupBytes;
  // Normalize memory argument for Hyper-V New-VM. If caller passed a bare number (e.g. 4096)
  // treat it as megabytes (4096 -> "4096MB"). If it already contains units (MB/GB), keep as-is.
  let memoryArg: string;
  if (rawMemory === undefined || rawMemory === null) {
    memoryArg = '4GB';
  } else if (typeof rawMemory === 'number') {
    memoryArg = `${rawMemory}MB`;
  } else if (typeof rawMemory === 'string') {
    const trimmed = rawMemory.trim();
    if (/^\d+$/.test(trimmed)) {
      memoryArg = `${trimmed}MB`;
    } else {
      memoryArg = trimmed; // assume caller provided a valid unit like '4GB' or '4096MB'
    }
  } else {
    memoryArg = String(rawMemory);
  }
  const processorCount = config.processorCount;
  const switchName = config.switchName;
  const generation = config.generation;
  const isoPath = config.isoPath;
  // Build PowerShell script using single quotes for string literals to avoid breaking cmd quoting
  const safeVmName = vmName.replace(/'/g, "''");
  const safeVmPath = vmPath.replace(/'/g, "''");
  const safeSwitchName = switchName.replace(/'/g, "''");
  const safeIso = (isoPath || "").replace(/'/g, "''");

  const psScriptParts: string[] = [
    `if (Get-VM -Name '${safeVmName}' -ErrorAction SilentlyContinue) { Write-Host 'VM ${vmName} already exists'; exit 0 }`,
    `if (-not (Test-Path '${safeVmPath}')) { New-Item -ItemType Directory -Path '${safeVmPath}' -Force | Out-Null }`,
  `$vm = New-VM -Name '${safeVmName}' -Path '${safeVmPath}' -MemoryStartupBytes ${memoryArg} -Generation ${generation} -SwitchName '${safeSwitchName}' -ErrorAction Stop`,
    `Set-VMProcessor -VM $vm -Count ${processorCount}`
  ];

  if (safeIso && safeIso.trim() !== "") {
    psScriptParts.push(
      `$isoPath = '${safeIso}' -replace '/', '\\'`,
      `if (Test-Path $isoPath) { Add-VMDvdDrive -VMName '${safeVmName}' -Path $isoPath; Write-Host 'VM ${vmName} created with Ubuntu ISO attached' } else { Write-Host 'Warning: ISO file $isoPath not found. VM created without ISO.'; Write-Host 'You can attach an ISO later using: Set-VMDvdDrive -VMName ${vmName} -Path <ISO_PATH>' }`
    );
  }

  const psScript = psScriptParts.join('; ');
  return [
    `powershell -Command "${psScript}"`
  ];
};

const removeWindowsServerVm = (config: WindowsServerConfig): string[] => {
  const vmName = config.vmName;
  const safeVmName = vmName.replace(/'/g, "''");
  const psScript = [
    `$ErrorActionPreference = 'Continue'`,
    `$vm = Get-VM -Name '${safeVmName}' -ErrorAction SilentlyContinue`,
    `if ($vm) {`,
    `  Write-Host 'Removing DVD drives...'`,
    `  Get-VMDvdDrive -VMName '${safeVmName}' | Remove-VMDvdDrive -ErrorAction SilentlyContinue`,
    `  if ($vm.State -eq 'Running') {`,
    `    Write-Host 'Stopping VM...'`,
    `    Stop-VM -Name '${safeVmName}' -Force -TurnOff`,
    `    Start-Sleep -Seconds 5`,
    `    Write-Host 'VM ${vmName} stopped'`,
    `  }`,
    `  Write-Host 'Removing VM...'`,
    `  Remove-VM -Name '${safeVmName}' -Force -ErrorAction Stop`,
    `  Write-Host 'VM ${vmName} removed'`,
    `} else {`,
    `  Write-Host 'VM ${vmName} does not exist'`,
    `}`
  ].join('; ');
  return [
    `powershell -Command "${psScript}"`
  ];
};

export class WindowsServerStack extends TerraformStack {
  constructor(scope: Construct, id: string, config: WindowsServerConfig) {
    super(scope, id);

    // Add null provider
    new NullProvider(this, "null");


    // Create Windows Server VM with Ubuntu ISO using remote-exec
    new Resource(this, "CreateWindowsServerVm", {
      provisioners: [
        new InitRemoteExecProvisioner({
          inline: createWindowsServerVm(config),
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
          inline: removeWindowsServerVm(config),
          when: "destroy",
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
        })
      ]
    });
  }
}

