
import { TerraformStack } from "cdktf";
import { Construct } from "constructs";
import { ProxmoxProvider } from "../.gen/providers/proxmox/provider";
import { VmQemu } from "../.gen/providers/proxmox/vm-qemu";

export interface ProxmoxStackConfig {
  proxmoxUrl: string;
  proxmoxNode: string;
  proxmoxTokenId: string;
  proxmoxTokenSecret: string;
  vmName: string;
  vmId: number;
  isoStorage: string;
  isoImage: string;
  diskStorage: string;
  diskSize: number;
  memory: number;
  cores: number;
  networkBridge: string;
  networkModel: string;
  osType: string;
}

export class ProxmoxStack extends TerraformStack {
  constructor(scope: Construct, id: string, config: ProxmoxStackConfig) {
    super(scope, id);

    new ProxmoxProvider(this, "proxmox", {
      pmApiUrl: config.proxmoxUrl,
      pmApiTokenId: config.proxmoxTokenId,
      pmApiTokenSecret: config.proxmoxTokenSecret,
      pmTlsInsecure: true,
    });

    new VmQemu(this, "vm", {
      name: config.vmName,
      targetNode: config.proxmoxNode,
      vmid: config.vmId,
      osType: config.osType,
      agent: 1,
      scsihw: "virtio-scsi-pci",
      disk: [{
        slot: "ide0",
        iso: `${config.isoStorage}:iso/${config.isoImage}`,
        type: "cdrom",
      }, {
        slot: "scsi0",
        storage: config.diskStorage,
        size: `${config.diskSize}G`,
        type: "disk",
      }],
      memory: config.memory,
      cpu: {
        cores: config.cores,
      },
      network: [{
        id: 0,
        bridge: config.networkBridge,
        model: config.networkModel,
      }],
    });
  }
}
