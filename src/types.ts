export type WeaponType = 
  | 'standard' 
  | 'tweet_storm' 
  | 'trade_war' 
  | 'gas' 
  | 'frozen' 
  | 'supreme' 
  | 'parade' 
  | 'iron_dome' 
  | 'cyber' 
  | 'centrifuge' 
  | 'drone';

export interface Weapon {
  name: string;
  ammo: number;
  type: WeaponType;
}

export interface Member {
  x: number;
  y: number;
  vy: number;
  hp: number;
  radius: number;
  onGround: boolean;
  frozenTurns: number;
  cyberLockedTurns: number;
  isIronDomeActive: boolean;
  ironDomeBattery: number;
  mood: 'default' | 'happy' | 'angry' | 'dead';
  moodTimer: number;
  weapons: Weapon[];
}

export interface Team {
  name: string;
  color: string;
  leader: string;
  specials: string[];
  members: Member[];
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: WeaponType;
  ownerIndex: number;
  targetX?: number;
  targetY?: number;
}

export interface Explosion {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
  type: WeaponType;
}

/**
 * FIXED: Added 'life' property to handle animation 
 * and cleanup of interception events.
 */
export interface Interception {
  x: number;
  y: number;
  projectileIndex: number;
  type: 'iron_dome' | 'drone_strike';
  life: number; 
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}