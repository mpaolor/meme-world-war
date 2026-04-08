import type { Explosion, FloatingText, Interception, Member, Projectile, Team, WeaponType } from './types';
import { applySpecialImpacts, updateDrones } from './SpecialWeapons';
import { useEffect, useRef, useState } from 'react';

import { MainMenu } from './MainMenu';
import { drawLeader } from './gameLogic';
import { useKeyboard } from './useKeyboard';

const NATIONS = [
  { name: 'USA', color: '#3c3b6e', leader: 'Trump', specials: ['tweet_storm', 'trade_war'] },
  { name: 'Russia', color: '#ffffff', leader: 'Putin', specials: ['gas', 'frozen'] },
  { name: 'N. Korea', color: '#ed1c24', leader: 'Kim', specials: ['supreme', 'parade'] },
  { name: 'Israel', color: '#0038b8', leader: 'Netanyahu', specials: ['iron_dome', 'cyber'] },
  { name: 'Iran', color: '#239e46', leader: 'Khamenei', specials: ['centrifuge', 'drone'] }
];

const WEAPON_ICONS: Record<string, string> = { 
  'standard': '🚀', 'tweet_storm': '🐦', 'trade_war': '💰', 'gas': '🧪', 
  'frozen': '❄️', 'supreme': '🎖️', 'parade': '🚜', 'iron_dome': '🛡️', 
  'cyber': '💻', 'centrifuge': '☢️', 'drone': '🛸' 
};

const MAP_WIDTH = 3000; 
const MAP_HEIGHT = 800;
const WATER_LINE = 720;

export default function App() {
  const [gameState, setGameState] = useState<'MENU' | 'LOADING' | 'PLAYING' | 'OVER'>('MENU');
  const [winner, setWinner] = useState<string | null>(null);
  const [activeTeamIdx, setActiveTeamIdx] = useState(0);
  const [activeMemberIdx, setActiveMemberIdx] = useState(0);
  const [currentWpn, setCurrentWpn] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tCanvasRef = useRef<HTMLCanvasElement>(null); 
  const terrainHeightMap = useRef<number[]>([]);
  
  const isManualScroll = useRef(false);
  const scrollVelocity = useRef(0);
  
  const keys = useKeyboard();
  const frameId = useRef<number>(0);
  const teamsRef = useRef<any[]>([]); 
  const teamMemberCounters = useRef<number[]>([]);
  
  const engine = useRef({
    projectiles: [] as (Projectile & { fuel: number, thrustPower: number, launchSafeTimer: number })[],
    floatingTexts: [] as FloatingText[],
    explosions: [] as Explosion[],
    interceptions: [] as Interception[],
    charge: 0,
    isCharging: false,
    angle: -45,
    waterOffset: 0,
    scrollX: 0,
    lastImpactPos: null as { x: number } | null,
    isWaitingForExplosion: false
  });

  const redrawTerrainCanvas = () => {
    const tCanvas = tCanvasRef.current;
    if (!tCanvas) return;
    const tCtx = tCanvas.getContext('2d');
    if (!tCtx) return;
    tCtx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    tCtx.fillStyle = '#4b2e2a';
    tCtx.beginPath();
    tCtx.moveTo(0, MAP_HEIGHT);
    terrainHeightMap.current.forEach((y, x) => tCtx.lineTo(x, y));
    tCtx.lineTo(MAP_WIDTH, MAP_HEIGHT);
    tCtx.fill();
    tCtx.strokeStyle = '#1b5e20'; tCtx.lineWidth = 10;
    tCtx.beginPath();
    terrainHeightMap.current.forEach((y, x) => { if (x === 0) tCtx.moveTo(x, y); else tCtx.lineTo(x, y); });
    tCtx.stroke();
  };

  const moveToNextPlayer = () => {
    const e = engine.current;
    e.isCharging = false;
    e.charge = 0;
    
    const aliveTeams = teamsRef.current.filter(t => t.members.some((m: Member) => m.hp > 0));
    
    if (aliveTeams.length <= 1) {
      setWinner(aliveTeams.length === 1 ? aliveTeams[0].name : "No one (Mutual Annihilation)");
      setGameState('OVER');
      return;
    }

    const totalTeams = teamsRef.current.length;
    let found = false;
    teamMemberCounters.current[activeTeamIdx] = (teamMemberCounters.current[activeTeamIdx] + 1) % teamsRef.current[activeTeamIdx].members.length;

    for (let i = 1; i <= totalTeams; i++) {
      const nextTIdx = (activeTeamIdx + i) % totalTeams;
      const team = teamsRef.current[nextTIdx];
      let startMIdx = teamMemberCounters.current[nextTIdx];
      for (let m = 0; m < team.members.length; m++) {
        const checkMIdx = (startMIdx + m) % team.members.length;
        if (team.members[checkMIdx].hp > 0) {
          setActiveTeamIdx(nextTIdx);
          setActiveMemberIdx(checkMIdx);
          teamMemberCounters.current[nextTIdx] = checkMIdx;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (found) {
      setCurrentWpn(0);
      isManualScroll.current = false;
    } else {
      setGameState('OVER');
    }
  };

  const startConflict = (selectedNames: string[], size: 'Small' | 'Medium' | 'Large') => {
    setGameState('LOADING');
    setWinner(null);
    const hMap: number[] = new Array(MAP_WIDTH).fill(WATER_LINE);
    let currentY = 450;
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (x % 50 === 0) { currentY += (Math.random() - 0.5) * 200; currentY = Math.max(250, Math.min(WATER_LINE - 120, currentY)); }
      hMap[x] = currentY;
    }
    terrainHeightMap.current = hMap;

    setTimeout(() => {
      redrawTerrainCanvas();
      const nats = NATIONS.filter(n => selectedNames.includes(n.name));
      const charsPerTeam = size === 'Small' ? 2 : size === 'Medium' ? 3 : 4;
      
      teamsRef.current = nats.map((n) => ({
        ...n,
        teamAmmo: [
          { name: 'BAZOOKA', ammo: Infinity, type: 'standard' as WeaponType },
          { name: n.specials[0].replace('_', ' ').toUpperCase(), ammo: 1, type: n.specials[0] as WeaponType },
          { name: n.specials[1].replace('_', ' ').toUpperCase(), ammo: 1, type: n.specials[1] as WeaponType }
        ],
        members: Array.from({ length: charsPerTeam }).map(() => {
          const spawnX = Math.floor(Math.random() * (MAP_WIDTH - 400) + 200);
          return {
            x: spawnX, y: terrainHeightMap.current[spawnX] - 60,
            vy: 0, hp: 100, radius: 25, onGround: false, frozenTurns: 0, cyberLockedTurns: 0,
            isIronDomeActive: false, ironDomeBattery: 0, mood: 'default', moodTimer: 0
          };
        })
      }));

      teamMemberCounters.current = new Array(nats.length).fill(0);
      setActiveTeamIdx(0);
      setActiveMemberIdx(0);
      setGameState('PLAYING');
    }, 1200);
  };

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const e = engine.current;
      const teams = teamsRef.current;
      const activeM = teams[activeTeamIdx]?.members[activeMemberIdx];

      if (activeM && activeM.hp <= 0 && e.projectiles.length === 0 && e.explosions.length === 0) {
        moveToNextPlayer();
        return;
      }

      // --- PHYSICS & MOOD UPDATES ---
      teams.forEach(t => t.members.forEach((mem: Member) => {
        if (mem.hp <= 0) return;

        // Mood cooldown logic
        if (mem.moodTimer > 0) {
          mem.moodTimer--;
          if (mem.moodTimer <= 0) mem.mood = 'default';
        }

        mem.vy += 0.25; 
        mem.y += mem.vy;
        const groundY = terrainHeightMap.current[Math.floor(mem.x)] || WATER_LINE;
        if (mem.y + mem.radius > groundY) { 
          mem.y = groundY - mem.radius; 
          mem.vy = 0; 
          mem.onGround = true; 
        } else { mem.onGround = false; }

        if (mem === activeM && e.projectiles.length === 0 && e.explosions.length === 0) {
            let nextX = mem.x;
            if (keys.current['KeyA']) nextX -= 3.5;
            if (keys.current['KeyD']) nextX += 3.5;
            const nextGroundY = terrainHeightMap.current[Math.floor(nextX)] || WATER_LINE;
            if (nextGroundY >= mem.y + mem.radius - 15) {
                mem.x = Math.max(20, Math.min(MAP_WIDTH - 20, nextX));
            }
            if (keys.current['KeyW'] && mem.onGround) { mem.vy = -8.5; mem.onGround = false; }
        }
        if (mem.y > WATER_LINE) mem.hp -= 1.0;
      }));

      // --- CAMERA ---
      let targetX = e.scrollX;
      if (e.projectiles.length > 0) {
        targetX = e.projectiles[0].x - window.innerWidth / 2;
        isManualScroll.current = false;
        e.lastImpactPos = { x: e.projectiles[0].x };
      } else if (e.explosions.length > 0 && e.lastImpactPos) {
        targetX = e.lastImpactPos.x - window.innerWidth / 2;
      } else if (activeM) {
        const left = keys.current['ArrowLeft'];
        const right = keys.current['ArrowRight'];
        if (left || right) {
          isManualScroll.current = true;
          scrollVelocity.current = Math.min(scrollVelocity.current + 1.5, 40);
          e.scrollX += right ? scrollVelocity.current : -scrollVelocity.current;
          targetX = e.scrollX;
        } else if (!isManualScroll.current) {
          targetX = activeM.x - window.innerWidth / 2;
        }
      }
      e.scrollX += (targetX - e.scrollX) * (e.projectiles.length > 0 ? 0.15 : 0.08);
      e.scrollX = Math.max(0, Math.min(MAP_WIDTH - window.innerWidth, e.scrollX));

      // --- PROJECTILES ---
      e.projectiles.forEach((p, i) => {
        if (p.fuel > 0) {
            const speed = Math.hypot(p.vx, p.vy);
            p.vx += (p.vx / speed) * p.thrustPower; 
            p.vy += (p.vy / speed) * p.thrustPower;
            p.fuel--;
        }
        p.vy += 0.35; p.x += p.vx; p.y += p.vy;
        if (p.launchSafeTimer > 0) p.launchSafeTimer--;

        if (p.launchSafeTimer === 0) {
            teams.forEach(t => t.members.forEach((mem: Member) => {
              if (mem.hp > 0 && Math.hypot(p.x - mem.x, p.y - mem.y) < mem.radius) {
                explode(p.x, p.y, p);
                e.projectiles.splice(i, 1);
              }
            }));
        }
        const groundY = terrainHeightMap.current[Math.floor(p.x)] || WATER_LINE;
        if (p.y > groundY || p.y > WATER_LINE + 50 || p.x < 0 || p.x > MAP_WIDTH) {
          if (p.y <= WATER_LINE + 100) explode(p.x, p.y, p);
          e.projectiles.splice(i, 1);
        }
      });

      if (e.isWaitingForExplosion && e.projectiles.length === 0 && e.explosions.length === 0) {
          e.isWaitingForExplosion = false;
          e.lastImpactPos = null;
          moveToNextPlayer();
      }

      if (activeM && e.projectiles.length === 0 && e.explosions.length === 0 && activeM.hp > 0) {
        if (keys.current['ArrowUp']) e.angle -= 2;
        if (keys.current['ArrowDown']) e.angle += 2;
        const teamAmmo = teams[activeTeamIdx].teamAmmo;
        const trySelect = (idx: number) => { if (teamAmmo[idx]?.ammo > 0) setCurrentWpn(idx); };
        if (keys.current['Digit1']) trySelect(0);
        if (keys.current['Digit2']) trySelect(1);
        if (keys.current['Digit3']) trySelect(2);
        
        if (keys.current['Space']) { 
          e.isCharging = true; 
          e.charge = Math.min(e.charge + 2.0, 100); 
        } else if (e.isCharging) {
          fire(activeM);
        }
      }

      e.floatingTexts.forEach((ft, i) => { ft.life--; ft.y -= 1; if (ft.life <= 0) e.floatingTexts.splice(i, 1); });
      e.explosions.forEach((ex, i) => { ex.life--; if (ex.life <= 0) e.explosions.splice(i, 1); });

      updateDrones(e.projectiles, teams, activeTeamIdx, e.interceptions);
      draw(ctx);
      frameId.current = requestAnimationFrame(loop);
    };

    const fire = (m: Member) => {
      const e = engine.current;
      const team = teamsRef.current[activeTeamIdx];
      const wpn = team.teamAmmo[currentWpn];

      // Set happy mood for firing
      m.mood = 'happy';
      m.moodTimer = 120; 

      const rad = e.angle * Math.PI / 180;
      const ratio = e.charge / 100;
      
      e.projectiles.push({ 
        x: m.x, y: m.y - m.radius - 10, 
        vx: Math.cos(rad) * (2 + ratio * 12), vy: Math.sin(rad) * (2 + ratio * 12), 
        type: wpn.type, ownerIndex: activeTeamIdx, 
        fuel: ratio > 0.1 ? 15 : 0, thrustPower: ratio * 0.8,
        launchSafeTimer: 8 
      });
      
      if (wpn.ammo !== Infinity) wpn.ammo--;
      e.isCharging = false; 
      e.charge = 0;
      e.isWaitingForExplosion = true;
    };

    const explode = (x: number, y: number, proj: Projectile) => {
      const e = engine.current;
      const effect = applySpecialImpacts(proj, teamsRef.current, e.floatingTexts);
      
      teamsRef.current.forEach(t => t.members.forEach((mem: Member) => {
        if (mem.hp <= 0) return;
        const d = Math.hypot(mem.x - x, mem.y - (mem.y - mem.radius/2));
        if (d < effect.radius + mem.radius) {
          const damageMult = 1 - (d / (effect.radius + mem.radius));
          const dmg = Math.max(0, Math.round(effect.damage * damageMult));
          
          mem.hp -= dmg; 
          mem.vy -= 4 * damageMult; 

          // Set sad mood when hit
          if (dmg > 5) {
            mem.mood = 'sad';
            mem.moodTimer = 180;
          }

          if (dmg > 0) e.floatingTexts.push({ x: mem.x, y: mem.y - 40, text: `-${dmg}`, life: 60, color: '#ff4b4b' });
        }
      }));
      const r = Math.floor(effect.radius);
      for (let i = Math.floor(x - r); i < x + r; i++) {
        if (i >= 0 && i < MAP_WIDTH) {
            const dist = Math.abs(i - x);
            const depth = Math.sqrt(Math.max(0, r * r - dist * dist));
            terrainHeightMap.current[i] += depth * 0.5;
        }
      }
      redrawTerrainCanvas();
      e.explosions.push({ x, y, radius: 5, maxRadius: effect.radius, color: effect.color, life: 35, type: proj.type });
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      const e = engine.current;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.save(); ctx.translate(-e.scrollX, 0);
      ctx.fillStyle = '#020617'; ctx.fillRect(e.scrollX, 0, ctx.canvas.width, MAP_HEIGHT);
      if (tCanvasRef.current) ctx.drawImage(tCanvasRef.current, 0, 0);
      e.waterOffset += 0.05; ctx.fillStyle = "rgba(30, 80, 220, 0.4)";
      ctx.beginPath(); ctx.moveTo(0, WATER_LINE);
      for (let x = 0; x <= MAP_WIDTH; x += 100) ctx.lineTo(x, WATER_LINE + Math.sin(x*0.02 + e.waterOffset)*10);
      ctx.lineTo(MAP_WIDTH, MAP_HEIGHT); ctx.lineTo(0, MAP_HEIGHT); ctx.fill();

      e.projectiles.forEach(p => {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
        if (p.type === 'standard') {
            ctx.fillStyle = '#4b5563'; ctx.fillRect(-12, -3, 20, 6);
            ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(6, -3); ctx.lineTo(14, 0); ctx.lineTo(6, 3); ctx.fill();
        } else {
            ctx.font = "28px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(WEAPON_ICONS[p.type] || '🚀', 0, 0);
        }
        ctx.restore();
      });
      
      teamsRef.current.forEach((t, ti) => t.members.forEach((m: Member, mi: number) => {
        if (m.hp <= 0) return;
        const isActive = ti === activeTeamIdx && mi === activeMemberIdx;
        drawLeader(ctx, m, t.leader, t.color, isActive);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(m.x - 20, m.y - 55, 40, 5);
        ctx.fillStyle = m.hp > 50 ? '#22c55e' : (m.hp > 25 ? '#eab308' : '#ef4444');
        ctx.fillRect(m.x - 20, m.y - 55, (Math.max(0, m.hp)/100)*40, 5);

        if (isActive && e.projectiles.length === 0 && e.explosions.length === 0) {
          ctx.setLineDash([8, 8]); ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'; ctx.lineWidth = 4; ctx.beginPath();
          const rad = e.angle * Math.PI / 180;
          ctx.moveTo(m.x, m.y - m.radius - 10); ctx.lineTo(m.x + Math.cos(rad)*150, (m.y-m.radius-10) + Math.sin(rad)*150);
          ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
          if (e.isCharging) { 
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(m.x - 30, m.y - 110, 60, 12);
            ctx.fillStyle = '#f97316'; ctx.fillRect(m.x - 30, m.y - 110, (e.charge/100)*60, 12); 
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(m.x - 30, m.y - 110, 60, 12);
          }
        }
      }));

      e.explosions.forEach(ex => { ctx.fillStyle = ex.color; ctx.globalAlpha = ex.life/35; ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.maxRadius * (1 - ex.life/35), 0, 7); ctx.fill(); ctx.globalAlpha = 1; });
      e.floatingTexts.forEach(ft => { ctx.fillStyle = ft.color; ctx.font = "bold 20px Arial"; ctx.fillText(ft.text, ft.x, ft.y); });
      ctx.restore();

      const team = teamsRef.current[activeTeamIdx];
      if (team && gameState === 'PLAYING') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'; ctx.beginPath(); ctx.roundRect(20, 20, 260, 110, 8); ctx.fill();
        ctx.fillStyle = team.color; ctx.font = "bold 18px Courier New"; ctx.fillText(team.leader.toUpperCase(), 40, 45);
        team.teamAmmo.forEach((w: any, i: number) => {
          ctx.fillStyle = w.ammo > 0 ? (currentWpn === i ? '#fde047' : '#94a3b8') : '#475569';
          ctx.fillText(`${i+1} ${WEAPON_ICONS[w.type] || '•'} ${w.name} [${w.ammo === Infinity ? '∞' : w.ammo}]`, 45, 75 + i*18);
        });
      }
    };

    frameId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId.current);
  }, [gameState, activeTeamIdx, activeMemberIdx, currentWpn]);

  if (gameState === 'MENU') return <MainMenu onStart={startConflict} />;
  
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000', position: 'relative' }}>
      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} />
      <canvas ref={tCanvasRef} width={MAP_WIDTH} height={MAP_HEIGHT} style={{ display: 'none' }} />
      
      {gameState === 'OVER' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 100
        }}>
          <h1 style={{ fontSize: '4rem', marginBottom: '20px' }}>GAME OVER</h1>
          <h2 style={{ fontSize: '2rem', color: '#fde047' }}>WINNER: {winner}</h2>
          <button 
            onClick={() => setGameState('MENU')}
            style={{ 
              marginTop: '30px', padding: '15px 40px', fontSize: '1.5rem', 
              cursor: 'pointer', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '8px' 
            }}
          >
            RETURN TO MENU
          </button>
        </div>
      )}
    </div>
  );
}