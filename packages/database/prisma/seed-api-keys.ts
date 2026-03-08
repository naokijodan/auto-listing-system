import { prisma } from '@rakuda/database';

const apiKeySettings = [
  {
    key: 'openai_api_key',
    category: 'INTEGRATION' as const,
    value: process.env.OPENAI_API_KEY || '',
    valueType: 'SECRET' as const,
    label: 'OpenAI API Key',
    description:
      'GPT-4oを使った翻訳・属性抽出に必要。sk-で始まるキーを入力してください。',
    isSecret: true,
    isReadOnly: false,
  },
  {
    key: 'openai_model',
    category: 'INTEGRATION' as const,
    value: process.env.OPENAI_MODEL || 'gpt-5-nano',
    valueType: 'STRING' as const,
    label: 'OpenAI モデル',
    description: '翻訳に使用するモデル名（gpt-5-nano 等）',
    isSecret: false,
    isReadOnly: false,
  },
];

async function main() {
  const dry = process.argv.includes('--dry-run');
  const help = process.argv.includes('--help');

  if (help) {
    console.log('Seeds SystemSetting records for OpenAI integration.');
    console.log('Usage: tsx packages/database/prisma/seed-api-keys.ts [--dry-run]');
    return;
  }

  let upserted = 0;
  for (const s of apiKeySettings) {
    if (dry) {
      console.log(`[dry-run] Would upsert setting: ${s.key}`);
      continue;
    }
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {
        value: s.value,
        valueType: s.valueType,
        label: s.label,
        description: s.description,
        isSecret: s.isSecret,
        isReadOnly: s.isReadOnly,
      },
      create: {
        key: s.key,
        category: s.category as any,
        value: s.value,
        valueType: s.valueType as any,
        defaultValue: s.value,
        label: s.label,
        description: s.description,
        isSecret: s.isSecret,
        isReadOnly: s.isReadOnly,
      },
    });
    upserted++;
  }

  console.log(`✅ Upserted ${upserted} OpenAI integration settings`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
