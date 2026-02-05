import nodemailer from 'nodemailer';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'EmailSender' });

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

let transporter: nodemailer.Transporter | null = null;

/**
 * SMTPトランスポーターを初期化
 */
function getTransporter(): nodemailer.Transporter {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP configuration missing. Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

/**
 * SMTP設定が構成されているかチェック
 */
export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * メールを送信
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    log.warn({ type: 'email_not_configured' });
    return { success: false, error: 'Email not configured' };
  }

  try {
    const transport = getTransporter();
    const from = process.env.ALERT_EMAIL_FROM || 'noreply@rakuda.example.com';

    const result = await transport.sendMail({
      from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    log.info({
      type: 'email_sent',
      messageId: result.messageId,
      to: options.to,
      subject: options.subject,
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error: any) {
    log.error({
      type: 'email_send_error',
      error: error.message,
      to: options.to,
      subject: options.subject,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * テンプレートを使用してメールを送信
 */
export async function sendTemplatedEmail(
  template: string,
  data: Record<string, unknown>,
  recipients?: string[]
): Promise<EmailResult> {
  const { subject, html, text } = generateEmailContent(template, data);

  const to = recipients || [process.env.ALERT_EMAIL_TO || 'admin@rakuda.example.com'];

  return sendEmail({ to, subject, html, text });
}

/**
 * テンプレートからメールコンテンツを生成
 */
function generateEmailContent(
  template: string,
  data: Record<string, unknown>
): { subject: string; html: string; text: string } {
  const templates: Record<string, { subject: string; html: string; text: string }> = {
    INVENTORY_OUT_OF_STOCK: {
      subject: `【RAKUDA】在庫切れアラート: ${data.title || '商品'}`,
      html: generateInventoryOutOfStockHtml(data),
      text: generateInventoryOutOfStockText(data),
    },
    INVENTORY_OUT_OF_STOCK_BATCH: {
      subject: `【RAKUDA】在庫切れアラート: ${data.count}件`,
      html: generateBatchAlertHtml('在庫切れ', data),
      text: generateBatchAlertText('在庫切れ', data),
    },
    LISTING_FAILED: {
      subject: `【RAKUDA】出品失敗: ${data.title || '商品'}`,
      html: generateListingFailedHtml(data),
      text: generateListingFailedText(data),
    },
    LISTING_FAILED_BATCH: {
      subject: `【RAKUDA】出品失敗: ${data.count}件`,
      html: generateBatchAlertHtml('出品失敗', data),
      text: generateBatchAlertText('出品失敗', data),
    },
    SCRAPE_ERROR: {
      subject: `【RAKUDA】スクレイプエラー: ${data.source || 'unknown'}`,
      html: generateScrapeErrorHtml(data),
      text: generateScrapeErrorText(data),
    },
    SCRAPE_ERROR_BATCH: {
      subject: `【RAKUDA】スクレイプエラー: ${data.count}件`,
      html: generateBatchAlertHtml('スクレイプエラー', data),
      text: generateBatchAlertText('スクレイプエラー', data),
    },
  };

  const templateContent = templates[template] || {
    subject: `【RAKUDA】アラート: ${template}`,
    html: generateGenericHtml(template, data),
    text: generateGenericText(template, data),
  };

  return templateContent;
}

// HTML テンプレート生成関数

function generateInventoryOutOfStockHtml(data: Record<string, unknown>): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
    .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
    .info { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 在庫切れアラート</h1>
    </div>
    <div class="content">
      <div class="info">
        <p><strong>商品名:</strong> ${data.title || '不明'}</p>
        <p><strong>マーケットプレイス:</strong> ${data.marketplace || '不明'}</p>
        <p><strong>検出日時:</strong> ${new Date().toLocaleString('ja-JP')}</p>
      </div>
      <p>上記商品の在庫が切れました。早急に対応してください。</p>
      ${data.deepLink ? `<a href="${data.deepLink}" class="btn">商品を確認する</a>` : ''}
    </div>
  </div>
</body>
</html>`;
}

function generateInventoryOutOfStockText(data: Record<string, unknown>): string {
  return `
【RAKUDA】在庫切れアラート

商品名: ${data.title || '不明'}
マーケットプレイス: ${data.marketplace || '不明'}
検出日時: ${new Date().toLocaleString('ja-JP')}

上記商品の在庫が切れました。早急に対応してください。

${data.deepLink ? `確認URL: ${data.deepLink}` : ''}
`;
}

function generateListingFailedHtml(data: Record<string, unknown>): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
    .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
    .info { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .error { background: #fff3cd; padding: 10px; border-radius: 4px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ 出品失敗</h1>
    </div>
    <div class="content">
      <div class="info">
        <p><strong>商品名:</strong> ${data.title || '不明'}</p>
        <p><strong>マーケットプレイス:</strong> ${data.marketplace || '不明'}</p>
        <p><strong>発生日時:</strong> ${new Date().toLocaleString('ja-JP')}</p>
      </div>
      <div class="error">
        <p><strong>エラー内容:</strong></p>
        <p>${data.error || '不明なエラー'}</p>
      </div>
      ${data.deepLink ? `<a href="${data.deepLink}" class="btn">商品を確認する</a>` : ''}
    </div>
  </div>
</body>
</html>`;
}

function generateListingFailedText(data: Record<string, unknown>): string {
  return `
【RAKUDA】出品失敗

商品名: ${data.title || '不明'}
マーケットプレイス: ${data.marketplace || '不明'}
発生日時: ${new Date().toLocaleString('ja-JP')}

エラー内容:
${data.error || '不明なエラー'}

${data.deepLink ? `確認URL: ${data.deepLink}` : ''}
`;
}

function generateScrapeErrorHtml(data: Record<string, unknown>): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ffc107; color: #212529; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
    .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
    .info { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ スクレイプエラー</h1>
    </div>
    <div class="content">
      <div class="info">
        <p><strong>ソース:</strong> ${data.source || '不明'}</p>
        <p><strong>URL:</strong> ${data.url || '不明'}</p>
        <p><strong>発生日時:</strong> ${new Date().toLocaleString('ja-JP')}</p>
      </div>
      <p><strong>エラー:</strong> ${data.error || '不明なエラー'}</p>
    </div>
  </div>
</body>
</html>`;
}

function generateScrapeErrorText(data: Record<string, unknown>): string {
  return `
【RAKUDA】スクレイプエラー

ソース: ${data.source || '不明'}
URL: ${data.url || '不明'}
発生日時: ${new Date().toLocaleString('ja-JP')}

エラー: ${data.error || '不明なエラー'}
`;
}

function generateBatchAlertHtml(alertType: string, data: Record<string, unknown>): string {
  const alerts = (data.alerts as Array<Record<string, unknown>>) || [];
  const alertsHtml = alerts
    .slice(0, 10)
    .map(
      (a) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${a.title || '不明'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${a.timestamp || ''}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
    table { width: 100%; border-collapse: collapse; background: white; }
    th { background: #e9ecef; padding: 10px; text-align: left; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 ${alertType}アラート（${data.count}件）</h1>
    </div>
    <div class="content">
      <table>
        <thead>
          <tr>
            <th>商品名</th>
            <th>発生日時</th>
          </tr>
        </thead>
        <tbody>
          ${alertsHtml}
        </tbody>
      </table>
      ${alerts.length > 10 ? `<p>他 ${alerts.length - 10} 件...</p>` : ''}
    </div>
  </div>
</body>
</html>`;
}

function generateBatchAlertText(alertType: string, data: Record<string, unknown>): string {
  const alerts = (data.alerts as Array<Record<string, unknown>>) || [];
  const alertsText = alerts
    .slice(0, 10)
    .map((a) => `- ${a.title || '不明'} (${a.timestamp || ''})`)
    .join('\n');

  return `
【RAKUDA】${alertType}アラート（${data.count}件）

${alertsText}
${alerts.length > 10 ? `\n他 ${alerts.length - 10} 件...` : ''}
`;
}

function generateGenericHtml(template: string, data: Record<string, unknown>): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6c757d; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
    pre { background: white; padding: 15px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📬 ${template}</h1>
    </div>
    <div class="content">
      <pre>${JSON.stringify(data, null, 2)}</pre>
    </div>
  </div>
</body>
</html>`;
}

function generateGenericText(template: string, data: Record<string, unknown>): string {
  return `
【RAKUDA】${template}

${JSON.stringify(data, null, 2)}
`;
}
