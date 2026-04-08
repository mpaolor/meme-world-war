import type { Member } from './types';

export const GRAVITY = 0.22;
export const WATER_LEVEL = 540;

export const checkTerrain = (x: number, y: number, tCtx: CanvasRenderingContext2D): boolean => {
  if (x < 0 || x >= 1024 || y >= 600) return false;
  const pixel = tCtx.getImageData(x, y, 1, 1).data;
  return pixel[3] > 0; // Returns true if pixel is not transparent
};

export const checkWall = (x: number, y: number, radius: number, tCtx: CanvasRenderingContext2D): boolean => {
  // Check multiple points along the side based on new radius
  return (
    checkTerrain(x - radius, y, tCtx) || 
    checkTerrain(x + radius, y, tCtx) ||
    checkTerrain(x - radius, y - radius, tCtx) ||
    checkTerrain(x + radius, y - radius, tCtx)
  );
};

const imageCache: Record<string, HTMLImageElement> = {};

// --- UPDATED DRAWING LOGIC (BIGGER + CIRCLE) ---
export const drawLeader = (ctx: CanvasRenderingContext2D, m: Member, leader: string, color: string, isActive: boolean) => {
  const moodSuffix = m.mood === 'default' ? '' : `-${m.mood}`;
  const imageName = `${leader.toLowerCase()}${moodSuffix}`;

  if (!imageCache[imageName]) {
    const img = new Image();
    img.src = `./images/${imageName}.png`;
    imageCache[imageName] = img;
  }

  const img = imageCache[imageName];
  ctx.save();
  
  // Apply glowing active indicator (yellow shadow)
  if (isActive) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'yellow';
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 4;
  } else {
    // Normal enclosed circle border
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
  }

  // 1. Draw the base circle path
  ctx.beginPath();
  ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
  
  // 2. Fill background with team color (visible if image fails)
  ctx.fillStyle = color;
  ctx.fill();
  
  // 3. Draw the border
  ctx.stroke();

  // 4. THE CRITICAL CHANGE: CLIP THE IMAGE INTO THE CIRCLE
  if (img.complete && img.naturalWidth !== 0) {
    ctx.clip(); // Restricts all future drawing to the circle we just traced

    // Draw image to fill the circle area exactly
    // (x - radius, y - radius, diameter, diameter)
    ctx.drawImage(img, m.x - m.radius, m.y - m.radius, m.radius * 2, m.radius * 2);
  } else {
    // Basic fallback visual if images are missing
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(leader.substring(0,3).toUpperCase(), m.x, m.y + 4);
  }
  
  ctx.restore(); // Removes the clipping region for next character
};

export const drawCrate = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.fillStyle = "#5d4037";
  ctx.fillRect(x, y, 30, 30);
  ctx.strokeStyle = "#ffd700";
  ctx.strokeRect(x, y, 30, 30);
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 16px Arial";
  ctx.fillText("📦", x + 5, y + 22);
};