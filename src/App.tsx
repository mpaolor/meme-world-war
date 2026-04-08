import { Explosion, FloatingText, GasCloud, Interception, Member, Particle, Projectile, Team, WeaponType } from './types';
import { GRAVITY, WATER_LEVEL, checkTerrain, checkWall, drawLeader } from './gameLogic';
import React, { useEffect, useRef, useState } from 'react';
import { applySpecialImpacts, drawSpecialVisuals, updateDrones } from './SpecialWeapons';

import { useKeyboard } from './useKeyboard';

const NATIONS = [
  { name: 'USA', color: '#3c3b6e', leader: 'Trump', specials: ['tweet_storm', 'trade_war'] },
  { name: 'Russia', color: '#ffffff', leader: 'Putin', specials: ['gas', 'frozen'] },
  { name: 'N. Korea', color: '#ed1c24', leader: 'Kim', specials: ['supreme', 'parade'] },
  { name: 'Israel', color: '#0038b8', leader: 'Netanyahu', specials: ['iron_dome', 'cyber'] },
  { name: 'Iran', color: '#239e46', leader: 'Khamenei', specials: ['centrifuge', 'drone'] }
];

type MapSize = 'Small' | 'Medium' | 'Large';

export default function App() {
  const [gameState, setGameState] = useState<'SELECT_TEAM' | 'PLAYING'>('SELECT_TEAM');
  const [selectedNations, setSelectedNations] = useState<string[]>([]);
  const [mapSize, setMapSize] = useState<MapSize>('Small');
  const [activeTeamIdx, setActiveTeamIdx] = useState(0);
  const [activeMemberIdx, setActiveMemberIdx] = useState(0);
  const [currentWpn, setCurrentWpn] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tCanvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useKeyboard();
  const frameId = useRef<number>(0);
  const frameCount = useRef(0);
  
  const teamsRef = useRef<Team[]>([]);
  
  const engine = useRef({
    projectiles: [] as Projectile[],
    floatingTexts: [] as FloatingText[],
    particles: [] as Particle[],
    explosions: [] as Explosion[],
    gasClouds: [] as GasCloud[],
    charge: 0,
    isCharging: false,
    angle: -45,
    waterOffset: 0,
    turnDelay: 0
  });

  const initGame = () => {
    const charsPerTeam = mapSize === 'Small' ? 2 : mapSize === 'Medium' ? 3 : 4;
    const initialTeams: Team[] = NATIONS.filter(n => selectedNations.includes(n.name)).map((n, tIdx) => ({
      ...n,
      members: Array.from({ length: charsPerTeam }).map((_, mIdx) => ({
        x: 100 + (tIdx * 450) + (mIdx * 80),
        y: 50, vy: 0, hp: 100, radius: 30, onGround: false,
        frozenTurns: 0, cyberLockedTurns: 0, isIronDomeActive: false, ironDomeBattery: 0,
        mood: 'default', moodTimer: 0,
        weapons: [
          { name: 'MISSILE', ammo: Infinity, type: 'standard' as WeaponType },
          { name: n.specials[0].replace('_', ' ').toUpperCase(), ammo: 1, type: n.specials[0] as WeaponType },
          { name: n.specials[1].replace('_', ' ').toUpperCase(), ammo: 1, type: n.specials[1] as WeaponType }
        ]
      }))
    }));
    teamsRef.current = initialTeams;
    setActiveTeamIdx(0); setActiveMemberIdx(0); setGameState('PLAYING');

    setTimeout(() => {
      const tCtx = tCanvasRef.current?.getContext('2d');
      if (tCtx) {
        tCtx.clearRect(0, 0, 1024, 600);
        tCtx.fillStyle = '#4d2926';
        tCtx.beginPath(); tCtx.moveTo(0, 600);
        for (let x = 0; x <= 1024; x += 40) tCtx.lineTo(x, 380 + Math.random() * 100);
        tCtx.lineTo(1024, 600); tCtx.fill();
      }
    }, 100);
  };

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const ctx = canvasRef.current?.getContext('2d');
    const tCtx = tCanvasRef.current?.getContext('2d');
    if (!ctx || !tCtx) return;

    const loop = () => {
      frameCount.current++;
      const e = engine.current;
      const teams = teamsRef.current;
      const activeM = teams[activeTeamIdx]?.members[activeMemberIdx];

      if (activeM && e.projectiles.length === 0) {
        if (activeM.hp <= 0) {
          endTurn();
        } else if (activeM.frozenTurns > 0) {
          e.turnDelay++;
          if (e.turnDelay === 1) {
            e.floatingTexts.push({x: activeM.x, y: activeM.y - 50, text: "TURN SKIPPED!", color: "cyan", life: 60});
          }
          if (e.turnDelay > 60) {
            e.turnDelay = 0;
            endTurn();
          }
        } else {
          e.turnDelay = 0;
          if (keys.current['KeyA'] && !checkWall(activeM.x - 3, activeM.y, activeM.radius, tCtx)) activeM.x -= 2;
          if (keys.current['KeyD'] && !checkWall(activeM.x + 3, activeM.y, activeM.radius, tCtx)) activeM.x += 2;
          if (keys.current['KeyW'] && activeM.onGround) { activeM.vy = -6; activeM.onGround = false; }
          if (keys.current['ArrowUp']) e.angle -= 1.5;
          if (keys.current['ArrowDown']) e.angle += 1.5;
          if (keys.current['Digit1']) setCurrentWpn(0);
          if (keys.current['Digit2']) setCurrentWpn(1);
          if (keys.current['Digit3']) setCurrentWpn(2);
          if (keys.current['Space']) { e.isCharging = true; e.charge = Math.min(e.charge + 1.5, 100); }
          else if (e.isCharging) { fire(activeM); }
        }
      }

      updateDrones(e.projectiles, teams, activeTeamIdx);

      teams.forEach(t => t.members.forEach(mem => {
        if (mem.hp <= 0) return;
        mem.vy += GRAVITY; mem.y += mem.vy;
        if (checkTerrain(mem.x, mem.y + mem.radius, tCtx)) { mem.y -= mem.vy; mem.vy = 0; mem.onGround = true; }
        if (mem.y > WATER_LEVEL + 20 && frameCount.current % 60 === 0) mem.hp -= 5;
        if (mem.moodTimer > 0 && --mem.moodTimer === 0) mem.mood = 'default';
      }));

      e.projectiles.forEach((p, i) => {
        if (p.type !== 'drone') p.vy += GRAVITY;
        p.x += p.vx; p.y += p.vy;

        // --- BOUNDARY CHECK FIX ---
        const isOutOfBounds = p.x < -200 || p.x > 1224 || p.y < -800;

        if (checkTerrain(p.x, p.y, tCtx) || p.y > 600 || isOutOfBounds) {
          if (!isOutOfBounds) {
            explode(p.x, p.y, p);
          } else {
            e.floatingTexts.push({ x: 512, y: 150, text: "TARGET LOST", color: "white", life: 50 });
          }
          
          e.projectiles.splice(i, 1);
          if (e.projectiles.length === 0) endTurn();
        }
      });

      draw(ctx, tCtx);
      frameId.current = requestAnimationFrame(loop);
    };

    const fire = (m: Member) => {
      const e = engine.current;
      const wpn = m.weapons[currentWpn];
      if (wpn.ammo <= 0) return;
      const rad = e.angle * Math.PI / 180; const force = e.charge / 6.5;
      e.projectiles.push({ x: m.x, y: m.y - 25, vx: Math.cos(rad) * force, vy: Math.sin(rad) * force, type: wpn.type, ownerIndex: activeTeamIdx });
      if (wpn.ammo !== Infinity) wpn.ammo--;
      e.isCharging = false; e.charge = 0;
    };

    const explode = (x: number, y: number, p: Projectile) => {
      const e = engine.current;
      const effect = applySpecialImpacts(p, teamsRef.current, e.floatingTexts);
      
      tCtx.globalCompositeOperation = 'destination-out';
      tCtx.beginPath(); tCtx.arc(x, y, effect.radius, 0, Math.PI * 2); tCtx.fill();
      tCtx.globalCompositeOperation = 'source-over';
      
      e.explosions.push({ x, y, radius: 5, maxRadius: effect.radius, color: effect.color, life: 30, type: p.type });
      
      for(let i=0; i<15; i++) {
        e.particles.push({
          x, y, vx: (Math.random()-0.5)*12, vy: (Math.random()-0.5)*12 - 2,
          life: 20 + Math.random()*20, color: effect.color, size: Math.random()*5 + 2
        });
      }

      if (p.type === 'gas') {
        e.gasClouds.push({ x, y, radius: 90, life: 300, damagePerFrame: 0.1 });
      }

      let hitSomeone = false;
      teamsRef.current.forEach(t => t.members.forEach(mem => {
        if (Math.hypot(mem.x - x, mem.y - y) < effect.radius + mem.radius) {
          mem.hp -= effect.damage; hitSomeone = true;
          if (p.type === 'frozen') {
            mem.frozenTurns = 2; mem.mood = 'sad';
            e.floatingTexts.push({x: mem.x, y: mem.y - 40, text: "FROZEN!", color: "cyan", life: 50});
          } else {
            mem.mood = 'sad'; mem.moodTimer = 90;
            e.floatingTexts.push({x: mem.x, y: mem.y - 40, text: `-${effect.damage}`, color: "red", life: 40});
          }
        }
      }));

      if (hitSomeone) {
        const attacker = teamsRef.current[p.ownerIndex]?.members[activeMemberIdx];
        if (attacker) { attacker.mood = 'happy'; attacker.moodTimer = 90; }
      }
    };

    const endTurn = () => {
      const currentM = teamsRef.current[activeTeamIdx]?.members[activeMemberIdx];
      if (currentM && currentM.frozenTurns > 0) {
        currentM.frozenTurns--;
      }

      setActiveTeamIdx(prev => {
        const next = (prev + 1) % teamsRef.current.length;
        if (next === 0) setActiveMemberIdx(m => (m + 1) % teamsRef.current[0].members.length);
        return next;
      });
      setCurrentWpn(0);
    };

    const draw = (ctx: CanvasRenderingContext2D, tCtx: CanvasRenderingContext2D) => {
      const e = engine.current;
      ctx.clearRect(0, 0, 1024, 600);
      ctx.drawImage(tCtx.canvas, 0, 0);

      e.waterOffset += 0.05;
      ctx.fillStyle = "rgba(0, 119, 190, 0.85)";
      ctx.beginPath(); ctx.moveTo(0, WATER_LEVEL);
      for (let x = 0; x <= 1024; x += 40) ctx.lineTo(x, WATER_LEVEL + Math.sin(x * 0.05 + e.waterOffset) * 8);
      ctx.lineTo(1024, 600); ctx.lineTo(0, 600); ctx.fill();

      teamsRef.current.forEach((t, tIdx) => t.members.forEach((mem, mIdx) => {
        if (mem.hp <= 0) return;
        const isActive = tIdx === activeTeamIdx && mIdx === activeMemberIdx;
        
        if (mem.frozenTurns > 0) {
          ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
          ctx.fillRect(mem.x - mem.radius - 5, mem.y - mem.radius - 5, mem.radius*2 + 10, mem.radius*2 + 10);
        }

        drawLeader(ctx, mem, t.leader, t.color, isActive);
        drawSpecialVisuals(ctx, mem);
        
        ctx.fillStyle = 'black'; ctx.fillRect(mem.x - 21, mem.y - (mem.radius + 16), 42, 7);
        ctx.fillStyle = mem.hp > 30 ? 'lime' : 'red'; ctx.fillRect(mem.x - 20, mem.y - (mem.radius + 15), (mem.hp/100)*40, 5);

        if (isActive && e.projectiles.length === 0 && mem.frozenTurns === 0) {
          const rad = e.angle * Math.PI / 180;
          ctx.strokeStyle = 'red'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(mem.x, mem.y - 20); 
          ctx.lineTo(mem.x + Math.cos(rad) * 70, mem.y - 20 + Math.sin(rad) * 70);
          ctx.stroke(); ctx.setLineDash([]);
        }
      }));

      e.projectiles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        
        if (p.type === 'standard' || p.type === 'supreme') {
          const scale = p.type === 'supreme' ? 1.5 : 1;
          ctx.scale(scale, scale);
          ctx.fillStyle = p.type === 'supreme' ? '#333' : '#eee';
          ctx.fillRect(-10, -4, 16, 8);
          ctx.fillStyle = 'red';
          ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(14, 0); ctx.lineTo(6, 4); ctx.fill();
          ctx.fillStyle = 'orange';
          ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-18 + Math.random()*4, 0); ctx.lineTo(-10, 2); ctx.fill();
        } else if (p.type === 'drone') {
          ctx.fillStyle = '#555'; ctx.fillRect(-8, -2, 16, 4);
          ctx.fillStyle = 'red'; ctx.fillRect(-6, -6, 2, 4); ctx.fillRect(4, -6, 2, 4);
        } else if (p.type === 'centrifuge') {
          ctx.rotate(frameCount.current * 0.5);
          ctx.fillStyle = 'silver'; ctx.fillRect(-6, -8, 12, 16);
          ctx.fillStyle = '#32CD32'; ctx.fillRect(-4, -6, 8, 12);
        } else if (p.type === 'gas') {
          ctx.fillStyle = '#228B22'; ctx.fillRect(-8, -5, 16, 10);
        } else if (p.type === 'frozen') {
          ctx.fillStyle = '#00FFFF'; ctx.beginPath(); ctx.moveTo(0,-8); ctx.lineTo(8,0); ctx.lineTo(0,8); ctx.lineTo(-8,0); ctx.fill();
        } else if (p.type === 'parade') {
          ctx.fillStyle = '#8B4513'; ctx.fillRect(-10, -10, 20, 20);
        } else {
          ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
      });

      e.gasClouds.forEach((gc, i) => {
        gc.life--;
        ctx.globalAlpha = Math.max(0, gc.life / 300) * 0.4;
        ctx.fillStyle = '#32CD32'; 
        ctx.beginPath(); ctx.arc(gc.x, gc.y, gc.radius + Math.sin(frameCount.current*0.1)*10, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1.0;
        
        if (frameCount.current % 15 === 0) {
          teamsRef.current.forEach(t => t.members.forEach(mem => {
             if (mem.hp > 0 && Math.hypot(mem.x - gc.x, mem.y - gc.y) < gc.radius + mem.radius) {
                 mem.hp -= gc.damagePerFrame * 15;
             }
          }));
        }
        if (gc.life <= 0) e.gasClouds.splice(i, 1);
      });

      e.explosions.forEach((ex, i) => {
        ex.radius += (ex.maxRadius - ex.radius) * 0.2;
        ex.life--;
        ctx.globalAlpha = Math.max(0, ex.life / 30);
        ctx.fillStyle = ex.color;
        ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1.0;
        if (ex.life <= 0) e.explosions.splice(i, 1);
      });

      e.particles.forEach((pt, i) => {
        pt.vy += GRAVITY; pt.x += pt.vx; pt.y += pt.vy; pt.life--;
        ctx.globalAlpha = Math.max(0, pt.life / 40);
        ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1.0;
        if (pt.life <= 0) e.particles.splice(i, 1);
      });

      e.floatingTexts.forEach((f, i) => {
        f.y -= 1; f.life--;
        ctx.globalAlpha = Math.max(0, f.life / 40);
        ctx.fillStyle = f.color; ctx.font = "bold 20px Arial"; ctx.fillText(f.text, f.x - 20, f.y);
        ctx.globalAlpha = 1.0;
        if (f.life <= 0) e.floatingTexts.splice(i, 1);
      });

      if (e.isCharging) {
        const m = teamsRef.current[activeTeamIdx].members[activeMemberIdx];
        ctx.fillStyle = 'orange'; ctx.fillRect(m.x - 20, m.y - (m.radius + 25), e.charge / 2.5, 6);
      }
    };

    frameId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId.current);
  }, [gameState, activeTeamIdx, activeMemberIdx, currentWpn]);

  if (gameState === 'SELECT_TEAM') return (
    <div style={{ textAlign:'center', background:'#111', color:'white', minHeight:'100vh', padding:'40px', fontFamily: 'Arial' }}>
      <h1 style={{ color: '#ed1c24', fontSize: '40px', margin: '0 0 10px 0' }}>GEOPOLITICAL WARS</h1>
      <h2 style={{ margin: '0 0 30px 0', color: '#aaa' }}>SELECT DEPLOYMENTS (MIN 2)</h2>
      
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {NATIONS.map(n => (
          <div key={n.name} onClick={() => setSelectedNations(p => p.includes(n.name) ? p.filter(x => x !== n.name) : [...p, n.name])} 
               style={{ 
                 padding: '20px', backgroundColor: '#222', 
                 border: selectedNations.includes(n.name) ? `3px solid ${n.color}` : '1px solid #444', 
                 cursor: 'pointer', width: '220px', borderRadius: '8px',
                 boxShadow: selectedNations.includes(n.name) ? `0px 0px 15px ${n.color}` : 'none'
               }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '24px', color: n.color }}>{n.name}</h3>
            <p style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: 'bold' }}>{n.leader}</p>
            <div style={{ fontSize: '12px', color: '#bbb', padding: '10px', background: '#1a1a1a', borderRadius: '4px' }}>
              <strong>SPECIALS:</strong><br/>
              {n.specials.map(s => s.replace('_', ' ').toUpperCase()).join(' & ')}
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ margin: '40px' }}>
        <strong>MAP SIZE:</strong> 
        {(['Small', 'Medium', 'Large'] as MapSize[]).map(s => (
          <button key={s} onClick={() => setMapSize(s)} style={{ margin: '0 10px', padding: '10px 20px', backgroundColor: mapSize === s ? 'gold' : '#444', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>{s}</button>
        ))}
      </div>

      <button 
        onClick={initGame} 
        disabled={selectedNations.length < 2} 
        style={{ padding: '15px 50px', fontSize: '24px', cursor: selectedNations.length < 2 ? 'not-allowed' : 'pointer', backgroundColor: selectedNations.length < 2 ? '#333' : '#ed1c24', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
        DEPLOY UNITS
      </button>
    </div>
  );

  return (
    <div style={{ position: 'relative', width: '1024px', height: '600px', backgroundColor: '#87CEEB', margin: '20px auto', border: '4px solid #333' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, padding: '15px', background: 'rgba(0,0,0,0.8)', color: 'white', borderRadius: '8px' }}>
        <h3 style={{ margin: 0, color: teamsRef.current[activeTeamIdx]?.color }}>{teamsRef.current[activeTeamIdx]?.leader}'s TURN</h3>
        <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
          UNIT {activeMemberIdx + 1} | {teamsRef.current[activeTeamIdx]?.members[activeMemberIdx]?.weapons[currentWpn]?.name}
        </p>
      </div>
      <canvas ref={canvasRef} width={1024} height={600} />
      <canvas ref={tCanvasRef} width={1024} height={600} style={{ display: 'none' }} />
    </div>
  );
}