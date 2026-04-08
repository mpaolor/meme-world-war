import React, { useState } from 'react';

const NATIONS = [
  { name: 'USA', color: '#3c3b6e', leader: 'Trump', specials: ['tweet_storm', 'trade_war'] },
  { name: 'Russia', color: '#ffffff', leader: 'Putin', specials: ['gas', 'frozen'] },
  { name: 'N. Korea', color: '#ed1c24', leader: 'Kim', specials: ['supreme', 'parade'] },
  { name: 'Israel', color: '#0038b8', leader: 'Netanyahu', specials: ['iron_dome', 'cyber'] },
  { name: 'Iran', color: '#239e46', leader: 'Khamenei', specials: ['centrifuge', 'drone'] }
];

interface MainMenuProps {
  onStart: (nations: string[], size: 'Small' | 'Medium' | 'Large') => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStart }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [mapSize, setMapSize] = useState<'Small' | 'Medium' | 'Large'>('Medium');

  const toggleNation = (name: string) => {
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  return (
    <div style={{ 
      textAlign:'center', background:'linear-gradient(to bottom, #0f172a, #1e293b)', 
      color:'white', minHeight:'100vh', padding:'40px', fontFamily: 'Courier New' 
    }}>
      <h1 style={{ fontSize: '3.5rem', color: '#f87171', textShadow: '0 0 20px rgba(248,113,113,0.4)', margin: '0 0 10px 0' }}>
        MEME WORLD WAR
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '30px', letterSpacing: '2px' }}>[ STRATEGIC COMMAND INTERFACE ]</p>
      
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', margin: '20px 0' }}>
        {NATIONS.map(n => {
          const active = selected.includes(n.name);
          return (
            <div key={n.name} onClick={() => toggleNation(n.name)}
                 style={{ 
                   padding: '20px', background: active ? 'rgba(255,255,255,0.05)' : '#0f172a',
                   border: `2px solid ${active ? n.color : '#334155'}`, borderRadius: '8px', cursor: 'pointer',
                   width: '210px', transition: '0.2s', boxShadow: active ? `0 0 15px ${n.color}` : 'none'
                 }}>
              <h2 style={{ color: n.color, margin: '0 0 5px 0' }}>{n.name}</h2>
              <p style={{ fontWeight: 'bold' }}>{n.leader}</p>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '10px', borderTop: '1px solid #334155', paddingTop: '10px' }}>
                {n.specials.join(' / ').toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ margin: '30px 0' }}>
        <h3 style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '15px' }}>THEATER OF OPERATIONS SIZE</h3>
        {(['Small', 'Medium', 'Large'] as const).map(s => (
          <button key={s} onClick={() => setMapSize(s)} 
            style={{ 
              margin: '0 10px', padding: '10px 25px', cursor: 'pointer',
              background: mapSize === s ? '#ef4444' : '#334155', 
              color: 'white', border: 'none', fontWeight: 'bold'
            }}>{s}</button>
        ))}
      </div>

      <button 
        onClick={() => onStart(selected, mapSize)} 
        disabled={selected.length < 2} 
        style={{ 
          padding: '20px 80px', fontSize: '24px', cursor: selected.length < 2 ? 'not-allowed' : 'pointer', 
          background: selected.length < 2 ? '#1e293b' : '#ef4444', color: 'white', 
          border: 'none', borderRadius: '4px', fontWeight: 'bold', marginTop: '20px',
          boxShadow: selected.length < 2 ? 'none' : '0 0 20px rgba(239, 68, 68, 0.4)'
        }}>
        {selected.length < 2 ? 'WAITING FOR ALLIES...' : 'INITIALIZE CONFLICT'}
      </button>
    </div>
  );
};