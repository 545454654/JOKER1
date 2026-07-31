import jokerLogoImg from './assets/images/joker_logo_emblem_1785528890267.jpg';

export const ADMIN_PASSWORD = 'ROZ12026';
export const PERMANENT_CODE = '80E4D-8EA8F-7DF57-F891E';
export const PROMO_CODE = '2xee';

export const FALLBACK_SAFE_APPLE_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><radialGradient id='g' cx='35%' cy='35%' r='65%'><stop offset='0%' stop-color='%234ade80'/><stop offset='60%' stop-color='%2316a34a'/><stop offset='100%' stop-color='%2314532d'/></radialGradient></defs><path d='M50,20 C40,10 25,10 15,25 C5,40 10,70 30,90 C40,100 50,95 50,95 C50,95 60,100 70,90 C90,70 95,40 85,25 C75,10 60,10 50,20 Z' fill='url(%23g)'/><path d='M50,20 C52,12 58,5 65,2' stroke='%23854d0e' stroke-width='4' fill='none' stroke-linecap='round'/><path d='M55,12 C65,10 75,15 75,15 C75,15 70,25 58,22 Z' fill='%2322c55e'/></svg>";

export const FALLBACK_ROTTEN_APPLE_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><radialGradient id='rg' cx='35%' cy='35%' r='65%'><stop offset='0%' stop-color='%23f87171'/><stop offset='60%' stop-color='%23dc2626'/><stop offset='100%' stop-color='%23450a0a'/></radialGradient></defs><path d='M50,20 C40,10 25,10 15,25 C5,40 10,70 30,90 C40,100 50,95 50,95 C50,95 60,100 70,90 C90,70 95,40 85,25 C75,10 60,10 50,20 Z' fill='url(%23rg)' opacity='0.7'/><circle cx='40' cy='50' r='8' fill='%2318181b'/><circle cx='60' cy='65' r='6' fill='%2318181b'/><path d='M50,20 C52,12 58,5 65,2' stroke='%233f3f46' stroke-width='4' fill='none'/></svg>";

export const FALLBACK_JOKER_LOGO_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23180828'/><circle cx='50' cy='45' r='30' fill='%237c3aed' opacity='0.3'/><path d='M30,30 Q50,10 70,30 Q80,55 50,85 Q20,55 30,30' fill='%23dc2626'/><text x='50' y='92' font-family='serif' font-weight='bold' font-size='14' fill='%23f59e0b' text-anchor='middle'>JOKER</text></svg>";

export const SAFE_APPLE_IMG = 'https://b.top4top.io/p_36305byzd1.jpg';
export const ROTTEN_APPLE_IMG = 'https://c.top4top.io/p_3630bvfr81.jpg';
export const DEFAULT_APPLE_IMG = 'https://marwan.fun/marwan1.png';
export const JOKER_LOGO_IMG = jokerLogoImg || '/joker_logo.jpg';
export const LOGO_IMG = JOKER_LOGO_IMG;

export const ROW_CONFIG = [
  { multiplier: '349.68', safe: 1, rotten: 4, rowIndex: 9 },
  { multiplier: '69.93', safe: 2, rotten: 3, rowIndex: 8 },
  { multiplier: '27.92', safe: 2, rotten: 3, rowIndex: 7 },
  { multiplier: '11.18', safe: 3, rotten: 2, rowIndex: 6 },
  { multiplier: '6.71', safe: 3, rotten: 2, rowIndex: 5 },
  { multiplier: '4.02', safe: 3, rotten: 2, rowIndex: 4 },
  { multiplier: '2.41', safe: 4, rotten: 1, rowIndex: 3 },
  { multiplier: '1.93', safe: 4, rotten: 1, rowIndex: 2 },
  { multiplier: '1.54', safe: 4, rotten: 1, rowIndex: 1 },
  { multiplier: '1.23', safe: 4, rotten: 1, rowIndex: 0 }
];

export function generateStrongCode(length = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateRandomGrid() {
  const grid: Record<string, string> = {};
  for (let r = 0; r < ROW_CONFIG.length; r++) {
    const row = ROW_CONFIG[r];
    const total = row.safe + row.rotten; // 5 cells
    const safePositions: number[] = [];
    while (safePositions.length < row.safe) {
      const rand = Math.floor(Math.random() * total);
      if (!safePositions.includes(rand)) {
        safePositions.push(rand);
      }
    }
    for (let c = 0; c < total; c++) {
      const idx = row.rowIndex * 5 + c + 1;
      grid[`m${idx}`] = safePositions.includes(c) ? '1' : '0';
    }
  }
  return grid;
}
