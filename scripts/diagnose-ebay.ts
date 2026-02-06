#!/usr/bin/env npx ts-node

/**
 * eBay API診断ツール
 *
 * 使用方法:
 * npx ts-node scripts/diagnose-ebay.ts
 */

import * as readline from 'readline';

const EBAY_SANDBOX_API = 'https://api.sandbox.ebay.com';
const EBAY_PRODUCTION_API = 'https://api.ebay.com';

interface DiagnosticResult {
  step: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

const results: DiagnosticResult[] = [];

function log(step: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) {
  const icons = { pass: '✅', fail: '❌', warning: '⚠️' };
  console.log(`${icons[status]} ${step}: ${message}`);
  if (details) {
    console.log('   詳細:', JSON.stringify(details, null, 2).split('\n').join('\n   '));
  }
  results.push({ step, status, message, details });
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function testClientCredentials(clientId: string, clientSecret: string, isSandbox: boolean): Promise<string | null> {
  const baseUrl = isSandbox ? EBAY_SANDBOX_API : EBAY_PRODUCTION_API;
  const authUrl = baseUrl.replace('api.', 'auth.') + '/identity/v1/oauth2/token';

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    });

    const data = await response.json() as { access_token?: string; error?: string; error_description?: string };

    if (response.ok && data.access_token) {
      log('Client Credentials', 'pass', 'Application Token取得成功');
      return data.access_token;
    } else {
      log('Client Credentials', 'fail', 'Application Token取得失敗', {
        status: response.status,
        error: data.error,
        description: data.error_description,
      });
      return null;
    }
  } catch (error: any) {
    log('Client Credentials', 'fail', 'ネットワークエラー', { error: error.message });
    return null;
  }
}

async function testUserToken(accessToken: string, isSandbox: boolean): Promise<boolean> {
  const baseUrl = isSandbox ? EBAY_SANDBOX_API : EBAY_PRODUCTION_API;
  const testUrl = `${baseUrl}/sell/account/v1/privilege`;

  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      log('User Token', 'pass', 'Sell Account API呼び出し成功', data);
      return true;
    } else {
      log('User Token', 'fail', 'API呼び出し失敗', {
        status: response.status,
        statusText: response.statusText,
        error: data,
      });

      // よくあるエラーの診断
      if (response.status === 401) {
        console.log('\n📋 診断: トークンが無効または期限切れです');
        console.log('   対処法: eBay Developer Portalで新しいUser Tokenを取得してください');
      } else if (response.status === 403) {
        console.log('\n📋 診断: 権限が不足しています');
        console.log('   対処法: OAuth Scopesに sell.account が含まれているか確認してください');
      }

      return false;
    }
  } catch (error: any) {
    log('User Token', 'fail', 'ネットワークエラー', { error: error.message });
    return false;
  }
}

async function testRefreshToken(clientId: string, clientSecret: string, refreshToken: string, isSandbox: boolean): Promise<string | null> {
  const baseUrl = isSandbox ? EBAY_SANDBOX_API : EBAY_PRODUCTION_API;
  const authUrl = baseUrl.replace('api.', 'auth.') + '/identity/v1/oauth2/token';

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}&scope=https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account`,
    });

    const data = await response.json() as { access_token?: string; error?: string; error_description?: string };

    if (response.ok && data.access_token) {
      log('Refresh Token', 'pass', '新しいAccess Token取得成功');
      return data.access_token;
    } else {
      log('Refresh Token', 'fail', 'トークン更新失敗', {
        status: response.status,
        error: data.error,
        description: data.error_description,
      });

      if (data.error === 'invalid_grant') {
        console.log('\n📋 診断: Refresh Tokenが無効または期限切れです');
        console.log('   対処法: eBay Developer Portalで新しいUser Tokenを取得してください');
        console.log('   URL: https://developer.ebay.com/my/auth/?env=' + (isSandbox ? 'sandbox' : 'production'));
      }

      return null;
    }
  } catch (error: any) {
    log('Refresh Token', 'fail', 'ネットワークエラー', { error: error.message });
    return null;
  }
}

async function main() {
  console.log('========================================');
  console.log('eBay API 診断ツール');
  console.log('========================================\n');

  // 環境選択
  const envChoice = await prompt('環境を選択 (1: Sandbox, 2: Production): ');
  const isSandbox = envChoice !== '2';
  console.log(`\n選択された環境: ${isSandbox ? 'Sandbox' : 'Production'}\n`);

  log('環境', 'pass', isSandbox ? 'Sandbox環境でテスト' : 'Production環境でテスト');

  // Client ID入力
  const clientId = await prompt('Client ID (App ID): ');
  if (!clientId) {
    log('Client ID', 'fail', 'Client IDが入力されていません');
    return;
  }
  log('Client ID', 'pass', `入力されました (${clientId.substring(0, 10)}...)`);

  // Client Secret入力
  const clientSecret = await prompt('Client Secret (Cert ID): ');
  if (!clientSecret) {
    log('Client Secret', 'fail', 'Client Secretが入力されていません');
    return;
  }
  log('Client Secret', 'pass', '入力されました');

  // Step 1: Client Credentialsテスト
  console.log('\n--- Step 1: Application Token テスト ---');
  const appToken = await testClientCredentials(clientId, clientSecret, isSandbox);

  if (!appToken) {
    console.log('\n❌ Client ID/Secretに問題があります。');
    console.log('確認事項:');
    console.log('1. Client IDとSecretが正しいか');
    console.log('2. 選択した環境（Sandbox/Production）が正しいか');
    console.log('3. eBay Developer Portalでアプリが有効か');
    return;
  }

  // User Token確認
  const hasUserToken = await prompt('\nUser Token (Access Token)はありますか？ (y/n): ');

  if (hasUserToken.toLowerCase() === 'y') {
    const accessToken = await prompt('Access Token: ');

    console.log('\n--- Step 2: User Token テスト ---');
    const userTokenValid = await testUserToken(accessToken, isSandbox);

    if (!userTokenValid) {
      // Refresh Tokenを試す
      const hasRefreshToken = await prompt('\nRefresh Tokenはありますか？ (y/n): ');

      if (hasRefreshToken.toLowerCase() === 'y') {
        const refreshToken = await prompt('Refresh Token: ');

        console.log('\n--- Step 3: Refresh Token テスト ---');
        const newAccessToken = await testRefreshToken(clientId, clientSecret, refreshToken, isSandbox);

        if (newAccessToken) {
          console.log('\n--- Step 4: 新しいAccess Tokenでテスト ---');
          await testUserToken(newAccessToken, isSandbox);

          console.log('\n✅ 新しいAccess Tokenを取得しました。');
          console.log('このトークンをRAKUDAに登録してください:');
          console.log(`\ncurl -X POST http://localhost:3000/api/marketplaces/credentials \\
  -H "Content-Type: application/json" \\
  -d '{
    "marketplace": "EBAY",
    "credentials": {
      "clientId": "${clientId}",
      "clientSecret": "${clientSecret}",
      "accessToken": "${newAccessToken}",
      "refreshToken": "${refreshToken}"
    }
  }'`);
        }
      }
    } else {
      console.log('\n✅ eBay APIへの接続は正常です！');
    }
  } else {
    console.log('\n⚠️ User Tokenが必要です。');
    console.log('取得方法: https://developer.ebay.com/my/auth/?env=' + (isSandbox ? 'sandbox' : 'production'));
    console.log('\n必要なScopes:');
    console.log('- https://api.ebay.com/oauth/api_scope/sell.inventory');
    console.log('- https://api.ebay.com/oauth/api_scope/sell.account');
    console.log('- https://api.ebay.com/oauth/api_scope/sell.fulfillment');
  }

  // 結果サマリー
  console.log('\n========================================');
  console.log('診断結果サマリー');
  console.log('========================================');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;

  console.log(`✅ 成功: ${passed}`);
  console.log(`❌ 失敗: ${failed}`);
  console.log(`⚠️ 警告: ${warnings}`);
}

main().catch(console.error);
