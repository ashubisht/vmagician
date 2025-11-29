
import { TerraformOutput, TerraformStack } from "cdktf";
import { Construct } from "constructs";
import { ProxmoxProvider } from "../.gen/providers/proxmox/provider";
import { VmQemu } from "../.gen/providers/proxmox/vm-qemu";
import { TlsProvider } from "@cdktf/provider-tls/lib/provider";
import { PrivateKey } from "@cdktf/provider-tls/lib/private-key";

export interface ProxmoxTemplateStackConfig {
  proxmoxUrl: string;
  proxmoxNode: string;
  proxmoxTokenId: string;
  proxmoxTokenSecret: string;
  vmName: string;
  vmId: number;
  templateName: string;
  diskStorage: string;
  diskSize: number;
  memory: number;
  cores: number;
  networkBridge: string;
  networkModel: string;
  sshPublicKeys: string;
  ciUser?: string;
  ciPassword?: string;
}

export class ProxmoxTemplateStack extends TerraformStack {
  constructor(scope: Construct, id: string, config: ProxmoxTemplateStackConfig) {
    super(scope, id);

    new ProxmoxProvider(this, "proxmox", {
      pmApiUrl: config.proxmoxUrl,
      pmApiTokenId: config.proxmoxTokenId,
      pmApiTokenSecret: config.proxmoxTokenSecret,
      pmTlsInsecure: true,
    });

    new TlsProvider(this, 'tls-provider', {});
    const privateKey = new PrivateKey(this, "proxmox-ssh-private-key", {
      algorithm: "ED25519",
    });

    const vm = new VmQemu(this, "vm", {
      dependsOn: [privateKey],
      name: config.vmName,
      targetNode: config.proxmoxNode,
      vmid: config.vmId,
      clone: config.templateName,
      osType: "cloud-init",
      agent: 1,
      agentTimeout: 300,
      scsihw: "virtio-scsi-pci",
      memory: config.memory,
      cpu: {
        cores: config.cores,
        //type: "host",
        // type: "x86-64-v2-AES",
      },
      disk: [{
        slot: "scsi0",
        storage: config.diskStorage,
        size: `${config.diskSize}G`,
        type: "disk",
      }, {
        slot: "ide2",
        storage: config.diskStorage,
        type: "cloudinit"
      }],
      network: [{
        id: 0,
        bridge: config.networkBridge,
        model: config.networkModel,
      }],
      sshkeys: config.sshPublicKeys || privateKey.publicKeyOpenssh,
      ciuser: config.ciUser,
      cipassword: config.ciPassword,
      ipconfig0: "ip=dhcp",
    });

    if (!config.sshPublicKeys) {
      new TerraformOutput(this, "private-key", {
        value: privateKey.privateKeyOpenssh,
        sensitive: true
      });
    }

    new TerraformOutput(this, "vm-ip", {
      value: vm.defaultIpv4Address,
    });
  }
}
