/**
 * i18n インフラストラクチャ
 * Phase 71: 多言語対応強化
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ja, TranslationKeys } from './translations/ja';
import { en } from './translations/en';

// サポートする言語
export const SUPPORTED_LOCALES = ['ja', 'en'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

// デフォルト言語
export const DEFAULT_LOCALE: Locale = 'ja';

// 言語表示名
export const LOCALE_NAMES: Record<Locale, string> = {
  ja: '日本語',
  en: 'English',
};

// 翻訳データ
const translations: Record<Locale, TranslationKeys> = {
  ja,
  en,
};

// i18n コンテキストの型
interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency?: string) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (date: Date | string) => string;
}

// コンテキスト作成
const I18nContext = createContext<I18nContextType | null>(null);

// ローカルストレージキー
const LOCALE_STORAGE_KEY = 'rakuda_locale';

// ネストされたキーから値を取得
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // キーが見つからない場合はキーそのものを返す
    }
  }

  return typeof current === 'string' ? current : path;
}

// パラメータを置換
function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;

  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return params[key]?.toString() ?? `{{${key}}}`;
  });
}

// i18n プロバイダー
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [isHydrated, setIsHydrated] = useState(false);

  // クライアントサイドでローカルストレージから言語を復元
  useEffect(() => {
    const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale)) {
      setLocaleState(savedLocale);
    } else {
      // ブラウザの言語設定を確認
      const browserLocale = navigator.language.split('-')[0] as Locale;
      if (SUPPORTED_LOCALES.includes(browserLocale)) {
        setLocaleState(browserLocale);
      }
    }
    setIsHydrated(true);
  }, []);

  // 言語を設定
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  // 翻訳関数
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const translation = getNestedValue(translations[locale] as Record<string, unknown>, key);
    return interpolate(translation, params);
  }, [locale]);

  // 数値フォーマット
  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions): string => {
    return new Intl.NumberFormat(locale, options).format(value);
  }, [locale]);

  // 通貨フォーマット
  const formatCurrency = useCallback((value: number, currency: string = 'JPY'): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(value);
  }, [locale]);

  // 日付フォーマット
  const formatDate = useCallback((date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    };
    return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
  }, [locale]);

  // 相対時間フォーマット
  const formatRelativeTime = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) {
      return t('datetime.justNow');
    } else if (diffMin < 60) {
      return t('datetime.minutesAgo', { minutes: diffMin });
    } else if (diffHour < 24) {
      return t('datetime.hoursAgo', { hours: diffHour });
    } else if (diffDay < 7) {
      return t('datetime.daysAgo', { days: diffDay });
    } else {
      return formatDate(d);
    }
  }, [t, formatDate]);

  const value: I18nContextType = {
    locale,
    setLocale,
    t,
    formatNumber,
    formatCurrency,
    formatDate,
    formatRelativeTime,
  };

  // ハイドレーション前は何もレンダリングしない（フラッシュを防ぐ）
  if (!isHydrated) {
    return null;
  }

  return React.createElement(I18nContext.Provider, { value }, children);
}

// i18n フック
export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// 翻訳フック（簡易版）
export function useTranslation() {
  const { t, locale, setLocale } = useI18n();
  return { t, locale, setLocale };
}

// 言語切り替えコンポーネント用フック
export function useLocale() {
  const { locale, setLocale } = useI18n();
  return {
    locale,
    setLocale,
    supportedLocales: SUPPORTED_LOCALES,
    localeNames: LOCALE_NAMES,
  };
}
