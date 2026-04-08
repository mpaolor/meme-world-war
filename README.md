# 🌍 Meme World War: Tactical Artillery

A turn-based artillery game built with React, TypeScript, and Canvas.

## 🚀 Setup & Build
1. **Install Node.js**
2. **Create Project**: `npm create vite@latest world-war -- --template react-ts`
3. **Install Deps**: `cd world-war && npm install`
4. **Add Images**: Place leader PNGs (trump.png, etc.) in `public/images/`.
5. **Run**: `npm run dev`

## 🕹️ Controls
- **A / D**: Move Left/Right
- **W**: Jump
- **Arrow Up / Down**: Aim Angle
- **1, 2, 3**: Switch Weapons
- **Space**: Hold to Charge, Release to Fire

## 🔫 Weapons Roster
### USA (Trump)
- **Tweet Storm**: Fires a spread of 3 small missiles.
- **Trade War**: Heavy orbital strike from above.

### Russia (Putin)
- **Gas Pipe**: Creates a toxic green cloud that deals Damage-Over-Time.
- **Frozen Asset**: Freezes the target, skipping their movement for 2 turns.

### N. Korea (Kim)
- **Supreme Rocket**: Massive explosion radius.
- **Military Parade**: A sequence of ground explosions marching forward.

### Israel (Netanyahu)
- **Iron Dome**: Defensive shield that intercepts 3 incoming missiles.
- **Cyber Strike**: Disables enemy special weapons for 2 turns.

### Iran (Khamenei)
- **Centrifuge**: High-impact piercing shell.
- **Drone Swarm**: 3 drones that home in on the closest enemy (85% accuracy).