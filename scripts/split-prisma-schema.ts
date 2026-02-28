#!/usr/bin/env npx tsx
/**
 * Prismaスキーマ分割スクリプト
 *
 * schema.prismaを prismaSchemaFolder 対応のマルチファイル構成に分割する。
 * 分割先: packages/database/prisma/schema/
 *
 * ファイル構成:
 *   base.prisma     - generator, datasource
 *   common.prisma   - コアモデル（Product, Listing, Order等）
 *   ebay.prisma     - eBay関連モデル
 *   shopify.prisma  - Shopify関連モデル
 *   etsy.prisma     - Etsy関連モデル
 *   joom.prisma     - Joom関連モデル
 *   depop.prisma    - Depop関連モデル
 *   marketplace.prisma - マーケットプレイス共通（Credential, OAuth等）
 *   enrichment.prisma  - エンリッチメント関連
 *   notifications.prisma - 通知関連
 *   auth.prisma     - 認証・ユーザー関連
 *   monitoring.prisma - メトリクス・監視関連
 *   operations.prisma - ワークフロー・バッチ・AI等
 */

import * as fs from 'fs';
import * as path from 'path';

const SCHEMA_PATH = path.resolve(__dirname, '../packages/database/prisma/schema.prisma');
const OUTPUT_DIR = path.resolve(__dirname, '../packages/database/prisma/schema');

// ドメイン分類ルール
const DOMAIN_RULES: Record<string, (name: string) => boolean> = {
  'ebay.prisma': (name) =>
    /^Ebay|^EbayCategoryMapping|^EbayListing|^EbayAutoRelist|^EbayBulkOp/i.test(name),

  'shopify.prisma': (name) =>
    /^Shopify/i.test(name),

  'etsy.prisma': (name) =>
    /^Etsy/i.test(name),

  'joom.prisma': (name) =>
    /^Joom/i.test(name),

  'depop.prisma': (name) =>
    /^Depop/i.test(name),

  'marketplace.prisma': (name) =>
    /^MarketplaceCredential$|^OAuthState$|^MarketplaceSyncState$|^MarketplaceSyncSetting$|^MarketplaceSyncStatus$|^InventoryEvent$|^InventoryEventType$|^SupplierSource$|^SupplyType$|^InventoryMode$/i.test(name),

  'enrichment.prisma': (name) =>
    /^Enrichment|^ProhibitedKeyword|^ProhibitedCategory|^ProhibitedSeverity|^KeywordMatchType|^ValidationResult/i.test(name),

  'notifications.prisma': (name) =>
    /^Notification(?!Event$)|^AlertRule$|^AlertLog$|^AlertIncident|^AlertEscalation|^AlertNotification|^AlertCondition|^AlertChannel/i.test(name),

  'auth.prisma': (name) =>
    /^User$|^Role$|^Permission$|^UserRole$|^UserSession$|^UserApiKey$|^UserAuditLog$|^UserStatus$|^PermissionAction$|^SSO|^SecurityEvent$|^SecurityEventType$|^SecurityEventSeverity$|^LoginAttempt$|^LoginFailureReason$|^DeviceSession$|^DeviceType$|^TwoFactor|^PasswordPolicy$|^PasswordHistory$|^SecurityAuditLog$|^SecurityAction$|^SecurityCategory$|^AuditStatus$|^IpWhitelist$|^IpType$|^IpScope$|^SecuritySetting$|^SecuritySettingScope$|^Organization|^InvitationStatus$/i.test(name),

  'monitoring.prisma': (name) =>
    /^Metric|^SystemHealth$|^HealthStatus$|^PerformanceMetric$|^PerformanceMetricType$|^CacheStatus$|^CdnConfig$|^CdnProvider$|^CdnConfigStatus$|^QueryOptimization|^OptimizationType$|^ListingPerformance$|^PerformanceScore|^PerformanceSnapshot$|^PerformanceThreshold$|^ThresholdMetric$|^ThresholdOperator$|^ThresholdAction$|^LowPerformanceFlag$|^FlagStatus$|^CategoryBenchmark$/i.test(name),

  'operations.prisma': (name) =>
    /^Workflow(?!Rule$)|^ApprovalRequest$|^ApprovalAction$|^ApprovalRequest|^ApprovalAction|^Approval|^AutomationRule$|^AutomationExecution$|^AutomationTrigger$|^AutomationAction$|^ScheduleType$|^ExecutionStatus$|^SafetySettings$|^ConditionLogic$|^AutomationExecutionStatus$|^Ai|^PricePrediction$|^DemandForecast$|^ProductRecommendation$|^AiTraining|^AiPrediction|^PriceOptimization$|^CompetitorPrice$|^BatchJob$|^BatchExecution$|^BatchStep$|^BatchEvent$|^BatchJobType$|^BatchExecutionStatus$|^BatchStepStatus$|^BatchProgressType$|^BatchEventType$|^BulkAction$|^BulkActionType$|^BulkActionStatus$|^ActionHistory$|^ActionSource$|^ImprovementSuggestion$|^SuggestionType$|^SuggestionStatus$/i.test(name),
};

interface SchemaBlock {
  type: 'model' | 'enum' | 'generator' | 'datasource' | 'comment';
  name: string;
  content: string;
  precedingComments: string;
}

function parseSchema(content: string): SchemaBlock[] {
  const lines = content.split('\n');
  const blocks: SchemaBlock[] = [];
  let currentBlock: SchemaBlock | null = null;
  let braceCount = 0;
  let commentBuffer = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Block start
    const blockMatch = trimmed.match(/^(model|enum|generator|datasource)\s+(\w+)\s*\{/);
    if (blockMatch && braceCount === 0) {
      const [, type, name] = blockMatch;
      currentBlock = {
        type: type as SchemaBlock['type'],
        name,
        content: line + '\n',
        precedingComments: commentBuffer,
      };
      commentBuffer = '';
      braceCount = 1;
      continue;
    }

    if (currentBlock) {
      currentBlock.content += line + '\n';
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;

      if (braceCount === 0) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
    } else {
      // Collect comments between blocks
      if (trimmed.startsWith('//') || trimmed === '') {
        commentBuffer += line + '\n';
      } else {
        commentBuffer = '';
      }
    }
  }

  return blocks;
}

function classifyBlock(block: SchemaBlock): string {
  if (block.type === 'generator' || block.type === 'datasource') {
    return 'base.prisma';
  }

  for (const [file, matcher] of Object.entries(DOMAIN_RULES)) {
    if (matcher(block.name)) {
      return file;
    }
  }

  return 'common.prisma';
}

function main() {
  console.log('='.repeat(60));
  console.log('  Prismaスキーマ分割');
  console.log('='.repeat(60));

  const content = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  console.log(`\n  元ファイル: ${SCHEMA_PATH}`);
  console.log(`  行数: ${content.split('\n').length}`);

  const blocks = parseSchema(content);
  console.log(`  ブロック数: ${blocks.length}`);

  // 分類
  const fileContents: Record<string, string> = {};
  const fileBlockCounts: Record<string, number> = {};

  for (const block of blocks) {
    const targetFile = classifyBlock(block);

    if (!fileContents[targetFile]) {
      fileContents[targetFile] = '';
      fileBlockCounts[targetFile] = 0;
    }

    // コメントヘッダーを追加
    if (block.precedingComments.trim()) {
      fileContents[targetFile] += block.precedingComments;
    }

    fileContents[targetFile] += block.content + '\n';
    fileBlockCounts[targetFile]++;
  }

  // base.prismaのヘッダー
  const baseHeader = `// Prisma Schema - Base Configuration
// Auto-generated by split-prisma-schema.ts
// Do not edit manually - run the split script to regenerate

`;

  fileContents['base.prisma'] = baseHeader + (fileContents['base.prisma'] || '');

  // 各ファイルにヘッダー追加
  const fileHeaders: Record<string, string> = {
    'common.prisma': '// Prisma Schema - Common Models (Product, Listing, Order, etc.)',
    'ebay.prisma': '// Prisma Schema - eBay Domain Models',
    'shopify.prisma': '// Prisma Schema - Shopify Domain Models',
    'etsy.prisma': '// Prisma Schema - Etsy Domain Models',
    'joom.prisma': '// Prisma Schema - Joom Domain Models',
    'depop.prisma': '// Prisma Schema - Depop Domain Models',
    'marketplace.prisma': '// Prisma Schema - Marketplace Common (Credentials, OAuth, Sync)',
    'enrichment.prisma': '// Prisma Schema - Enrichment Pipeline',
    'notifications.prisma': '// Prisma Schema - Notifications & Alerts',
    'auth.prisma': '// Prisma Schema - Authentication & Users',
    'monitoring.prisma': '// Prisma Schema - Monitoring & Metrics',
    'operations.prisma': '// Prisma Schema - Workflows, AI, Batch Operations',
  };

  for (const [file, header] of Object.entries(fileHeaders)) {
    if (fileContents[file]) {
      fileContents[file] = header + '\n\n' + fileContents[file];
    }
  }

  // 出力ディレクトリ作成
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // ファイル書き出し
  console.log('\n  分割結果:');
  let totalLines = 0;

  for (const [file, content] of Object.entries(fileContents).sort()) {
    const filePath = path.join(OUTPUT_DIR, file);
    fs.writeFileSync(filePath, content);
    const lineCount = content.split('\n').length;
    totalLines += lineCount;
    console.log(`    ${file.padEnd(25)} ${String(lineCount).padStart(5)} lines  (${fileBlockCounts[file] || 0} blocks)`);
  }

  console.log(`\n  合計: ${totalLines} lines / ${Object.keys(fileContents).length} files`);
  console.log(`\n  出力先: ${OUTPUT_DIR}/`);
  console.log('\n  次のステップ:');
  console.log('  1. packages/database/package.json の prisma.schema を更新');
  console.log('  2. npx prisma generate で検証');
  console.log('  3. npx prisma migrate dev --name schema-split で確認');
}

main();
