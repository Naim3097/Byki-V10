export type WhatsAppLocationId =
  | 'shah-alam-jalan-kebun'
  | 'shah-alam-alam-impian'
  | 'johor-bahru-tampoi';

export interface WhatsAppLocation {
  id: WhatsAppLocationId;
  city: string;
  area: string;
  branch: string;
  number: string;
  display: string;
}

export const WHATSAPP_LOCATIONS: WhatsAppLocation[] = [
  {
    id: 'shah-alam-jalan-kebun',
    city: 'Shah Alam',
    area: 'Jalan Kebun',
    branch: 'One X Transmission',
    number: '60102020723',
    display: '+60 10-202 0723',
  },
  {
    id: 'shah-alam-alam-impian',
    city: 'Shah Alam',
    area: 'Alam Impian',
    branch: 'MNA Dynamic Torque',
    number: '601111741442',
    display: '+60 11-1174 1442',
  },
  {
    id: 'johor-bahru-tampoi',
    city: 'Johor Bahru',
    area: 'Tampoi',
    branch: 'Dseventeen Work Motor',
    number: '601130463476',
    display: '+60 11-3046 3476',
  },
];

export function getLocationById(
  id: WhatsAppLocationId | null | undefined,
): WhatsAppLocation | null {
  if (!id) return null;
  return WHATSAPP_LOCATIONS.find((l) => l.id === id) ?? null;
}
