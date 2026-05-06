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
  // Approximate branch coordinates — used for "nearest branch" geolocation.
  // Refine with exact addresses if precision matters within the same city.
  lat: number;
  lng: number;
}

export const WHATSAPP_LOCATIONS: WhatsAppLocation[] = [
  {
    id: 'shah-alam-jalan-kebun',
    city: 'Shah Alam',
    area: 'Jalan Kebun',
    branch: 'One X Transmission',
    number: '60102020723',
    display: '+60 10-202 0723',
    // Jalan Haji Taib, Batu 7 1/2, Kampung Jln Kebun, 40460 Shah Alam
    lat: 3.0226,
    lng: 101.5388,
  },
  {
    id: 'shah-alam-alam-impian',
    city: 'Shah Alam',
    area: 'Alam Impian',
    branch: 'MNA Dynamic Torque',
    number: '601111741442',
    display: '+60 11-1174 1442',
    // 18 Lebuh Keluli, Bukit Raja Industrial Estate, 41050 Klang
    lat: 3.0834,
    lng: 101.4598,
  },
  {
    id: 'johor-bahru-tampoi',
    city: 'Johor Bahru',
    area: 'Tampoi',
    branch: 'Dseventeen Work Motor',
    number: '601130463476',
    display: '+60 11-3046 3476',
    lat: 1.4955,
    lng: 103.7167,
  },
];

export function getLocationById(
  id: WhatsAppLocationId | null | undefined,
): WhatsAppLocation | null {
  if (!id) return null;
  return WHATSAPP_LOCATIONS.find((l) => l.id === id) ?? null;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function findNearestLocation(
  userLat: number,
  userLng: number,
): { location: WhatsAppLocation; distanceKm: number } {
  let best = WHATSAPP_LOCATIONS[0];
  let bestDist = haversineKm(userLat, userLng, best.lat, best.lng);
  for (let i = 1; i < WHATSAPP_LOCATIONS.length; i++) {
    const loc = WHATSAPP_LOCATIONS[i];
    const d = haversineKm(userLat, userLng, loc.lat, loc.lng);
    if (d < bestDist) {
      best = loc;
      bestDist = d;
    }
  }
  return { location: best, distanceKm: bestDist };
}
