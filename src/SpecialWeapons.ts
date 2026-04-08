import { FloatingText, Interception, Member, Projectile, Team } from './types';

export const updateDrones = (projectiles: Projectile[], teams: Team[], activeTeamIdx: number) => {
  const TURN_SPEED = 0.08;
  const SPEED = 4;
  
  projectiles.forEach(p => {
    if (p.type !== 'drone') return;
    let nearestEnemy: Member | null = null;
    let minDist = Infinity;

    teams.forEach((team, tIdx) => {
      if (tIdx === p.ownerIndex) return;
      team.members.forEach(m => {
        if (m.hp <= 0) return;
        const d = Math.hypot(m.x - p.x, m.y - p.y);
        if (d < minDist) { minDist = d; nearestEnemy = m; }
      });
    });

    if (nearestEnemy) {
      const target: Member = nearestEnemy;
      const targetAngle = Math.atan2(target.y - p.y, target.x - p.x);
      const currentAngle = Math.atan2(p.vy, p.vx);
      const newAngle = currentAngle + (targetAngle - currentAngle) * TURN_SPEED;
      p.vx = Math.cos(newAngle) * SPEED;
      p.vy = Math.sin(newAngle) * SPEED;
    }
  });
};

// NEW: Added color identifiers to differentiate the blast visuals
export const applySpecialImpacts = (p: Projectile, teams: Team[], texts: FloatingText[]) => {
  const x = p.x; const y = p.y;

  if (p.type === 'supreme') {
    return { radius: 120, damage: 60, color: '#FF4500' }; // Massive Orange Nuke
  }

  if (p.type === 'parade') {
    teams.forEach(t => t.members.forEach(m => {
      if (Math.abs(m.x - x) < 150) {
        m.vy += 12; // Massive downward shockwave
        texts.push({x: m.x, y: m.y - 50, text: "STOMPED!", color: "#8B4513", life: 40});
      }
    }));
    return { radius: 60, damage: 40, color: '#8B4513' }; // Brown Shockwave
  }

  if (p.type === 'drone') {
    return { radius: 45, damage: 30, color: '#FFD700' }; // Yellow/Electric
  }

  if (p.type === 'centrifuge') {
    return { radius: 80, damage: 50, color: '#32CD32' }; // Toxic Green
  }
  
  if (p.type === 'gas') {
    return { radius: 40, damage: 15, color: '#2E8B57' }; // Spawns cloud in App.tsx
  }

  if (p.type === 'frozen') {
    return { radius: 60, damage: 20, color: '#00FFFF' }; // Cyan Freeze
  }

  return { radius: 50, damage: 35, color: '#FFA500' }; // Default Orange Standard
};

export const processIronDome = (m: Member, projectiles: Projectile[], interceptions: Interception[]) => {
  if (!m.isIronDomeActive || m.ironDomeBattery <= 0) return;
  const DOME_RADIUS = 150;
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (p.ownerIndex === -1) continue;
    if (Math.hypot(p.x - m.x, p.y - m.y) < DOME_RADIUS) {
      interceptions.push({ x: p.x, y: p.y, life: 25 });
      projectiles.splice(i, 1);
      m.ironDomeBattery--;
      if (m.ironDomeBattery <= 0) m.isIronDomeActive = false;
    }
  }
};

export const drawSpecialVisuals = (ctx: CanvasRenderingContext2D, m: Member) => {
  if (m.isIronDomeActive) {
    ctx.save(); ctx.beginPath(); ctx.arc(m.x, m.y, 150, 0, Math.PI * 2);
    ctx.strokeStyle = 'cyan'; ctx.setLineDash([5, 15]); ctx.stroke(); ctx.restore();
  }
};