import { getOpenAIClient } from '../translator';
import type { FieldDefinition } from './field-definitions';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'item-specifics-ai' });

export interface AIExtractionResult {
  specifics: Record<string, string>;
  source: Record<string, 'ai'>;
}

function buildPrompt(params: {
  title: string;
  description: string;
  category: string;
  fields: FieldDefinition[];
  existingData: Record<string, string>;
}): string {
  const { title, description, category, fields, existingData } = params;
  const lines: string[] = [];

  lines.push('You are an expert eBay Item Specifics extractor for Japanese sellers.');
  lines.push('');
  lines.push('### INPUT DATA');
  lines.push(`Category: ${category}`);
  lines.push(`Title: ${title}`);
  lines.push(`Description: ${description}`);
  lines.push('');

  // 既存データ
  const existingKeys = Object.keys(existingData).filter(k => existingData[k]);
  if (existingKeys.length > 0) {
    lines.push('### ALREADY CONFIRMED DATA (from rule-based extraction)');
    lines.push('DO NOT overwrite these unless clearly incorrect:');
    for (const key of existingKeys) {
      lines.push(`- ${key}: ${existingData[key]}`);
    }
    lines.push('');
  }

  // 抽出対象フィールド
  const requiredFields = fields.filter(f => f.fieldType === 'required').map(f => f.fieldName);
  const recommendedFields = fields.filter(f => f.fieldType === 'recommended').map(f => f.fieldName);

  lines.push('### FIELDS TO EXTRACT');
  if (requiredFields.length > 0) lines.push(`Required: ${requiredFields.join(', ')}`);
  if (recommendedFields.length > 0) lines.push(`Recommended: ${recommendedFields.join(', ')}`);
  lines.push('');

  // Notes
  const fieldsWithNotes = fields.filter(f => f.notes);
  if (fieldsWithNotes.length > 0) {
    lines.push('### FIELD NOTES');
    for (const f of fieldsWithNotes) {
      lines.push(`- ${f.fieldName}: ${f.notes}`);
    }
    lines.push('');
  }

  // 正規化ルール
  lines.push('### RULES');
  lines.push('- Values must be in English');
  lines.push('- Normalize to eBay standard terms');
  lines.push('- Country of Origin = manufacturing country (NOT brand HQ)');
  lines.push('- For unknown required fields: "Does not apply" (Brand: "Unbranded")');
  lines.push('- For unknown recommended fields: empty string ""');
  lines.push('- Do NOT guess or hallucinate values');
  lines.push('');

  lines.push('### OUTPUT');
  lines.push('Return ONLY a valid JSON object with field names as keys and extracted values.');
  lines.push('No markdown, no explanation, no code fences.');

  return lines.join('\n');
}

export async function extractByAI(params: {
  title: string;
  description: string;
  category: string;
  fields: FieldDefinition[];
  existingData: Record<string, string>;
}): Promise<AIExtractionResult> {
  const client = await getOpenAIClient();
  if (!client) {
    log.warn({ type: 'openai_not_configured' });
    return { specifics: {}, source: {} };
  }

  const prompt = buildPrompt(params);

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-5-nano',
    messages: [
      { role: 'system', content: 'You are an expert eBay Item Specifics extractor. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content || '{}';
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    log.error({ type: 'ai_response_parse_error', content: content.substring(0, 200) });
    return { specifics: {}, source: {} };
  }

  const specifics: Record<string, string> = {};
  const source: Record<string, 'ai'> = {};

  // フィールド定義にマッチするキーのみ抽出
  for (const field of params.fields) {
    const value = (parsed as any)[field.fieldName];
    if (value && typeof value === 'string' && value.trim() !== '') {
      specifics[field.fieldName] = value.trim();
      source[field.fieldName] = 'ai';
    }
  }

  return { specifics, source };
}
