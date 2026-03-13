import { describe, it, expect } from 'vitest';
import {
  NotificationChannelSchema,
  EventTypeSchema,
  NotificationSettingsResponseSchema,
  type ChannelId,
} from '../types';

const makeChannel = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'ch_1',
  channel: 'SLACK' as ChannelId,
  name: 'Main Channel',
  webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXX',
  enabledTypes: ['SCRAPE_COMPLETE', 'PUBLISH_COMPLETE'],
  minSeverity: 'INFO' as const,
  marketplaceFilter: ['JOOM', 'EBAY'] as const,
  isActive: true,
  errorCount: 0,
  ...overrides,
});

describe('NotificationChannelSchema', () => {
  it('validates a correct Slack/Discord/Email channel', () => {
    const input = makeChannel();
    const parsed = NotificationChannelSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it('validates a correct LINE channel with token', () => {
    const input = makeChannel({ channel: 'LINE', token: 'line-token', webhookUrl: undefined });
    const parsed = NotificationChannelSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid channel enum', () => {
    const input = makeChannel({ channel: 'TEAMS' });
    // @ts-expect-error - invalid enum on purpose
    expect(NotificationChannelSchema.safeParse(input).success).toBe(false);
  });

  it('rejects invalid minSeverity enum', () => {
    const input = makeChannel({ minSeverity: 'LOW' });
    // @ts-expect-error - invalid enum on purpose
    expect(NotificationChannelSchema.safeParse(input).success).toBe(false);
  });

  it('rejects non-number errorCount', () => {
    const input = makeChannel({ errorCount: '0' });
    // @ts-expect-error - wrong type on purpose
    expect(NotificationChannelSchema.safeParse(input).success).toBe(false);
  });
});

describe('EventTypeSchema', () => {
  it('validates a correct event type', () => {
    const input = { value: 'SCRAPE_COMPLETE', label: 'スクレイピング完了', category: 'スクレイピング' };
    const parsed = EventTypeSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it('rejects when required fields are missing', () => {
    const input = { value: 'SCRAPE_COMPLETE', category: 'スクレイピング' } as unknown;
    const parsed = EventTypeSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });
});

describe('NotificationSettingsResponseSchema', () => {
  it('validates a correct response with array of channels', () => {
    const input = {
      success: true,
      data: [makeChannel(), makeChannel({ id: 'ch_2', channel: 'DISCORD' })],
    };
    const parsed = NotificationSettingsResponseSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.data.length).toBe(2);
    }
  });

  it('rejects when data is not an array', () => {
    const input = { success: true, data: makeChannel() } as unknown;
    const parsed = NotificationSettingsResponseSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('rejects when a channel item is invalid', () => {
    const badChannel = makeChannel({ channel: 'INVALID' });
    // @ts-expect-error - invalid enum on purpose
    const input = { success: true, data: [badChannel] };
    const parsed = NotificationSettingsResponseSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });
});

