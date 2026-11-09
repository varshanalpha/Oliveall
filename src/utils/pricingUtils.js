/**
 * OLIVEAL GAMING ZONE — PRICING CALCULATION ENGINE
 * 
 * Rules:
 * 1. PS5 Console:
 *    - 1 Player: ₹150 / hour
 *    - 2 Players: ₹100 / person / hour = ₹200 / hour total
 * 2. Racing Simulator:
 *    - ₹200 / person / hour (1 Player = ₹200 / hr, 2 Players = ₹400 / hr)
 * 3. Platform Fee:
 *    - Fixed ₹20 per booking
 * 4. Total Amount:
 *    - Station Charge + Platform Fee
 */

/**
 * Calculates station charge based on category, player count, and duration in minutes
 * @param {string} stationCategory - 'PS5 Console' | 'Racing Simulator' | 'ps5' | 'simulator'
 * @param {number} playerCount - 1 or 2
 * @param {number} durationMinutes - 60, 90, 120, etc.
 * @returns {number} Calculated station charge
 */
export function calculateStationCharge(stationCategory = 'PS5 Console', playerCount = 1, durationMinutes = 60) {
  const isSimulator =
    stationCategory === 'simulator' ||
    stationCategory === 'Racing Simulator' ||
    (typeof stationCategory === 'string' && stationCategory.toLowerCase().includes('racing'));

  const hours = Number(durationMinutes) / 60;
  const players = Number(playerCount) || 1;

  if (isSimulator) {
    // Racing Simulator: Strictly 1 person per cockpit @ ₹200 / hr
    return 200 * 1 * hours;
  }

  // PS5 Console:
  // 1 Player = ₹150 / hour
  // 2 Players = ₹100 / person / hour = ₹200 / hour total
  const hourlyRate = players === 1 ? 150 : 200;
  return hourlyRate * hours;
}

/**
 * Fixed platform fee per booking
 * @returns {number} 20
 */
export function calculatePlatformFee() {
  return 20;
}

/**
 * Calculates total payable amount
 * @param {number} stationCharge 
 * @param {number} platformFee 
 * @returns {number}
 */
export function calculateTotalAmount(stationCharge, platformFee = 20) {
  return Number(stationCharge) + Number(platformFee);
}

/**
 * Formats a numeric amount to Indian Rupee currency string (e.g. ₹420.00)
 * @param {number} amount 
 * @returns {string}
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `₹${num.toFixed(2)}`;
}

