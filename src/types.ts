export interface Point {
  x: number;
  y: number;
}

export interface Entity extends Point {
  id: string;
}

export interface Rocket extends Entity {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  angle: number;
  exhaust: { x: number; y: number; opacity: number }[];
  hoverTimer?: number;
  driftX?: number;
}

export interface Missile extends Entity {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  batteryIndex: number;
}

export interface Explosion extends Entity {
  radius: number;
  maxRadius: number;
  expanding: boolean;
  kills: number;
  type?: 'POOP' | 'FIREWORK' | 'IMPACT';
  color?: string;
  particles?: { x: number; y: number; vx: number; vy: number; life: number; color: string }[];
}

export interface City extends Entity {
  active: boolean;
}

export interface Battery extends Entity {
  active: boolean;
  ammo: number;
  maxAmmo: number;
  throwingTimer: number; // For animation
  lastTargetAngle: number; // For directional throwing
}

export type GameStatus = 'START' | 'PLAYING' | 'WON' | 'LOST';

export interface GameState {
  score: number;
  status: GameStatus;
  level: number;
  language: 'zh' | 'en';
}
