import { Page } from 'puppeteer';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'captcha-detector' });

/**
 * ページ内のCAPTCHA/ブロックを検出
 */
export async function detectCaptchaOrBlock(page: Page, sourceType: string): Promise<{
  captcha: boolean;
  blocked: boolean;
  reason?: string;
}> {
  const result = await page.evaluate(() => {
    const html = document.body.innerHTML.toLowerCase();
    const title = document.title.toLowerCase();

    // CAPTCHA検出パターン
    const captchaPatterns = [
      'captcha',
      'recaptcha',
      'hcaptcha',
      '認証',
      'robot',
      'ロボット',
      'are you a human',
      'verify you are human',
      'unusual traffic',
      '不正なアクセス',
    ];
    const hasCaptcha = captchaPatterns.some(p => html.includes(p) || title.includes(p)) ||
      document.querySelector('#captchacharacters') !== null ||
      document.querySelector('.g-recaptcha') !== null ||
      document.querySelector('[data-sitekey]') !== null;

    // ブロック/Ban検出パターン
    const blockPatterns = [
      'access denied',
      'アクセスが拒否',
      'blocked',
      'ブロック',
      'forbidden',
      '403',
      'too many requests',
      '429',
      'rate limit',
      'サービスを利用できません',
    ];
    const isBlocked = blockPatterns.some(p => html.includes(p) || title.includes(p));

    return { hasCaptcha, isBlocked };
  });

  if (result.hasCaptcha) {
    log.warn({ type: 'captcha_detected', sourceType });
    return { captcha: true, blocked: false, reason: 'CAPTCHA detected' };
  }

  if (result.isBlocked) {
    log.warn({ type: 'access_blocked', sourceType });
    return { captcha: false, blocked: true, reason: 'Access blocked/banned' };
  }

  return { captcha: false, blocked: false };
}

