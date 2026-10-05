/* Procedural art library: one coherent game-art direction.
   Soft rounded vector shapes, deep-indigo outlines, warm light, gentle shading.
   Places must read WITHOUT reading: silhouette + behavior carry meaning.
   Emoji appear only as tiny inhabitants/animals — never as the place itself. */

export const INK = '#2a2350';
export const CREAM = '#fff3dd';
export const ROOF_RED = '#e26d5a';
export const WOOD = '#b07a45';
export const WOOD_D = '#8a5a30';
export const LEAF = '#5fae6b';
export const LEAF_D = '#3f8a4f';
export const GLOW = '#ffd76e';
export const VIOLET = '#7c6cf0';
export const VIOLET_D = '#5a4bd6';
export const SKY_D = '#3a6fd8';

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  ctx.fillStyle = 'rgba(20,30,50,0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
}

function outline(ctx: CanvasRenderingContext2D, w = 3): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

export function windowGlow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = GLOW;
  rr(ctx, x, y, w, h, 5);
  ctx.fill();
  outline(ctx, 2.5);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(x + 2, y + 2, w / 3, 3);
}

/** Door that can swing open (open01: 0 closed … 1 open). */
export function door(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, open01: number, color = WOOD): void {
  // dark interior + light spill
  ctx.fillStyle = '#241f3d';
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  if (open01 > 0.03) {
    ctx.fillStyle = 'rgba(255,215,110,0.5)';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h);
    ctx.lineTo(x + w * 0.8, y + h);
    ctx.lineTo(x + w * (0.8 + open01 * 0.9), y + h + 26 * open01);
    ctx.lineTo(x + w * (0.2 - open01 * 0.9), y + h + 26 * open01);
    ctx.closePath();
    ctx.fill();
  }
  const dw = w * (1 - open01 * 0.75);
  ctx.fillStyle = color;
  rr(ctx, x, y, dw, h, 8);
  ctx.fill();
  outline(ctx, 2.5);
  // knob + planks
  ctx.fillStyle = WOOD_D;
  ctx.beginPath(); ctx.arc(x + dw - 7, y + h / 2, 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(x + 4, y + (h / 3) * i); ctx.lineTo(x + dw - 4, y + (h / 3) * i); ctx.stroke();
  }
}

/** Smoke puffs from a chimney top (t-driven, capped). */
export function chimneySmoke(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, reduceMotion: boolean, n = 3): void {
  for (let i = 0; i < n; i++) {
    const ph = reduceMotion ? i / n : (t / 1600 + i / n) % 1;
    ctx.fillStyle = `rgba(245,245,250,${0.75 * (1 - ph)})`;
    ctx.beginPath();
    ctx.arc(x + Math.sin((ph * 4 + i) * 2) * 7, y - ph * 44, 5 + ph * 9, 0, Math.PI * 2);
    ctx.fill();
  }
}

function roofTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 8, y);
  ctx.lineTo(x + w / 2, y - h);
  ctx.lineTo(x + w + 8, y);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 3);
  // highlight slope
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 2, y - 6);
  ctx.lineTo(x + w / 2 - 4, y - h + 8);
  ctx.stroke();
}

/* ------------------------------- buildings ------------------------------- */

export function drawHouse(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, rm: boolean, doorOpen = 0): void {
  // x,y = ground center; s = width
  const w = s, h = s * 0.62;
  shadow(ctx, x, y + 4, w * 0.52);
  // walls
  ctx.fillStyle = CREAM;
  rr(ctx, x - w / 2, y - h, w, h, 6);
  ctx.fill(); outline(ctx, 3);
  // brick hint
  ctx.strokeStyle = 'rgba(0,0,0,0.07)';
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(x - w / 2 + 6, y - h + (h / 3) * i); ctx.lineTo(x + w / 2 - 6, y - h + (h / 3) * i); ctx.stroke();
  }
  roofTriangle(ctx, x - w / 2, y - h + 4, w, s * 0.34, ROOF_RED);
  // chimney
  ctx.fillStyle = '#9a6a4a';
  rr(ctx, x + w * 0.24, y - h - s * 0.34, 14, 26, 3);
  ctx.fill(); outline(ctx, 2.5);
  chimneySmoke(ctx, x + w * 0.24 + 7, y - h - s * 0.34, t, rm);
  // windows + door
  windowGlow(ctx, x - w / 2 + 10, y - h + 14, 22, 22);
  windowGlow(ctx, x + w / 2 - 32, y - h + 14, 22, 22);
  door(ctx, x - 13, y - 44, 26, 44, doorOpen);
  // flower pots
  ctx.fillStyle = ROOF_RED;
  rr(ctx, x - w / 2 - 2, y - 12, 12, 10, 3); ctx.fill(); outline(ctx, 2);
  rr(ctx, x + w / 2 - 10, y - 12, 12, 10, 3); ctx.fill(); outline(ctx, 2);
  ctx.fillStyle = LEAF;
  ctx.beginPath(); ctx.arc(x - w / 2 + 4, y - 16, 7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + w / 2 - 4, y - 16, 7, 0, Math.PI * 2); ctx.fill();
}

export function drawLab(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, rm: boolean): void {
  const w = s, h = s * 0.55;
  shadow(ctx, x, y + 4, w * 0.5);
  // main hall
  ctx.fillStyle = '#e8f2ff';
  rr(ctx, x - w / 2, y - h, w, h, 10);
  ctx.fill(); outline(ctx, 3);
  // dome
  ctx.fillStyle = '#9fd0ff';
  ctx.beginPath(); ctx.arc(x, y - h, w * 0.3, Math.PI, 0); ctx.fill(); outline(ctx, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath(); ctx.arc(x - w * 0.1, y - h - w * 0.14, w * 0.07, 0, Math.PI * 2); ctx.fill();
  // antenna + blinking light
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y - h - w * 0.3); ctx.lineTo(x, y - h - w * 0.52); ctx.stroke();
  const blink = rm ? 1 : 0.4 + 0.6 * Math.abs(Math.sin(t / 500));
  ctx.fillStyle = `rgba(255,110,110,${blink})`;
  ctx.beginPath(); ctx.arc(x, y - h - w * 0.55, 6, 0, Math.PI * 2); ctx.fill(); outline(ctx, 2);
  // round window (porthole with bubbles)
  ctx.fillStyle = '#bfe3ff';
  ctx.beginPath(); ctx.arc(x - w * 0.28, y - h * 0.45, 15, 0, Math.PI * 2); ctx.fill(); outline(ctx, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  const n = 3;
  for (let i = 0; i < n; i++) {
    const ph = rm ? i / n : (t / 1200 + i / n) % 1;
    ctx.beginPath();
    ctx.arc(x - w * 0.28 - 6 + i * 6, y - h * 0.45 + 8 - ph * 16, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  windowGlow(ctx, x + w * 0.12, y - h + 12, 24, 24);
  door(ctx, x - 13, y - 44, 26, 44, 0, '#7c6cf0');
  // flask sign
  ctx.fillStyle = '#c9f0ff';
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 2, y - h - 2);
  ctx.lineTo(x - w / 2 - 2, y - h - 16);
  ctx.lineTo(x - w / 2 - 8, y - h - 16);
  ctx.lineTo(x - w / 2 + 6, y - h + 2);
  ctx.lineTo(x - w / 2 - 16, y - h + 2);
  ctx.closePath();
  ctx.fill(); outline(ctx, 2.5);
  ctx.fillStyle = '#5fd68a';
  ctx.fillRect(x - w / 2 - 12, y - h - 2, 14, 4);
}

export function drawWorkshop(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, rm: boolean): void {
  const w = s, h = s * 0.5;
  shadow(ctx, x, y + 4, w * 0.52);
  ctx.fillStyle = '#ffe7c2';
  rr(ctx, x - w / 2, y - h, w, h, 6);
  ctx.fill(); outline(ctx, 3);
  // sawtooth roof
  ctx.fillStyle = WOOD;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 6, y - h + 4);
  for (let i = 0; i < 4; i++) {
    const sx = x - w / 2 - 6 + ((w + 12) / 4) * i;
    ctx.lineTo(sx + (w + 12) / 8, y - h - 16);
    ctx.lineTo(sx + (w + 12) / 4, y - h + 4);
  }
  ctx.lineTo(x + w / 2 + 6, y - h + 4);
  ctx.closePath();
  ctx.fill(); outline(ctx, 3);
  // gear sign (rotates slowly)
  const gx = x + w / 2 - 4, gy = y - h - 26;
  ctx.save();
  ctx.translate(gx, gy);
  if (!rm) ctx.rotate(t / 2400);
  ctx.fillStyle = '#ffc94d';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.rect(Math.cos(a) * 12 - 3, Math.sin(a) * 12 - 3, 6, 6);
  }
  ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
  outline(ctx, 2.5);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // big open doorway (workshop is inviting) + tools
  door(ctx, x - 16, y - 46, 32, 46, 0.85);
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  // hammer leaning
  ctx.save();
  ctx.translate(x - w / 2 + 12, y - 26);
  ctx.rotate(0.5);
  ctx.fillStyle = WOOD;
  ctx.fillRect(-2.5, -16, 5, 26);
  ctx.fillStyle = '#8d99ae';
  rr(ctx, -9, -24, 18, 10, 3); ctx.fill(); outline(ctx, 2);
  ctx.restore();
}

export function drawLibrary(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, rm: boolean): void {
  const w = s, h = s * 0.62;
  shadow(ctx, x, y + 4, w * 0.45);
  // book-shaped building!
  ctx.fillStyle = '#b3a8ff';
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w / 2, y - h + 12);
  ctx.quadraticCurveTo(x, y - h - 14, x + w / 2, y - h + 12);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  ctx.fill(); outline(ctx, 3);
  // pages
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + 10, y - 4);
  ctx.lineTo(x - w / 2 + 10, y - h + 20);
  ctx.quadraticCurveTo(x, y - h + 2, x + w / 2 - 10, y - h + 20);
  ctx.lineTo(x + w / 2 - 10, y - 4);
  ctx.closePath();
  ctx.fill(); outline(ctx, 2.5);
  // text lines on pages
  ctx.strokeStyle = 'rgba(42,35,80,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(x - w / 2 + 18, y - h + 34 + i * 9); ctx.lineTo(x + w / 2 - 18, y - h + 34 + i * 9); ctx.stroke();
  }
  // owl on top (mind = wise owl)
  const oy = y - h - 16 + (rm ? 0 : Math.sin(t / 800) * 2);
  ctx.fillStyle = '#8a6f4d';
  ctx.beginPath(); ctx.arc(x, oy, 14, 0, Math.PI * 2); ctx.fill(); outline(ctx, 2.5);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - 6, oy - 2, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 6, oy - 2, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK;
  const blink = rm ? 1 : Math.sin(t / 300) > 0.97 ? 0.15 : 1;
  ctx.beginPath(); ctx.arc(x - 6, oy - 2, 2.4 * blink, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 6, oy - 2, 2.4 * blink, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffb63d';
  ctx.beginPath(); ctx.moveTo(x - 3, oy + 4); ctx.lineTo(x + 3, oy + 4); ctx.lineTo(x, oy + 8); ctx.closePath(); ctx.fill();
  door(ctx, x - 12, y - 40, 24, 40, 0, VIOLET);
  void rm;
}

export function drawHospital(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, rm: boolean): void {
  const w = s, h = s * 0.6;
  shadow(ctx, x, y + 4, w * 0.45);
  ctx.fillStyle = '#ffffff';
  rr(ctx, x - w / 2, y - h, w, h, 12);
  ctx.fill(); outline(ctx, 3);
  // soft heartbeat line across
  ctx.strokeStyle = '#ff7a8a';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  const yy = y - h * 0.32;
  ctx.moveTo(x - w / 2 + 8, yy);
  const pulse = rm ? 0 : (t / 900) % 1;
  const px = x - w / 2 + 8 + pulse * (w - 16);
  ctx.lineTo(px - 14, yy);
  ctx.lineTo(px - 7, yy - 10);
  ctx.lineTo(px, yy + 8);
  ctx.lineTo(px + 7, yy - 4);
  ctx.lineTo(x + w / 2 - 8, yy);
  ctx.stroke();
  // red cross sign
  ctx.fillStyle = '#ff6b7e';
  const cx = x, cy = y - h - 12;
  rr(ctx, cx - 6, cy - 14, 12, 28, 3); ctx.fill(); outline(ctx, 2.5);
  rr(ctx, cx - 14, cy - 6, 28, 12, 3); ctx.fill(); outline(ctx, 2.5);
  windowGlow(ctx, x - w / 2 + 10, y - h + h * 0.45, 20, 20);
  windowGlow(ctx, x + w / 2 - 30, y - h + h * 0.45, 20, 20);
  door(ctx, x - 12, y - 40, 24, 40, 0, '#5db9f5');
  void rm;
}

export function drawTreehouse(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, rm: boolean): void {
  const sway = rm ? 0 : Math.sin(t / 1100) * 3;
  shadow(ctx, x, y + 4, s * 0.4);
  // trunk
  ctx.fillStyle = '#8a5a30';
  rr(ctx, x - 11, y - s * 0.5, 22, s * 0.5, 8);
  ctx.fill(); outline(ctx, 3);
  // canopy (3 blobs)
  ctx.fillStyle = LEAF;
  const blobs: [number, number, number][] = [[-30, -s * 0.62, 30], [30, -s * 0.62, 30], [0, -s * 0.78, 34]];
  for (const [bx, by, br] of blobs) {
    ctx.beginPath(); ctx.arc(x + bx + sway, y + by, br, 0, Math.PI * 2); ctx.fill(); outline(ctx, 3);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.arc(x - 18 + sway, y - s * 0.82, 12, 0, Math.PI * 2); ctx.fill();
  // little house in branches
  const hy = y - s * 0.52;
  ctx.fillStyle = CREAM;
  rr(ctx, x - 24, hy - 30, 48, 30, 5);
  ctx.fill(); outline(ctx, 3);
  roofTriangle(ctx, x - 24, hy - 28, 48, 18, ROOF_RED);
  windowGlow(ctx, x - 15, hy - 22, 14, 14);
  door(ctx, x + 3, hy - 20, 12, 20, 0.4);
  // ladder
  ctx.strokeStyle = WOOD_D; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x - 34, y); ctx.lineTo(x - 26, hy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x - 14, hy); ctx.stroke();
  // fireflies
  if (!rm) {
    ctx.fillStyle = 'rgba(255,230,130,0.9)';
    for (let i = 0; i < 3; i++) {
      const a = t / 700 + (i * 2.1);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 44, y - s * 0.6 + Math.sin(a * 1.3) * 18, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawStage(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, rm: boolean): void {
  const w = s;
  shadow(ctx, x, y + 4, w * 0.5);
  // shell backdrop
  ctx.fillStyle = '#ffd9e8';
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x - w / 2, y - s * 0.75, x, y - s * 0.75);
  ctx.quadraticCurveTo(x + w / 2, y - s * 0.75, x + w / 2, y);
  ctx.closePath();
  ctx.fill(); outline(ctx, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + 14 + i * 16, y - 6);
    ctx.quadraticCurveTo(x - w / 2 + 14 + i * 16, y - s * 0.6, x - w / 2 + 22 + i * 16, y - s * 0.68);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.stroke();
  }
  // platform
  ctx.fillStyle = WOOD;
  rr(ctx, x - w / 2 - 6, y - 16, w + 12, 16, 6);
  ctx.fill(); outline(ctx, 3);
  // little drum + mic
  ctx.fillStyle = '#ff6b7e';
  ctx.beginPath(); ctx.arc(x - 14, y - 30, 11, 0, Math.PI * 2); ctx.fill(); outline(ctx, 2.5);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 25, y - 33, 22, 5);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x + 16, y - 16); ctx.lineTo(x + 16, y - 52); ctx.stroke();
  ctx.fillStyle = '#4a4a6a';
  ctx.beginPath(); ctx.arc(x + 16, y - 56, 7, 0, Math.PI * 2); ctx.fill(); outline(ctx, 2);
  // floating notes
  if (!rm) {
    ctx.font = '20px serif';
    ctx.fillStyle = VIOLET;
    for (let i = 0; i < 3; i++) {
      const ph = (t / 1500 + i / 3) % 1;
      ctx.globalAlpha = 1 - ph;
      ctx.fillText('♪', x - 30 + i * 28 + Math.sin(t / 400 + i) * 6, y - 66 - ph * 44);
    }
    ctx.globalAlpha = 1;
  }
}

export function drawCave(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, rm: boolean): void {
  // impossible arch: dark rocks + floating impossible triangle
  shadow(ctx, x, y + 4, s * 0.5);
  ctx.fillStyle = '#5a5470';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.45, y);
  ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.7, x, y - s * 0.72);
  ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.7, x + s * 0.45, y);
  ctx.lineTo(x + s * 0.28, y);
  ctx.quadraticCurveTo(x + s * 0.24, y - s * 0.45, x, y - s * 0.46);
  ctx.quadraticCurveTo(x - s * 0.24, y - s * 0.45, x - s * 0.28, y);
  ctx.closePath();
  ctx.fill(); outline(ctx, 3);
  // glowing cracks
  ctx.strokeStyle = 'rgba(178,168,255,0.8)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x - s * 0.2, y - s * 0.3); ctx.lineTo(x - s * 0.1, y - s * 0.5); ctx.stroke();
  // floating triangle (bobs + spins slowly)
  const fy = y - s * 0.62 + (rm ? 0 : Math.sin(t / 900) * 5);
  ctx.save();
  ctx.translate(x, fy);
  if (!rm) ctx.rotate(Math.sin(t / 2600) * 0.35);
  ctx.strokeStyle = GLOW;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, -16); ctx.lineTo(15, 11); ctx.lineTo(-15, 11); ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  // swirling mist
  if (!rm) {
    ctx.strokeStyle = 'rgba(200,190,255,0.35)';
    ctx.lineWidth = 5;
    for (let i = 0; i < 2; i++) {
      const ph = (t / 2200 + i / 2) % 1;
      ctx.beginPath();
      ctx.ellipse(x, y - 8 - ph * 30, 20 + ph * 22, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

export function drawMosque(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, rm: boolean): void {
  const w = s * 0.9, h = s * 0.42;
  shadow(ctx, x, y + 4, w * 0.5);
  // calm cream hall
  ctx.fillStyle = '#fdf6e3';
  rr(ctx, x - w / 2, y - h, w, h, 8);
  ctx.fill(); outline(ctx, 3);
  // dome
  ctx.fillStyle = '#7fd4c1';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.26, y - h + 4);
  ctx.quadraticCurveTo(x - w * 0.24, y - h - s * 0.34, x, y - h - s * 0.36);
  ctx.quadraticCurveTo(x + w * 0.24, y - h - s * 0.34, x + w * 0.26, y - h + 4);
  ctx.closePath();
  ctx.fill(); outline(ctx, 3);
  // crescent
  const cx = x, cy = y - h - s * 0.36 - 12;
  ctx.fillStyle = GLOW;
  ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fdf6e3';
  ctx.beginPath(); ctx.arc(cx + 3.5, cy - 1.5, 6.5, 0, Math.PI * 2); ctx.fill();
  // minaret
  ctx.fillStyle = '#f3e6c8';
  rr(ctx, x + w / 2 - 2, y - h - s * 0.3, 16, s * 0.3 + h, 5);
  ctx.fill(); outline(ctx, 2.5);
  ctx.fillStyle = '#7fd4c1';
  ctx.beginPath(); ctx.arc(x + w / 2 + 6, y - h - s * 0.3, 10, Math.PI, 0); ctx.fill(); outline(ctx, 2);
  // arched windows with soft glow
  for (const wx of [-w * 0.28, -w * 0.05, w * 0.18]) {
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.moveTo(x + wx - 9, y - 14);
    ctx.lineTo(x + wx - 9, y - 30);
    ctx.quadraticCurveTo(x + wx, y - 42, x + wx + 9, y - 30);
    ctx.lineTo(x + wx + 9, y - 14);
    ctx.closePath();
    ctx.fill(); outline(ctx, 2.5);
  }
  door(ctx, x - w * 0.05 - 11, y - 38, 22, 38, 0.15, WOOD);
  // gentle light rays
  if (!rm) {
    ctx.fillStyle = `rgba(255,240,180,${0.1 + 0.05 * Math.sin(t / 1400)})`;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y - h);
    ctx.lineTo(x + w / 2, y - h);
    ctx.lineTo(x + w / 2 + 20, y - h - 44);
    ctx.lineTo(x - w / 2 - 20, y - h - 44);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawCityHall(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, rm: boolean, ownedCount: number): void {
  // skyline cluster that FILLS as the child owns more (reward made visible)
  shadow(ctx, x, y + 4, s * 0.55);
  const towers: [number, number, string][] = [
    [-s * 0.34, s * 0.42, '#9fd0ff'],
    [-s * 0.12, s * 0.58, '#ffd9a8'],
    [s * 0.12, s * 0.5, '#c9b8ff'],
    [s * 0.34, s * 0.38, '#ffb8c2'],
  ];
  const show = Math.min(4, 1 + ownedCount);
  towers.forEach(([ox, th, col], i) => {
    if (i >= show) {
      // ghost plot: dotted outline of what could be built
      ctx.strokeStyle = 'rgba(42,35,80,0.35)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.strokeRect(x + ox - 16, y - th, 32, th);
      ctx.setLineDash([]);
      return;
    }
    ctx.fillStyle = col;
    rr(ctx, x + ox - 16, y - th, 32, th, 4);
    ctx.fill(); outline(ctx, 2.5);
    // windows light up
    ctx.fillStyle = GLOW;
    for (let wy = 0; wy < 3; wy++) {
      for (let wx = 0; wx < 2; wx++) {
        if ((wx + wy + i) % 3 === 0) ctx.fillRect(x + ox - 9 + wx * 11, y - th + 8 + wy * 12, 7, 8);
      }
    }
  });
  // crane when still growing (hope, not emptiness)
  if (show < 4 && !rm) {
    const cx = x - s * 0.42, cy = y - s * 0.72 + Math.sin(t / 900) * 2;
    ctx.strokeStyle = '#e26d5a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, cy); ctx.lineTo(cx + 44, cy); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx + 34, cy); ctx.lineTo(cx + 34, cy + 16); ctx.stroke();
    ctx.fillStyle = '#8a5a30';
    ctx.fillRect(cx + 28, cy + 16, 12, 10);
  }
}

export function drawMuseum(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, rm: boolean, filled: number): void {
  const w = s, h = s * 0.44;
  shadow(ctx, x, y + 4, w * 0.5);
  // pediment
  ctx.fillStyle = '#e8e2d2';
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 6, y - h);
  ctx.lineTo(x, y - h - s * 0.22);
  ctx.lineTo(x + w / 2 + 6, y - h);
  ctx.closePath();
  ctx.fill(); outline(ctx, 3);
  // star medalion
  ctx.fillStyle = GLOW;
  ctx.beginPath(); ctx.arc(x, y - h - s * 0.1, 8, 0, Math.PI * 2); ctx.fill(); outline(ctx, 2);
  // columns
  ctx.fillStyle = '#f7f2e4';
  for (const ox of [-w * 0.32, -w * 0.11, w * 0.11, w * 0.32]) {
    rr(ctx, x + ox - 8, y - h, 16, h, 4);
    ctx.fill(); outline(ctx, 2.5);
  }
  // base with artifacts peeking (filled = how many treasures inside)
  ctx.fillStyle = '#d9d0b8';
  rr(ctx, x - w / 2 - 6, y - 14, w + 12, 14, 4);
  ctx.fill(); outline(ctx, 2.5);
  const treats = ['🏺', '🎨', '🎵', '🤖'];
  for (let i = 0; i < Math.min(4, filled); i++) {
    ctx.font = '17px serif';
    ctx.textAlign = 'center';
    ctx.fillText(treats[i], x - w * 0.3 + i * (w * 0.2), y - h + 22 + (rm ? 0 : Math.sin(t / 700 + i) * 2));
  }
  door(ctx, x - 13, y - 40, 26, 40, 0.25, VIOLET_D);
  void rm;
}

export function drawGate(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, rm: boolean): void {
  // stone arch with living biomes glimmering beyond
  shadow(ctx, x, y + 4, s * 0.5);
  const grd = ctx.createLinearGradient(0, y - s * 0.7, 0, y);
  grd.addColorStop(0, '#8fd0ff');
  grd.addColorStop(0.55, '#b8e6a8');
  grd.addColorStop(1, '#5db9f5');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y);
  ctx.quadraticCurveTo(x - s * 0.3, y - s * 0.62, x, y - s * 0.62);
  ctx.quadraticCurveTo(x + s * 0.3, y - s * 0.62, x + s * 0.3, y);
  ctx.closePath();
  ctx.fill();
  // mini biomes inside the arch
  ctx.fillStyle = '#f2dfa8';
  ctx.beginPath(); ctx.moveTo(x - s * 0.16, y); ctx.lineTo(x - s * 0.02, y - s * 0.3); ctx.lineTo(x + s * 0.12, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = LEAF;
  ctx.beginPath(); ctx.arc(x + s * 0.14, y - s * 0.14, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7cc7f5';
  ctx.beginPath(); ctx.ellipse(x - s * 0.02, y - s * 0.06, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
  // stone frame
  ctx.lineWidth = 13;
  ctx.strokeStyle = '#b9b2c9';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y);
  ctx.quadraticCurveTo(x - s * 0.3, y - s * 0.62, x, y - s * 0.62);
  ctx.quadraticCurveTo(x + s * 0.3, y - s * 0.62, x + s * 0.3, y);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y);
  ctx.quadraticCurveTo(x - s * 0.3, y - s * 0.62, x, y - s * 0.62);
  ctx.quadraticCurveTo(x + s * 0.3, y - s * 0.62, x + s * 0.3, y);
  ctx.stroke();
  // flags
  for (const fx of [-s * 0.3, s * 0.3]) {
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x + fx, y - s * 0.66); ctx.lineTo(x + fx, y - s * 0.86); ctx.stroke();
    ctx.fillStyle = '#ff6b7e';
    const wave = rm ? 0 : Math.sin(t / 400 + fx) * 2;
    ctx.beginPath(); ctx.moveTo(x + fx, y - s * 0.86); ctx.lineTo(x + fx + 16 + wave, y - s * 0.81); ctx.lineTo(x + fx, y - s * 0.76); ctx.closePath(); ctx.fill();
  }
  // shimmer portal
  if (!rm) {
    ctx.fillStyle = `rgba(255,255,255,${0.18 + 0.12 * Math.sin(t / 800)})`;
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.3, s * 0.2, s * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPad(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, rm: boolean): void {
  shadow(ctx, x, y + 4, s * 0.5);
  // launch pad
  ctx.fillStyle = '#8d99ae';
  ctx.beginPath(); ctx.ellipse(x, y - 4, s * 0.34, 12, 0, 0, Math.PI * 2); ctx.fill(); outline(ctx, 3);
  ctx.fillStyle = '#6c7a94';
  ctx.beginPath(); ctx.ellipse(x, y - 6, s * 0.22, 8, 0, 0, Math.PI * 2); ctx.fill();
  // rocket (gentle hover)
  const hover = rm ? 0 : Math.sin(t / 700) * 4 - 4;
  const ry = y - s * 0.32 + hover;
  // flame
  if (!rm) {
    const fl = 12 + 6 * Math.abs(Math.sin(t / 130));
    const fg = ctx.createLinearGradient(0, ry + 34, 0, ry + 34 + fl + 12);
    fg.addColorStop(0, '#ffd76e');
    fg.addColorStop(1, 'rgba(255,120,80,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(x - 9, ry + 32);
    ctx.lineTo(x + 9, ry + 32);
    ctx.lineTo(x, ry + 44 + fl);
    ctx.closePath();
    ctx.fill();
  }
  // fins
  ctx.fillStyle = ROOF_RED;
  ctx.beginPath(); ctx.moveTo(x - 12, ry + 10); ctx.lineTo(x - 22, ry + 32); ctx.lineTo(x - 12, ry + 32); ctx.closePath(); ctx.fill(); outline(ctx, 2.5);
  ctx.beginPath(); ctx.moveTo(x + 12, ry + 10); ctx.lineTo(x + 22, ry + 32); ctx.lineTo(x + 12, ry + 32); ctx.closePath(); ctx.fill(); outline(ctx, 2.5);
  // body
  const bg = ctx.createLinearGradient(x - 13, 0, x + 13, 0);
  bg.addColorStop(0, '#c9d4e8');
  bg.addColorStop(0.5, '#ffffff');
  bg.addColorStop(1, '#9fb0cc');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(x - 13, ry + 32);
  ctx.lineTo(x - 13, ry - 8);
  ctx.quadraticCurveTo(x - 13, ry - 34, x, ry - 36);
  ctx.quadraticCurveTo(x + 13, ry - 34, x + 13, ry - 8);
  ctx.lineTo(x + 13, ry + 32);
  ctx.closePath();
  ctx.fill(); outline(ctx, 3);
  // window
  ctx.fillStyle = '#7cc7f5';
  ctx.beginPath(); ctx.arc(x, ry - 8, 8, 0, Math.PI * 2); ctx.fill(); outline(ctx, 2.5);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(x - 2.5, ry - 10.5, 2.5, 0, Math.PI * 2); ctx.fill();
}

export function drawGarage(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, rm: boolean, hasRobot: boolean): void {
  const w = s, h = s * 0.48;
  shadow(ctx, x, y + 4, w * 0.5);
  ctx.fillStyle = '#d9e2f2';
  rr(ctx, x - w / 2, y - h, w, h, 8);
  ctx.fill(); outline(ctx, 3);
  // antenna bolts
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x - w * 0.3, y - h); ctx.lineTo(x - w * 0.36, y - h - 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w * 0.3, y - h); ctx.lineTo(x + w * 0.36, y - h - 18); ctx.stroke();
  ctx.fillStyle = GLOW;
  ctx.beginPath(); ctx.arc(x - w * 0.36, y - h - 20, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + w * 0.36, y - h - 20, 4, 0, Math.PI * 2); ctx.fill();
  //gear window
  ctx.fillStyle = '#b3c6e2';
  ctx.beginPath(); ctx.arc(x, y - h + 16, 11, 0, Math.PI * 2); ctx.fill(); outline(ctx, 2.5);
  // open bay: robot inside if built, empty glowing bay if not
  door(ctx, x - 18, y - 44, 36, 44, 1);
  if (hasRobot) {
    const bob = rm ? 0 : Math.sin(t / 600) * 2;
    ctx.fillStyle = '#9fb0cc';
    rr(ctx, x - 10, y - 40 + bob, 20, 26, 6); ctx.fill(); outline(ctx, 2.5);
    ctx.fillStyle = '#c9d4e8';
    ctx.beginPath(); ctx.arc(x, y - 46 + bob, 10, 0, Math.PI * 2); ctx.fill(); outline(ctx, 2.5);
    ctx.fillStyle = '#59e3a8';
    ctx.beginPath(); ctx.arc(x - 4, y - 47 + bob, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4, y - 47 + bob, 2.6, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = `rgba(255,215,110,${rm ? 0.5 : 0.3 + 0.25 * Math.sin(t / 600)})`;
    ctx.beginPath(); ctx.arc(x, y - 22, 10, 0, Math.PI * 2); ctx.fill();
  }
}

/** Small ownable plot house (city grows): variant by index. */
export function drawPlotHouse(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, variant: number): void {
  const cols = [ROOF_RED, VIOLET, '#5db9f5', '#5fae6b', '#ffb63d', '#ff8fb0'];
  const c = cols[variant % cols.length];
  shadow(ctx, x, y + 2, s * 0.4);
  ctx.fillStyle = CREAM;
  rr(ctx, x - s / 2, y - s * 0.55, s, s * 0.55, 4);
  ctx.fill(); outline(ctx, 2.5);
  roofTriangle(ctx, x - s / 2, y - s * 0.55 + 2, s, s * 0.26, c);
  windowGlow(ctx, x - 9, y - s * 0.42, 18, 16);
}

/* ------------------------------- NOVA ------------------------------- */

export type NovaMood = 'idle' | 'walk' | 'look' | 'point' | 'react' | 'celebrate' | 'think' | 'discover' | 'sleep';

export interface NovaPose {
  mood: NovaMood;
  /** gaze target in world offset (for look/point) */
  gazeX?: number;
  gazeY?: number;
}

/** Nova: a small violet wisp-creature. Consistent silhouette, big readable eyes. */
export function drawNova(
  ctx: CanvasRenderingContext2D, x: number, y: number, s: number,
  pose: NovaPose, t: number, rm: boolean,
): void {
  const bob = rm ? 0 : Math.sin(t / 320) * (pose.mood === 'walk' ? 4 : 2.2);
  const squash = pose.mood === 'celebrate' && !rm ? 1 + 0.08 * Math.sin(t / 120) : 1;
  y += bob;
  // glow
  const g = ctx.createRadialGradient(x, y, 4, x, y, s * 1.15);
  g.addColorStop(0, 'rgba(178,168,255,0.7)');
  g.addColorStop(1, 'rgba(178,168,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, s * 1.15, 0, Math.PI * 2); ctx.fill();
  // shadow
  ctx.fillStyle = 'rgba(20,30,50,0.25)';
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.95 - bob, s * 0.5, s * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(2 - squash > 1 ? 1 : 1, squash);
  if (pose.mood === 'react') ctx.rotate(-0.12);
  // ears
  ctx.fillStyle = VIOLET_D;
  for (const ex of [-s * 0.42, s * 0.42]) {
    ctx.beginPath();
    ctx.ellipse(ex, -s * 0.78, s * 0.16, s * 0.34, ex < 0 ? -0.25 : 0.25, 0, Math.PI * 2);
    ctx.fill(); outline(ctx, 2.5);
    ctx.fillStyle = '#c9c2ff';
    ctx.beginPath();
    ctx.ellipse(ex, -s * 0.76, s * 0.07, s * 0.18, ex < 0 ? -0.25 : 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = VIOLET_D;
  }
  // body
  const bg2 = ctx.createLinearGradient(-s * 0.6, 0, s * 0.6, 0);
  bg2.addColorStop(0, VIOLET_D);
  bg2.addColorStop(0.45, VIOLET);
  bg2.addColorStop(1, '#9a8fff');
  ctx.fillStyle = bg2;
  ctx.beginPath(); ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2); ctx.fill(); outline(ctx, 3);
  // belly light
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath(); ctx.ellipse(-s * 0.18, -s * 0.22, s * 0.2, s * 0.3, -0.4, 0, Math.PI * 2); ctx.fill();
  // feet (alternate when walking)
  const step = pose.mood === 'walk' && !rm ? Math.sin(t / 130) * s * 0.12 : 0;
  ctx.fillStyle = VIOLET_D;
  ctx.beginPath(); ctx.ellipse(-s * 0.24, s * 0.6 + step, s * 0.16, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * 0.24, s * 0.6 - step, s * 0.16, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  // arms
  const armUp = pose.mood === 'celebrate' || pose.mood === 'discover';
  ctx.strokeStyle = VIOLET_D;
  ctx.lineWidth = s * 0.11;
  ctx.lineCap = 'round';
  // left arm
  ctx.beginPath();
  ctx.moveTo(-s * 0.55, s * 0.1);
  ctx.lineTo(-s * 0.8, armUp ? -s * 0.5 : s * 0.3);
  ctx.stroke();
  // right arm: points toward gaze when pointing
  ctx.beginPath();
  ctx.moveTo(s * 0.55, s * 0.1);
  if (pose.mood === 'point' && pose.gazeX !== undefined && pose.gazeY !== undefined) {
    const dx = pose.gazeX - x, dy = pose.gazeY - y;
    const l = Math.hypot(dx, dy) || 1;
    ctx.lineTo(s * 0.55 + (dx / l) * s * 0.55, s * 0.1 + (dy / l) * s * 0.55);
  } else {
    ctx.lineTo(s * 0.8, armUp ? -s * 0.5 : s * 0.3);
  }
  ctx.stroke();
  // eyes (gaze follows target)
  let gx = 0, gy = 0;
  if ((pose.mood === 'look' || pose.mood === 'point') && pose.gazeX !== undefined && pose.gazeY !== undefined) {
    const dx = pose.gazeX - x, dy = pose.gazeY - y;
    const l = Math.hypot(dx, dy) || 1;
    gx = (dx / l) * 3; gy = (dy / l) * 3;
  } else if (!rm) {
    gx = Math.sin(t / 1700) * 1.6;
  }
  const eyeY = -s * 0.08;
  const wide = pose.mood === 'react' || pose.mood === 'discover' ? 1.25 : 1;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-s * 0.22, eyeY, s * 0.17 * wide, s * 0.2 * wide, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * 0.22, eyeY, s * 0.17 * wide, s * 0.2 * wide, 0, 0, Math.PI * 2); ctx.fill();
  const blink = !rm && Math.sin(t / 2900) > 0.985 ? 0.12 : 1;
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(-s * 0.22 + gx, eyeY + gy, s * 0.085, s * 0.1 * blink, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * 0.22 + gx, eyeY + gy, s * 0.085, s * 0.1 * blink, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-s * 0.22 + gx - 1, eyeY + gy - 2, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.22 + gx - 1, eyeY + gy - 2, 1.4, 0, Math.PI * 2); ctx.fill();
  // mouth by mood
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (pose.mood === 'react') {
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.ellipse(0, s * 0.3, s * 0.09, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  } else if (pose.mood === 'celebrate' || pose.mood === 'discover') {
    ctx.arc(0, s * 0.18, s * 0.16, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  } else if (pose.mood === 'think') {
    ctx.moveTo(-s * 0.08, s * 0.32); ctx.lineTo(s * 0.08, s * 0.32);
    ctx.stroke();
  } else if (pose.mood === 'sleep') {
    ctx.moveTo(-s * 0.1, s * 0.3);
    ctx.quadraticCurveTo(0, s * 0.36, s * 0.1, s * 0.3);
    ctx.stroke();
  } else {
    ctx.arc(0, s * 0.2, s * 0.11, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  // think bubble / sleep ZZZ
  if (pose.mood === 'think') {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(s * 0.55, -s * 0.6, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.72, -s * 0.78, 8, 0, Math.PI * 2); ctx.fill();
    outline(ctx, 2);
  }
  if (pose.mood === 'sleep' && !rm) {
    ctx.font = `${s * 0.5}px serif`;
    ctx.fillStyle = '#9a8fff';
    const ph = (t / 1600) % 1;
    ctx.globalAlpha = 1 - ph;
    ctx.fillText('z', s * 0.6, -s * 0.7 - ph * 22);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** Tiny walker (city people / tester kid). */
export function drawWalker(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, t: number, rm: boolean, flip = false): void {
  const step = rm ? 0 : Math.sin(t / 150 + x) * s * 0.1;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(20,30,50,0.2)';
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.3, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(-s * 0.12, -s * 0.1 + step, s * 0.09, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * 0.12, -s * 0.1 - step, s * 0.09, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  rr(ctx, -s * 0.2, -s * 0.55, s * 0.4, s * 0.45, s * 0.15);
  ctx.fill(); outline(ctx, 2);
  ctx.fillStyle = '#ffd9b8';
  ctx.beginPath(); ctx.arc(0, -s * 0.72, s * 0.2, 0, Math.PI * 2); ctx.fill(); outline(ctx, 2);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(-s * 0.07, -s * 0.73, s * 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.07, -s * 0.73, s * 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Cached label pill (measureText is slow — never call it per frame). */
const labelWidths = new Map<string, number>();
export function labelPill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string): void {
  if (!text) return;
  let w = labelWidths.get(text);
  if (w === undefined) {
    ctx.font = 'bold 13px sans-serif';
    w = ctx.measureText(text).width + 20;
    labelWidths.set(text, w);
  }
  ctx.fillStyle = 'rgba(20,24,60,0.78)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x - w / 2, y, w, 22, 11);
  else ctx.rect(x - w / 2, y, w, 22);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 11);
}

/** Drinking-bird style lab props, plants, misc. */
export function drawBush(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, rm: boolean): void {
  const sway = rm ? 0 : Math.sin(t / 1000 + x) * 2;
  ctx.fillStyle = LEAF;
  ctx.beginPath(); ctx.arc(x - s * 0.25 + sway, y - s * 0.2, s * 0.28, 0, Math.PI * 2); ctx.fill(); outline(ctx, 2.5);
  ctx.beginPath(); ctx.arc(x + s * 0.25 + sway, y - s * 0.22, s * 0.3, 0, Math.PI * 2); ctx.fill(); outline(ctx, 2.5);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.arc(x - s * 0.3 + sway, y - s * 0.3, s * 0.1, 0, Math.PI * 2); ctx.fill();
}

export function drawPine(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, rm: boolean): void {
  const sway = rm ? 0 : Math.sin(t / 1200 + x * 2) * 2.5;
  shadow(ctx, x, y, s * 0.3);
  ctx.fillStyle = '#8a5a30';
  ctx.fillRect(x - 5, y - s * 0.25, 10, s * 0.25);
  ctx.fillStyle = LEAF_D;
  for (let i = 0; i < 3; i++) {
    const w = s * (0.5 - i * 0.11);
    const yy = y - s * 0.2 - i * s * 0.24;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + sway * (i + 1) * 0.4, yy);
    ctx.lineTo(x + sway * (i + 1) * 0.4, yy - s * 0.3);
    ctx.lineTo(x + w / 2 + sway * (i + 1) * 0.4, yy);
    ctx.closePath();
    ctx.fill(); outline(ctx, 2.5);
  }
}
