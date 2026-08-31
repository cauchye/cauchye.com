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

export function localeFromRequest(request: Request): Locale {
	const acceptLanguage = request.headers.get('accept-language') ?? '';
	const preferences = acceptLanguage
		.split(',')
		.map((entry, index) => {
			const [languageRange = '', ...parameters] = entry.trim().toLowerCase().split(';');
			const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith('q='));
			const quality = qualityParameter ? Number.parseFloat(qualityParameter.trim().slice(2)) : 1;
			return {
				languageRange,
				quality: Number.isFinite(quality) ? quality : 0,
				index
			};
		})
		.filter((preference) => preference.quality > 0)
		.sort((left, right) => right.quality - left.quality || left.index - right.index);

	for (const preference of preferences) {
		const primaryLanguage = preference.languageRange.split('-')[0];
		if (isLocale(primaryLanguage)) return primaryLanguage;
		if (preference.languageRange === '*') return 'en';
	}

	return 'en';
}

export function getDictionary(locale: Locale): Dictionary {
	return dictionaries[locale];
}
