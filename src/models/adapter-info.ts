// Port of adapter_info.dart

export enum AdapterChipType {
  ELM327_GENUINE = 'elm327Genuine',
  ELM327_CLONE = 'elm327Clone',
  STN_OBDLINK = 'stnOBDLink',
  VGATE = 'vgate',
  UNKNOWN = 'unknown',
}

export interface AdapterInfo {
  deviceId: string;
  deviceName: string;
  rssi: number;
  chipType: AdapterChipType;
  maxBatchPids: number;
  commandDelayMs: number;
  device?: BluetoothDevice;
}

export function createAdapterInfo(
  partial: Partial<AdapterInfo> & Pick<AdapterInfo, 'deviceId' | 'deviceName'>,
): AdapterInfo {
  return {
    rssi: -50,
    chipType: AdapterChipType.UNKNOWN,
    maxBatchPids: 1,
    commandDelayMs: 150,
    ...partial,
  };
}

export function chipLabel(chipType: AdapterChipType): string {
  const labels: Record<AdapterChipType, string> = {
    [AdapterChipType.ELM327_GENUINE]: 'ELM327 Genuine',
    [AdapterChipType.ELM327_CLONE]: 'ELM327 Clone',
    [AdapterChipType.STN_OBDLINK]: 'STN/OBDLink',
    [AdapterChipType.VGATE]: 'Vgate',
    [AdapterChipType.UNKNOWN]: 'Unknown',
  };
  return labels[chipType];
}
