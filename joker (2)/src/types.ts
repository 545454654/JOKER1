export type ViewState = 'splash' | 'login' | 'loading_overlay' | 'game' | 'admin' | 'timeout';

export interface RowConfig {
  multiplier: string;
  safe: number;
  rotten: number;
  rowIndex: number;
}

export interface AppleCellState {
  isSafe: boolean;
  revealed: boolean;
}

export interface UserCodeData {
  code: string;
  minutes: number;
  forever: boolean;
  createdAt: number;
  isBanned?: boolean;
}

export type CodeUnit = 'minutes' | 'hours' | 'days' | 'forever';
