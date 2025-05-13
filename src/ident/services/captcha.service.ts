import * as crypto from 'crypto';
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { createCanvas } from 'canvas';
import { Captcha } from '../models/captcha.model';
import { InvalidCaptchaStampError } from '../../common/models';

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
    return crypto.randomBytes(4).toString('hex');
  }

  async generateCaptcha(): Promise<Captcha> {
    const id = this.generateId();
    const text = this.generateText();
    const expiresIn = this.configService.get<number>('CAPTCHA_EXPIRES_IN')!;

    const scale = 3;
    const width = 200 * scale;
    const height = 70 * scale;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 1.5 * scale;

    // Noise
    for (let index = 0; index < 10; index++) {
      ctx.strokeStyle = `rgba(0,0,0,${Math.random()})`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }

    // Text
    ctx.font = `${32 * scale}px Sans`;
    ctx.fillStyle = '#333';
    const charSpacing = width / (text.length + 1);

    for (let index = 0; index < text.length; index++) {
      const char = text[index];
      const x = charSpacing * (index + 1);
      const y = 45 * scale + Math.random() * (10 * scale);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((Math.random() - 0.5) * 0.5);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
    const buffer = canvas.toBuffer('image/png');

    await this.cacheManager.set(`captcha:${id}`, text, expiresIn * 1000);

    return { id, content: buffer, contentType: 'image/png' };
  }

  async validateCaptcha(id: string, text: string): Promise<void> {
    const storedText = await this.cacheManager.get<string>(`captcha:${id}`);

    const isValid = storedText === text;

    if (!isValid) {
      throw new InvalidCaptchaStampError();
    }

    await this.cacheManager.del(`captcha:${id}`);
  }
}
