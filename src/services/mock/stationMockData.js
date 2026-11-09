/**
 * OLIVEAL GAMING ZONE — MOCK STATION DATA
 * Dedicated frontend service layer representing the 6 physical gaming stations.
 * In Phase 3, this will be retrieved from the Supabase `slots` or `stations` table.
 */

export const STATIONS = [
  {
    id: 'alpha',
    name: 'ALPHA',
    category: 'PS5 Console',
    tag: 'PS5',
    type: 'ps5',
    image: '/assets/images/ps5-station.png',
    isAvailable: true,
    badgeText: 'Available',
    badgeType: 'available', // 'available' | 'booked'
    pricePerHour: 150,
    maxPlayers: 2,
    description: 'Sony PlayStation 5 4K 120Hz gaming station with DualSense wireless controllers.',
  },
  {
    id: 'beta',
    name: 'BETA',
    category: 'PS5 Console',
    tag: 'PS5',
    type: 'ps5',
    image: '/assets/images/ps5-station.png',
    isAvailable: true,
    badgeText: 'Available',
    badgeType: 'available',
    pricePerHour: 150,
    maxPlayers: 2,
    description: 'Sony PlayStation 5 4K 120Hz gaming station with high-fidelity 3D audio.',
  },
  {
    id: 'gamma',
    name: 'GAMMA',
    category: 'PS5 Console',
    tag: 'PS5',
    type: 'ps5',
    image: '/assets/images/ps5-station.png',
    isAvailable: false,
    badgeText: 'Booked until 06:00 PM',
    badgeType: 'booked',
    pricePerHour: 150,
    maxPlayers: 2,
    description: 'Sony PlayStation 5 premium battle station with dual pro controller support.',
  },
  {
    id: 'delta',
    name: 'DELTA',
    category: 'PS5 Console',
    tag: 'PS5',
    type: 'ps5',
    image: '/assets/images/ps5-station.png',
    isAvailable: true,
    badgeText: 'Available',
    badgeType: 'available',
    pricePerHour: 150,
    maxPlayers: 2,
    description: 'Sony PlayStation 5 esports tournament rig with low-latency display.',
  },
  {
    id: 'rs-1',
    name: 'RS 1',
    category: 'Racing Simulator',
    tag: 'Racing Sim',
    type: 'simulator',
    image: '/assets/images/racing-simulator.png',
    isAvailable: true,
    badgeText: 'Available',
    badgeType: 'available',
    pricePerHour: 250,
    maxPlayers: 1,
    description: 'Direct-drive force feedback racing cockpit with load-cell pedals and wrap-around immersion.',
  },
  {
    id: 'rs-2',
    name: 'RS 2',
    category: 'Racing Simulator',
    tag: 'Racing Sim',
    type: 'simulator',
    image: '/assets/images/racing-simulator.png',
    isAvailable: false,
    badgeText: 'Booked until 07:30 PM',
    badgeType: 'booked',
    pricePerHour: 250,
    maxPlayers: 1,
    description: 'Pro racing chassis with hydraulic pedals, dynamic haptic feedback, and sequential shifter.',
  },
];

export function getStationById(id) {
  if (!id) return STATIONS[0];
  const found = STATIONS.find((s) => s.id.toLowerCase() === id.toLowerCase());
  return found || STATIONS[0];
}

