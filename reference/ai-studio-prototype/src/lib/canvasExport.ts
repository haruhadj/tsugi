import { TsugiList } from '../types';

/**
 * Loads an image from a URL and resolves with an HTMLImageElement
 * Includes crossOrigin handling and fallbacks
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Draws rounded rectangle on canvas context
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Wraps text onto multiple lines on canvas
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 3
) {
  const words = text.split(' ');
  let line = '';
  let linesCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      linesCount++;
      if (linesCount >= maxLines) {
        ctx.fillText(line.trim() + '...', x, y);
        return;
      }
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

/**
 * Generates an official 1200 x 630 OpenGraph social card image via HTML5 Canvas
 */
export async function generateSocialCardCanvas(list: TsugiList): Promise<HTMLCanvasElement> {
  const width = 1200;
  const height = 630;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d canvas context');

  // 1. Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#09090b');
  bgGrad.addColorStop(0.5, '#121217');
  bgGrad.addColorStop(1, '#0c0a09');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle decorative glow spheres
  const glow1 = ctx.createRadialGradient(1000, 100, 20, 1000, 100, 450);
  glow1.addColorStop(0, 'rgba(244, 63, 94, 0.18)');
  glow1.addColorStop(1, 'rgba(244, 63, 94, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, height);

  const glow2 = ctx.createRadialGradient(200, 550, 20, 200, 550, 400);
  glow2.addColorStop(0, 'rgba(245, 158, 11, 0.12)');
  glow2.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, height);

  // 3. Card Outer Border
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 2;
  roundRect(ctx, 16, 16, width - 32, height - 32, 24);
  ctx.stroke();

  // 4. Header Badge: "次 Tsugi"
  // Logo box
  const logoGrad = ctx.createLinearGradient(60, 60, 110, 110);
  logoGrad.addColorStop(0, '#f43f5e');
  logoGrad.addColorStop(1, '#ea580c');
  ctx.fillStyle = logoGrad;
  roundRect(ctx, 60, 60, 52, 52, 14);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('次', 86, 86);

  // Brand text
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Tsugi', 126, 84);

  ctx.fillStyle = '#f43f5e';
  ctx.font = '500 18px "JetBrains Mono", monospace';
  ctx.fillText(`/r/${list.slug}`, 220, 84);

  // Category Tag Pill
  if (list.category) {
    ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
    const catText = list.category.toUpperCase();
    const catWidth = ctx.measureText(catText).width + 32;
    const catX = width - 60 - catWidth;

    ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, catX, 64, catWidth, 38, 19);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fda4af';
    ctx.textAlign = 'center';
    ctx.fillText(catText, catX + catWidth / 2, 83);
  }

  // 5. Left Section: Title & Caption
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 44px "Plus Jakarta Sans", sans-serif';
  wrapText(ctx, list.title || 'Untitled Anime Curation', 60, 190, 600, 52, 2);

  if (list.caption) {
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '400 20px "Plus Jakarta Sans", sans-serif';
    wrapText(ctx, list.caption, 60, 310, 600, 30, 3);
  }

  // 6. Curator & Stats Footer Box
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(60, 480);
  ctx.lineTo(660, 480);
  ctx.stroke();

  // Author initial circle
  ctx.fillStyle = '#3f3f46';
  ctx.beginPath();
  ctx.arc(88, 528, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f43f5e';
  ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(list.authorUsername.charAt(0).toUpperCase(), 88, 528);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#f4f4f5';
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Curated by @${list.authorUsername}`, 126, 520);

  ctx.fillStyle = '#71717a';
  ctx.font = '500 16px "JetBrains Mono", monospace';
  ctx.fillText(
    `${list.items.length} titles  •  ${list.upvotes} upvotes  •  ${list.views} views`,
    126,
    546
  );

  // 7. Right Section: Cover Art Fan Collage
  const topItems = list.items.slice(0, 4);
  const coverWidth = 140;
  const coverHeight = 210;
  const startX = 730;
  const baseY = 210;

  for (let i = 0; i < topItems.length; i++) {
    const item = topItems[i];
    const offsetX = startX + i * 85;
    const offsetY = baseY + (i % 2 === 0 ? 0 : 25) - i * 8;
    const rotation = (i - 1.5) * 0.07; // subtle fan angle

    ctx.save();
    ctx.translate(offsetX + coverWidth / 2, offsetY + coverHeight / 2);
    ctx.rotate(rotation);

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 12;

    try {
      if (item.media.coverImage.large) {
        const coverImg = await loadImage(item.media.coverImage.large);
        ctx.drawImage(
          coverImg,
          -coverWidth / 2,
          -coverHeight / 2,
          coverWidth,
          coverHeight
        );
      } else {
        throw new Error('No image');
      }
    } catch {
      // Fallback placeholder card
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-coverWidth / 2, -coverHeight / 2, coverWidth, coverHeight);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        item.media.title.romaji.slice(0, 16),
        0,
        0
      );
    }

    // Border around each card
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 2;
    ctx.strokeRect(-coverWidth / 2, -coverHeight / 2, coverWidth, coverHeight);

    ctx.restore();
  }

  // 8. Bottom Right Tsugi URL Watermark
  ctx.textAlign = 'right';
  ctx.fillStyle = '#71717a';
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.fillText('tsugi.app', width - 60, height - 48);

  return canvas;
}

/**
 * Triggers a direct browser download of the 1200x630 card PNG
 */
export async function downloadSocialCardPNG(list: TsugiList): Promise<void> {
  const canvas = await generateSocialCardCanvas(list);
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `tsugi_${list.slug}_social_card.png`;
  a.click();
}

/**
 * Copies the 1200x630 card directly to system clipboard as image/png
 */
export async function copySocialCardToClipboard(list: TsugiList): Promise<boolean> {
  try {
    const canvas = await generateSocialCardCanvas(list);
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
        }
        try {
          if (navigator.clipboard && (window as any).ClipboardItem) {
            const item = new (window as any).ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (err) {
          console.warn('Clipboard write failed:', err);
          resolve(false);
        }
      }, 'image/png');
    });
  } catch (err) {
    console.error('Error generating card image:', err);
    return false;
  }
}
