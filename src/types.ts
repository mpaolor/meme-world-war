export type WeaponType = 'standard' | 'tweet_storm' | 'trade_war' | 'supreme' | 'parade' | 'gas' | 'frozen' | 'centrifuge' | 'drone' | 'iron_dome' | 'cyber';

export interface Weapon {
  name: string; ammo: number; type: WeaponType;
}

export interface Member {
  x: number; y: number; vy: number;
  hp: number; radius: number; 
  onGround: boolean;
  weapons: Weapon[];
  frozenTurns: number;
  cyberLockedTurns: number;
  isIronDomeActive: boolean;
  ironDomeBattery: number;
  mood: 'default' | 'happy' | 'sad';
  moodTimer: number;
}

export interface Team {
  name: string; color: string; leader: string;
  members: Member[];
}

export interface Projectile {
  x: number; y: number; vx: number; vy: number;
  type: WeaponType; ownerIndex: number;
  isDrone?: boolean; target?: Member;
  isCyberStrike?: boolean;
}

export interface FloatingText { x: number; y: number; text: string; color: string; life: number; }
export interface Interception { x: number; y: number; life: number; }
export interface GasCloud { x: number; y: number; radius: number; life: number; damagePerFrame: number; }

// NEW: Visual Effect Interfaces
export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; color: string; size: number;
}

export interface Explosion {
  x: number; y: number; radius: number; maxRadius: number;
  color: string; life: number; type: string;
}