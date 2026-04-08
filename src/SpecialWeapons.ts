import { FloatingText, Interception, Projectile, Team } from './types';

type PhysicsProjectile = Projectile & { fuel: number, thrustPower: number, launchSafeTimer: number };

export const applySpecialImpacts = (
  proj: Projectile, 
  teams: Team[], 
  texts: FloatingText[]
): { radius: number; damage: number; color: string } => {
  const type = proj.type;
  let effect = { radius: 75, damage: 45, color: '#ff4500' };

  switch (type) {
    case 'tweet_storm': effect = { radius: 110, damage: 30, color: '#1DA1F2' }; break;
    case 'trade_war': effect = { radius: 100, damage: 55, color: '#85bb65' }; break;
    case 'gas': effect = { radius: 140, damage: 20, color: '#32CD32' }; break;
    case 'frozen':
      effect = { radius: 90, damage: 15, color: '#00FFFF' };
      teams.forEach(t => t.members.forEach(m => {
        if (Math.hypot(m.x - proj.x, m.y - proj.y) < 100) m.frozenTurns = 2;
      }));
      break;
    case 'centrifuge': effect = { radius: 200, damage: 90, color: '#FFFF00' }; break;
    case 'supreme': effect = { radius: 120, damage: 65, color: '#ed1c24' }; break;
    case 'drone': effect = { radius: 95, damage: 50, color: '#ffffff' }; break;
    default: break;
  }
  return effect;
};

export const updateDrones = (
  projectiles: PhysicsProjectile[], 
  teams: Team[], 
  activeTeamIdx: number,
  interceptions: Interception[]
) => {
  projectiles.forEach((p, pIdx) => {
    if (p.type === 'drone') {
      const enemyTeams = teams.filter((_, i) => i !== activeTeamIdx);
      let closestEnemy: any = null;
      let minDist = 1500;
      enemyTeams.forEach(t => t.members.forEach(m => {
        if (m.hp > 0) {
          const d = Math.hypot(m.x - p.x, m.y - p.y);
          if (d < minDist) { minDist = d; closestEnemy = m; }
        }
      }));
      if (closestEnemy) {
        const angle = Math.atan2(closestEnemy.y - p.y, closestEnemy.x - p.x);
        p.vx += Math.cos(angle) * 0.4;
        p.vy += Math.sin(angle) * 0.4;
        const speed = Math.hypot(p.vx, p.vy);
        if (speed > 9) { p.vx *= (9/speed); p.vy *= (9/speed); }
      }
    }
  });
};