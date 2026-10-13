// Copies the `articles` entries of another EmDash seed (fde-mission's) into
// seed/articles.json, together with the bundled media files they reference.
// Usage: pnpm run articles:import <path/to/seed.json>, then pnpm run seed:build.
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

interface SourceEntry {
	id: string;
	slug: string;
	locale?: string;
	translationOf?: string;
	status?: string;
	data: Record<string, unknown>;
}

const LOCALES = ['en', 'ja'];
const MEDIA_PATH = /^\/(?!\/)[^?#]+\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

// Site-relative image paths anywhere in an entry: image fields and Portable Text images.
function mediaPaths(value: unknown, found = new Set<string>()): Set<string> {
	if (typeof value === 'string') {
		if (MEDIA_PATH.test(value)) found.add(value);
	} else if (value && typeof value === 'object') {
		for (const child of Object.values(value)) mediaPaths(child, found);
	}
	return found;
}

async function exists(path: string): Promise<boolean> {
	return stat(path).then(
		(stats) => stats.isFile(),
		() => false
	);
}

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/import-articles.ts <path/to/seed.json>');

const source = JSON.parse(await readFile(sourcePath, 'utf8'));
const sourceDefaultLocale: string = source.defaultLocale ?? 'en';
const sourcePublic = resolve(dirname(sourcePath), '../public');
const targetPublic = new URL('../public/', import.meta.url).pathname;

const entries: SourceEntry[] = source.content?.articles ?? [];
// A translation must follow the entry it translates.
const articles = [...entries]
	.sort((left, right) => Number(Boolean(left.translationOf)) - Number(Boolean(right.translationOf)))
	.map(({ id, slug, locale = sourceDefaultLocale, translationOf, status = 'draft', data }) => {
		if (!LOCALES.includes(locale)) throw new Error(`Unsupported locale "${locale}" in ${id}`);
		return { id, slug, locale, ...(translationOf ? { translationOf } : {}), status, data };
	});

const copied: string[] = [];
const missing: string[] = [];
for (const path of mediaPaths(articles.map((article) => article.data))) {
	if (await exists(join(targetPublic, path))) continue;
	if (!(await exists(join(sourcePublic, path)))) {
		missing.push(path);
		continue;
	}
	await mkdir(dirname(join(targetPublic, path)), { recursive: true });
	await copyFile(join(sourcePublic, path), join(targetPublic, path));
	copied.push(path);
}

await writeFile(
	new URL('../seed/articles.json', import.meta.url),
	`${JSON.stringify({ articles }, null, '\t')}\n`
);

console.log(`Imported ${articles.length} article entries from ${sourcePath}`);
for (const locale of LOCALES) {
	console.log(`  ${locale}: ${articles.filter((article) => article.locale === locale).length}`);
}
console.log(`Copied ${copied.length} media files${copied.length ? `: ${copied.join(', ')}` : ''}`);
if (missing.length) console.warn(`Referenced media not found in the source: ${missing.join(', ')}`);
