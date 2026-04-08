import { Explosion, FloatingText, Member, Projectile, Team, WeaponType } from './types';
import React, { useEffect, useRef, useState } from 'react';
import { applySpecialImpacts, updateDrones } from './SpecialWeapons';

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

const WEAPON_ICONS: Record<string, string> = { 'MISSILE': '🚀', 'TWEET STORM': '🐦', 'TRADE WAR': '💰', 'GAS': '🧪', 'FROZEN': '❄️', 'SUPREME': '🎖️', 'PARADE': '🚜', 'IRON DOME': '🛡️', 'CYBER': '💻', 'CENTRIFUGE': '☢️', 'DRONE': '🛸' };

const MAP_WIDTH = 2600; 
const MAP_HEIGHT = 800;
const WATER_LINE = 700;

export default function App() {
  const [gameState, setGameState] = useState<'MENU' | 'LOADING' | 'PLAYING' | 'OVER'>('MENU');
  const [activeTeamIdx, setActiveTeamIdx] = useState(0);
  const [activeMemberIdx, setActiveMemberIdx] = useState(0);
  const [currentWpn, setCurrentWpn] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tCanvasRef = useRef<HTMLCanvasElement>(null); 
  const terrainHeightMap = useRef<number[]>([]);
  
  const keys = useKeyboard();
  const frameId = useRef<number>(0);
  const teamsRef = useRef<Team[]>([]);
  
  const engine = useRef({
    projectiles: [] as Projectile[],
    floatingTexts: [] as FloatingText[],
    explosions: [] as Explosion[],
    charge: 0,
    isCharging: false,
    angle: -45,
    waterOffset: 0,
    scrollX: 0
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

    tCtx.strokeStyle = '#1b5e20';
    tCtx.lineWidth = 8;
    tCtx.beginPath();
    terrainHeightMap.current.forEach((y, x) => {
        if (x === 0) tCtx.moveTo(x, y);
        else tCtx.lineTo(x, y);
    });
    tCtx.stroke();
  };

  const startConflict = (selectedNames: string[], size: 'Small' | 'Medium' | 'Large') => {
    setGameState('LOADING');
    const hMap: number[] = new Array(MAP_WIDTH).fill(WATER_LINE);
    let currentY = 450;
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (x % 60 === 0) {
        currentY += (Math.random() - 0.5) * 180;
        currentY = Math.max(300, Math.min(WATER_LINE - 100, currentY));
      }
      hMap[x] = currentY;
    }
    terrainHeightMap.current = hMap;

    setTimeout(() => {
      redrawTerrainCanvas();
      const nats = NATIONS.filter(n => selectedNames.includes(n.name));
      const charsPerTeam = size === 'Small' ? 2 : size === 'Medium' ? 3 : 4;

      teamsRef.current = nats.map((n, tIdx) => ({
        ...n,
        members: Array.from({ length: charsPerTeam }).map((_, mIdx) => {
          const spawnX = Math.floor((MAP_WIDTH / nats.length) * tIdx + (mIdx * 160) + 300);
          return {
            x: spawnX, 
            y: terrainHeightMap.current[spawnX] - 50,
            vy: 0, hp: 100, radius: 25, onGround: false,
            frozenTurns: 0, cyberLockedTurns: 0, isIronDomeActive: false, ironDomeBattery: 0,
            mood: 'default' as const, moodTimer: 0,
            weapons: [
              { name: 'MISSILE', ammo: Infinity, type: 'standard' as WeaponType },
              { name: n.specials[0].replace('_', ' ').toUpperCase(), ammo: 1, type: n.specials[0] as WeaponType },
              { name: n.specials[1].replace('_', ' ').toUpperCase(), ammo: 1, type: n.specials[1] as WeaponType }
            ]
          };
        })
      }));
      setGameState('PLAYING');
    }, 1000);
  };

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const e = engine.current;
      const teams = teamsRef.current;
      const activeM = teams[activeTeamIdx]?.members[activeMemberIdx];

      if (activeM) {
        const target = activeM.x - window.innerWidth / 2;
        e.scrollX += (target - e.scrollX) * 0.05;
        e.scrollX = Math.max(0, Math.min(MAP_WIDTH - window.innerWidth, e.scrollX));
      }

      teams.forEach(t => t.members.forEach(mem => {
        if (mem.hp <= 0) return;
        mem.vy += 0.25; 
        mem.y += mem.vy;
        const groundY = terrainHeightMap.current[Math.floor(mem.x)] || WATER_LINE;
        if (mem.y + mem.radius > groundY) {
          mem.y = groundY - mem.radius; mem.vy = 0; mem.onGround = true;
        } else { mem.onGround = false; }
        if (mem.y > WATER_LINE) mem.hp -= 0.5;
      }));

      e.projectiles.forEach((p, i) => {
        p.vy += 0.2; p.x += p.vx; p.y += p.vy;
        const groundY = terrainHeightMap.current[Math.floor(p.x)] || WATER_LINE;
        if (p.y > groundY || p.y > WATER_LINE + 50 || p.x < 0 || p.x > MAP_WIDTH) {
          if (p.y <= WATER_LINE + 50) explode(p.x, p.y, p);
          e.projectiles.splice(i, 1);
          if (e.projectiles.length === 0) endTurn();
        }
      });

      e.explosions = e.explosions.filter(ex => ex.life > 0);

      if (activeM && e.projectiles.length === 0 && activeM.hp > 0) {
        if (keys.current['KeyA']) activeM.x = Math.max(20, activeM.x - 3);
        if (keys.current['KeyD']) activeM.x = Math.min(MAP_WIDTH - 20, activeM.x + 3);
        if (keys.current['KeyW'] && activeM.onGround) { activeM.vy = -8; activeM.onGround = false; }
        if (keys.current['ArrowUp']) e.angle -= 2;
        if (keys.current['ArrowDown']) e.angle += 2;
        if (keys.current['Digit1']) setCurrentWpn(0);
        if (keys.current['Digit2']) setCurrentWpn(1);
        if (keys.current['Digit3']) setCurrentWpn(2);
        if (keys.current['Space']) { e.isCharging = true; e.charge = Math.min(e.charge + 2, 100); }
        else if (e.isCharging) fire(activeM);
      }

      updateDrones(e.projectiles, teams, activeTeamIdx);
      draw(ctx);
      frameId.current = requestAnimationFrame(loop);
    };

    const fire = (m: Member) => {
      const e = engine.current;
      const wpn = m.weapons[currentWpn];
      if (!wpn || wpn.ammo <= 0) return;
      const rad = e.angle * Math.PI / 180;
      const p = e.charge / 4;
      e.projectiles.push({ x: m.x, y: m.y - 20, vx: Math.cos(rad) * p, vy: Math.sin(rad) * p, type: wpn.type, ownerIndex: activeTeamIdx });
      if (wpn.ammo !== Infinity) wpn.ammo--;
      e.isCharging = false; e.charge = 0;
    };

    const explode = (x: number, y: number, proj: Projectile) => {
      const e = engine.current;
      const effect = applySpecialImpacts(proj, teamsRef.current, e.floatingTexts);
      const r = Math.floor(effect.radius);
      for (let i = Math.floor(x - r); i < x + r; i++) {
        if (i >= 0 && i < MAP_WIDTH) {
          const dist = Math.abs(i - x);
          const depth = Math.sqrt(Math.max(0, r * r - dist * dist));
          terrainHeightMap.current[i] += depth * 0.5;
        }
      }
      redrawTerrainCanvas();
      e.explosions.push({ x, y, radius: 5, maxRadius: effect.radius, color: effect.color, life: 30, type: proj.type });
      teamsRef.current.forEach(t => t.members.forEach(mem => {
        const d = Math.hypot(mem.x - x, mem.y - y);
        if (d < effect.radius + mem.radius) mem.hp -= Math.round(effect.damage * (1 - d/effect.radius));
      }));
    };

    const endTurn = () => {
      setActiveTeamIdx(p => (p + 1) % teamsRef.current.length);
      setCurrentWpn(0);
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      const e = engine.current;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      
      // WORLD DRAWING
      ctx.save();
      ctx.translate(-e.scrollX, 0);
      ctx.fillStyle = '#020617'; ctx.fillRect(e.scrollX, 0, ctx.canvas.width, MAP_HEIGHT);
      if (tCanvasRef.current) ctx.drawImage(tCanvasRef.current, 0, 0);

      e.waterOffset += 0.05;
      ctx.fillStyle = "rgba(30, 80, 220, 0.4)";
      ctx.beginPath(); ctx.moveTo(0, WATER_LINE);
      for (let x = 0; x <= MAP_WIDTH; x += 100) ctx.lineTo(x, WATER_LINE + Math.sin(x*0.02 + e.waterOffset)*10);
      ctx.lineTo(MAP_WIDTH, MAP_HEIGHT); ctx.lineTo(0, MAP_HEIGHT); ctx.fill();

      // Projectiles (Missiles)
      e.projectiles.forEach(p => {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
        // Simple trail
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx*2, p.y - p.vy*2); ctx.stroke();
      });

      teamsRef.current.forEach((t, ti) => t.members.forEach((m, mi) => {
        if (m.hp <= 0) return;
        const isActive = ti === activeTeamIdx && mi === activeMemberIdx;
        drawLeader(ctx, m, t.leader, t.color, isActive);
        
        ctx.fillStyle = 'black'; ctx.fillRect(m.x - 20, m.y - 60, 40, 4);
        ctx.fillStyle = m.hp > 30 ? '#22c55e' : '#ef4444'; ctx.fillRect(m.x - 20, m.y - 60, (m.hp/100)*40, 4);

        if (isActive && e.projectiles.length === 0) {
          ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath();
          const rad = e.angle * Math.PI / 180;
          ctx.moveTo(m.x, m.y - 20); ctx.lineTo(m.x + Math.cos(rad)*120, (m.y-20) + Math.sin(rad)*120);
          ctx.stroke(); ctx.setLineDash([]);
          
          if (e.isCharging) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(m.x - 25, m.y - 80, 50, 6);
            ctx.fillStyle = '#f97316'; ctx.fillRect(m.x - 25, m.y - 80, (e.charge/100)*50, 6);
          }
        }
      }));

      e.explosions.forEach(ex => {
        ctx.fillStyle = ex.color; ctx.globalAlpha = ex.life/30;
        ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.maxRadius * (1 - ex.life/30), 0, 7); ctx.fill();
        ctx.globalAlpha = 1; ex.life--;
      });
      ctx.restore();

      // HUD DRAWING (Outside of save/restore to stay fixed on screen)
      const team = teamsRef.current[activeTeamIdx];
      if (team) {
        // Background box
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = team.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(20, 20, 260, 110, 8);
        ctx.fill();
        ctx.stroke();

        // Team info
        ctx.fillStyle = team.color;
        ctx.font = "bold 18px Courier New";
        ctx.fillText(team.leader.toUpperCase(), 40, 45);

        // Weapons
        const member = team.members[activeMemberIdx];
        member?.weapons.forEach((w, i) => {
          ctx.fillStyle = currentWpn === i ? '#fde047' : '#94a3b8';
          ctx.font = "14px Courier New";
          const ammoText = w.ammo === Infinity ? '∞' : w.ammo;
          ctx.fillText(`${i+1} ${WEAPON_ICONS[w.name] || '•'} ${w.name} [${ammoText}]`, 40, 75 + i*18);
        });
      }
    };

    frameId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId.current);
  }, [gameState, activeTeamIdx, activeMemberIdx, currentWpn]);

  if (gameState === 'MENU') return <MainMenu onStart={startConflict} />;
  
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} />
      <canvas ref={tCanvasRef} width={MAP_WIDTH} height={MAP_HEIGHT} style={{ display: 'none' }} />
    </div>
  );
}