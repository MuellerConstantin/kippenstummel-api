import * as crypto from 'crypto';
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { createCanvas } from 'canvas';
import { Captcha } from '../models/captcha.model';
import { InvalidCaptchaStampError } from 'src/lib/models';

@Injectable()
export class CaptchaService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  protected generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  protected generateText() {
    return crypto.randomBytes(3).toString('hex');
  }

  async generateCaptcha(scope: 'registration' | 'transfer'): Promise<Captcha> {
    const id = this.generateId();
    const text = this.generateText();
    const expiresIn = this.configService.get<number>('CAPTCHA_EXPIRES_IN')!;

    const scale = 3;
    const width = 200 * scale;
    const height = 70 * scale;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Textured background

    // Light gradient
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, '#f7f7f7');
    g.addColorStop(1, '#e9e9ea');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // Subtle speckle noise
    const speckCount = Math.floor((width * height) / (200 * scale));
    for (let i = 0; i < speckCount; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
      const r = Math.random() * (1.5 * scale);
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Overlaid arcs/bezier distortions

    const arcCount = 6;

    for (let i = 0; i < arcCount; i++) {
      ctx.beginPath();
      ctx.lineWidth = (0.8 + Math.random() * 1.8) * scale;
      ctx.strokeStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.25})`;
      const startX = Math.random() * width * 0.2;
      const startY = Math.random() * height;
      const cp1x = Math.random() * width;
      const cp1y = Math.random() * height;
      const cp2x = Math.random() * width;
      const cp2y = Math.random() * height;
      const endX = width - Math.random() * width * 0.2;
      const endY = Math.random() * height;
      ctx.moveTo(startX, startY);
      // cubic bezier - nice wavy lines over chars
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      ctx.stroke();
    }

    // Draw characters individually (with per-char transforms)

    // Fonts: rotate and skew each, add stroke and shadow
    const fonts = ['Sans', 'Serif', 'Arial', 'Verdana', 'Tahoma']; // Mix fonts
    ctx.textBaseline = 'middle';

    const charSpacing = width / (text.length + 1);

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      // Offscreen canvas per-char to allow later compositing or per-char mask
      const charCanvas = createCanvas(
        Math.floor(charSpacing * 1.6),
        Math.floor(height),
      );
      const chCtx = charCanvas.getContext('2d');

      // Random font size and weight
      const fontSize = Math.floor((28 + Math.random() * 8) * scale);
      const fontFamily = fonts[Math.floor(Math.random() * fonts.length)];
      chCtx.font = `${fontSize}px ${fontFamily}`;
      chCtx.textBaseline = 'middle';

      // Shadow to break thresholding
      chCtx.shadowColor = 'rgba(0,0,0,0.25)';
      chCtx.shadowBlur = 4 * scale;
      chCtx.shadowOffsetX = (Math.random() - 0.5) * 2 * scale;
      chCtx.shadowOffsetY = (Math.random() - 0.5) * 2 * scale;

      // Fill & stroke with slight gradient
      const grad = chCtx.createLinearGradient(0, 0, charCanvas.width, 0);
      grad.addColorStop(0, '#222');
      grad.addColorStop(1, '#444');
      chCtx.fillStyle = grad;

      // Small rotation & shear/skew
      chCtx.save();
      const cx = charCanvas.width / 2;
      const cy = height / 2;
      chCtx.translate(cx, cy);
      const rot = (Math.random() - 0.5) * 0.6; // Rotation up to ~34 degrees
      const skewX = (Math.random() - 0.5) * 0.6; // Skew
      chCtx.rotate(rot);
      chCtx.transform(1, 0, skewX, 1, 0, 0);

      // Draw char (centered)
      chCtx.fillText(ch, -cx + (Math.random() - 0.5) * 4 * scale, 0);
      // Stroke slightly to create edge noise
      chCtx.lineWidth = Math.max(1, scale * 0.6);
      chCtx.strokeStyle = 'rgba(10,10,10,0.35)';
      chCtx.strokeText(ch, -cx + (Math.random() - 0.5) * 4 * scale, 0);

      chCtx.restore();

      // Composite the char onto main canvas with some random offset and maybe partially cover it
      const x =
        charSpacing * (i + 1) -
        charCanvas.width / 2 +
        (Math.random() - 0.5) * 8 * scale;
      const y = 0;
      // Occasionally use composite to create tricky overlaps
      if (Math.random() < 0.25) ctx.globalCompositeOperation = 'multiply';
      else ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(charCanvas, x, y, charCanvas.width, height);
      ctx.globalCompositeOperation = 'source-over';
    }

    // Add occluding patches (semi-transparent blobs)

    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      const rw = (20 + Math.random() * 60) * scale;
      const rh = (10 + Math.random() * 40) * scale;
      ctx.fillStyle = `rgba(230,230,230,${0.18 + Math.random() * 0.28})`;
      ctx.ellipse(rx, ry, rw, rh, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add many small scattered dots and short lines (fine-grain noise)

    const dotCount = Math.floor((width * height) / (80 * scale));
    for (let i = 0; i < dotCount; i++) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.14})`;
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      ctx.arc(rx, ry, Math.random() * 1.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw crossing thin lines (to break segmentation)

    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.lineWidth = (0.4 + Math.random() * 1.2) * scale;
      ctx.strokeStyle = `rgba(0,0,0,${0.06 + Math.random() * 0.18})`;
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }

    // Final non-linear pixel warp (sine-wave)

    // This remaps pixels horizontally and vertically to break OCR.
    const src = ctx.getImageData(0, 0, width, height);
    const dst = ctx.createImageData(width, height);
    const ampX = 6 * scale + Math.random() * 6 * scale; // Horizontal amplitude
    const ampY = 6 * scale + Math.random() * 6 * scale; // Vertical amplitude
    const freqX = (2 + Math.random() * 3) / width;
    const freqY = (2 + Math.random() * 3) / height;
    const phase = Math.random() * Math.PI * 2;

    // Helper to copy pixel safely
    function copyPixel(sx: number, sy: number, dx: number, dy: number) {
      if (sx < 0 || sx >= width || sy < 0 || sy >= height) return;
      const sIdx = (Math.floor(sy) * width + Math.floor(sx)) * 4;
      const dIdx = (dy * width + dx) * 4;
      dst.data[dIdx] = src.data[sIdx];
      dst.data[dIdx + 1] = src.data[sIdx + 1];
      dst.data[dIdx + 2] = src.data[sIdx + 2];
      dst.data[dIdx + 3] = src.data[sIdx + 3];
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Compute source coordinates with combined sine displacements
        const offsetX =
          Math.sin(y * freqX + phase) * ampX +
          Math.sin(x * freqY + phase * 0.7) * (ampX * 0.3);
        const offsetY =
          Math.sin(x * freqY + phase) * ampY +
          Math.sin(y * freqX * 1.2 + phase * 0.4) * (ampY * 0.3);
        const sx = x + offsetX;
        const sy = y + offsetY;
        // Nearest-neighbor sampling (fast). You can bilinear interpolate if desired.
        copyPixel(sx, sy, x, y);
      }
    }

    ctx.putImageData(dst, 0, 0);

    const buffer = canvas.toBuffer('image/png');

    await this.cacheManager.set(
      `captcha:${id}`,
      { text, scope },
      expiresIn * 1000,
    );

    return { id, content: buffer, contentType: 'image/png' };
  }

  async validateCaptcha(
    id: string,
    text: string,
    scope: 'registration' | 'transfer',
  ): Promise<void> {
    const stored = await this.cacheManager.get<{ text: string; scope: string }>(
      `captcha:${id}`,
    );

    const isValid = stored?.text === text && stored?.scope === scope;

    if (!isValid) {
      throw new InvalidCaptchaStampError();
    }

    await this.cacheManager.del(`captcha:${id}`);
  }
}
