import en from '../messages/en.json';
import ja from '../messages/ja.json';

export const locales = ['en', 'ja'] as const;
export type Locale = (typeof locales)[number];
export type MessageKey = keyof typeof en;
export type Dictionary = Record<MessageKey, string>;

const dictionaries = {
	en: en as Dictionary,
	ja: ja as Dictionary
} satisfies Record<Locale, Dictionary>;

export function isLocale(value: string | undefined): value is Locale {
	return locales.includes(value as Locale);
}

export function getDictionary(locale: Locale): Dictionary {
	return dictionaries[locale];
}
