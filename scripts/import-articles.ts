// Imports the published articles of an fde-mission D1 export into a local Wrangler
// database: the media rows and files go to the local D1 and R2, the articles through
// `emdash seed`. Real article text and images never enter the repository — the generated
// seed and the import report are written to the untracked `.local/articles-import/`.
// It writes under a `--persist-to` directory only and cannot reach a remote resource.
// Usage: pnpm run articles:import <export directory> [--persist-to <directory>]
//          [--substitute <storage key>=<image file>]...
// The export directory holds articles.json (`ec_articles` rows), media.json (`media` rows),
// and media/<storage key> files.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { localDatabase } from './seed-article-fixtures.ts';

type Row = Record<string, unknown>;

export interface SeedArticle {
	id: string;
	slug: string;
	locale: string;
	translationOf?: string;
	status: 'published';
	data: {
		title: string;
		excerpt: string;
		featured_image?: Record<string, unknown>;
		content: unknown[];
	};
}

export interface ArticleDates {
	slug: string;
	locale: string;
	publishedAt: string | null;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface ArticleImportPlan {
	articles: SeedArticle[];
	dates: ArticleDates[];
	// Storage keys of the media the articles display: featured images and body images.
	mediaKeys: string[];
	warnings: string[];
}

const LOCALES = ['en', 'ja'];
// The fields of this site's `articles` collection; other source columns are not imported.
const SYSTEM_COLUMNS = new Set([
	'id',
	'slug',
	'status',
	'author_id',
	'primary_byline_id',
	'created_at',
	'updated_at',
	'published_at',
	'scheduled_at',
	'deleted_at',
	'version',
	'live_revision_id',
	'draft_revision_id',
	'locale',
	'translation_group'
]);
const FIELDS = new Set(['title', 'excerpt', 'featured_image', 'content']);
const MEDIA_FILE_URL = '/_emdash/api/media/file/';
// R2 bucket bound as MEDIA in wrangler.jsonc.
const MEDIA_BUCKET = 'cauchye-com-media';

// `wrangler d1 execute --json` wraps the rows as `[{ results: [...] }]`.
export function exportedRows(value: unknown): Row[] {
	if (!Array.isArray(value)) throw new Error('Expected an array of rows');
	return value.flatMap((item) =>
		item && typeof item === 'object' && Array.isArray((item as Row).results)
			? ((item as Row).results as Row[])
			: [item as Row]
	);
}

function string(value: unknown): string | undefined {
	return typeof value === 'string' && value !== '' ? value : undefined;
}

// D1 returns JSON columns as text.
function json(value: unknown, column: string, row: Row): unknown {
	if (typeof value !== 'string') return value;
	try {
		return JSON.parse(value);
	} catch {
		throw new Error(`Invalid JSON in ${column} of article ${String(row.id)}`);
	}
}

function storageKeyOfUrl(url: unknown): string | undefined {
	if (typeof url !== 'string' || !url.startsWith(MEDIA_FILE_URL)) return undefined;
	return url
		.slice(MEDIA_FILE_URL.length)
		.split(/[?#]/)[0]
		.split('/')
		.map(decodeURIComponent)
		.join('/');
}

// Storage keys of the Portable Text image blocks, at any depth.
function bodyMediaKeys(value: unknown, found: string[] = []): string[] {
	if (Array.isArray(value)) {
		for (const child of value) bodyMediaKeys(child, found);
	} else if (value && typeof value === 'object') {
		const node = value as Row;
		if (node._type === 'image' && node.asset && typeof node.asset === 'object') {
			const asset = node.asset as Row;
			const key = storageKeyOfUrl(asset.url) ?? string(asset._ref);
			if (key) found.push(key);
		}
		for (const child of Object.values(node)) bodyMediaKeys(child, found);
	}
	return found;
}

export function planArticleImport(articleRows: readonly Row[]): ArticleImportPlan {
	const warnings: string[] = [];
	const published = articleRows.filter((row) => row.status === 'published' && !row.deleted_at);
	if (published.length < articleRows.length) {
		warnings.push(`Skipped ${articleRows.length - published.length} unpublished or deleted rows`);
	}

	const dropped = new Set<string>();
	const seen = new Set<string>();
	const groups = new Map<string, Row[]>();
	for (const row of published) {
		const id = string(row.id);
		const slug = string(row.slug);
		const locale = string(row.locale);
		if (!id || !slug) throw new Error(`Article row without id or slug: ${JSON.stringify(row.id)}`);
		if (!locale || !LOCALES.includes(locale)) {
			throw new Error(`Unsupported locale "${String(row.locale)}" in article ${id}`);
		}
		if (seen.has(`${locale}/${slug}`)) throw new Error(`Duplicate article ${locale}/${slug}`);
		seen.add(`${locale}/${slug}`);
		for (const [column, value] of Object.entries(row)) {
			if (!SYSTEM_COLUMNS.has(column) && !FIELDS.has(column) && value != null) dropped.add(column);
		}

		const group = string(row.translation_group) ?? id;
		groups.set(group, [...(groups.get(group) ?? []), row]);
	}
	if (dropped.size > 0) {
		warnings.push(`Columns without a field in this site's collection: ${[...dropped].join(', ')}`);
	}

	// Within a translation group, the row the group is named after is the original; the others
	// are its translations and must follow it in the seed.
	const translationOf = new Map<string, string>();
	for (const [group, rows] of groups) {
		const original = rows.find((row) => row.id === group) ?? rows[0];
		const locales = new Set<unknown>();
		for (const row of rows) {
			if (locales.has(row.locale)) {
				throw new Error(`Translation group ${group} has two "${String(row.locale)}" articles`);
			}
			locales.add(row.locale);
			if (row !== original) translationOf.set(row.id as string, original.id as string);
		}
	}

	const mediaKeys = new Set<string>();
	const ordered = [...published].sort(
		(left, right) =>
			Number(translationOf.has(left.id as string)) - Number(translationOf.has(right.id as string))
	);
	const articles = ordered.map((row): SeedArticle => {
		const id = row.id as string;
		const content = json(row.content, 'content', row);
		if (!Array.isArray(content)) throw new Error(`Article ${id} has no Portable Text content`);
		for (const key of bodyMediaKeys(content)) mediaKeys.add(key);

		const image = json(row.featured_image, 'featured_image', row);
		const featuredImage =
			image && typeof image === 'object' ? (image as Record<string, unknown>) : undefined;
		const featuredKey = string((featuredImage?.meta as Row | undefined)?.storageKey);
		if (featuredKey) mediaKeys.add(featuredKey);

		const original = translationOf.get(id);
		return {
			id,
			slug: row.slug as string,
			locale: row.locale as string,
			...(original ? { translationOf: original } : {}),
			status: 'published',
			data: {
				title: string(row.title) ?? '',
				excerpt: string(row.excerpt) ?? '',
				...(featuredImage ? { featured_image: featuredImage } : {}),
				content
			}
		};
	});

	return {
		articles,
		dates: ordered.map((row) => ({
			slug: row.slug as string,
			locale: row.locale as string,
			publishedAt: string(row.published_at) ?? null,
			createdAt: string(row.created_at) ?? null,
			updatedAt: string(row.updated_at) ?? null
		})),
		mediaKeys: [...mediaKeys],
		warnings
	};
}

function isFile(path: string): boolean {
	try {
		return statSync(path).isFile();
	} catch {
		return false;
	}
}

const MEDIA_COLUMNS = [
	'id',
	'filename',
	'mime_type',
	'size',
	'width',
	'height',
	'alt',
	'caption',
	'storage_key',
	'content_hash',
	'created_at',
	'status',
	'blurhash',
	'dominant_color',
	'focal_x',
	'focal_y'
];

if (import.meta.main) {
	const root = fileURLToPath(new URL('..', import.meta.url));
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: {
			'persist-to': { type: 'string', default: join(root, '.wrangler/state') },
			substitute: { type: 'string', multiple: true, default: [] }
		}
	});
	const exportDir = positionals[0];
	if (!exportDir) {
		throw new Error(
			'Usage: node scripts/import-articles.ts <export directory> [--persist-to <directory>] [--substitute <storage key>=<image file>]...'
		);
	}
	const persistDir = resolve(values['persist-to']);
	const substitutes = new Map(
		values.substitute.map((pair) => {
			const separator = pair.indexOf('=');
			if (separator < 1) throw new Error(`Expected --substitute <storage key>=<file>: ${pair}`);
			return [pair.slice(0, separator), resolve(pair.slice(separator + 1))] as const;
		})
	);
	const read = (file: string) =>
		exportedRows(JSON.parse(readFileSync(join(exportDir, file), 'utf8')));

	const plan = planArticleImport(read('articles.json'));
	const mediaRows = read('media.json');

	// Every media row with a file is imported; a file the articles display must exist.
	const media: Array<{ row: Row; key: string; file: string; substitute: boolean }> = [];
	const withoutFile: string[] = [];
	for (const row of mediaRows) {
		const key = row.storage_key as string;
		const exported = join(exportDir, 'media', key);
		const substitute = substitutes.get(key);
		if (isFile(exported)) media.push({ row, key, file: exported, substitute: false });
		else if (substitute && isFile(substitute)) {
			media.push({ row, key, file: substitute, substitute: true });
		} else withoutFile.push(key);
	}
	const available = new Set(media.map(({ key }) => key));
	const missing = plan.mediaKeys.filter((key) => !available.has(key));
	if (missing.length > 0) {
		throw new Error(
			`No file for media the articles display (pass --substitute <storage key>=<file>): ${missing.join(', ')}`
		);
	}

	const outDir = join(root, '.local/articles-import');
	mkdirSync(outDir, { recursive: true });
	const seedPath = join(outDir, 'seed.json');
	writeFileSync(
		seedPath,
		`${JSON.stringify(
			{
				$schema: 'https://emdashcms.com/seed.schema.json',
				version: '1',
				defaultLocale: 'en',
				meta: { name: 'Imported fde-mission articles (local only)' },
				content: { articles: plan.articles }
			},
			null,
			'\t'
		)}\n`
	);

	const databasePath = localDatabase(persistDir);
	const database = new DatabaseSync(databasePath);
	const insertMedia = database.prepare(
		`INSERT OR REPLACE INTO media (${MEDIA_COLUMNS.join(', ')}) VALUES (${MEDIA_COLUMNS.map(() => '?').join(', ')})`
	);
	for (const { row, file, substitute } of media) {
		insertMedia.run(
			...MEDIA_COLUMNS.map((column) => {
				// A substitute is not the file the source row describes.
				if (substitute && column === 'size') return statSync(file).size;
				if (substitute && column === 'content_hash') return null;
				return (row[column] ?? null) as string | number | null;
			})
		);
	}
	database.close();

	for (const { row, key, file } of media) {
		execFileSync(
			'pnpm',
			[
				'exec',
				'wrangler',
				'r2',
				'object',
				'put',
				`${MEDIA_BUCKET}/${key}`,
				'--file',
				file,
				'--content-type',
				row.mime_type as string,
				'--local',
				'--persist-to',
				persistDir
			],
			{ cwd: root, stdio: ['ignore', 'ignore', 'inherit'] }
		);
	}

	execFileSync(
		'pnpm',
		[
			'exec',
			'emdash',
			'seed',
			seedPath,
			'--database',
			databasePath,
			'--on-conflict',
			'update',
			'--uploads-dir',
			join(tmpdir(), 'cauchye-import-uploads')
		],
		{ cwd: root, stdio: 'inherit' }
	);

	// The seed publishes every entry "now"; restore the source dates, which order the list.
	const dated = new DatabaseSync(databasePath);
	const setDates = dated.prepare(
		`UPDATE ec_articles
		 SET published_at = coalesce(?, published_at), created_at = coalesce(?, created_at),
		     updated_at = coalesce(?, updated_at)
		 WHERE slug = ? AND locale = ?`
	);
	for (const { slug, locale, publishedAt, createdAt, updatedAt } of plan.dates) {
		setDates.run(publishedAt, createdAt, updatedAt, slug, locale);
	}
	dated.close();

	const report = {
		source: resolve(exportDir),
		persistDir,
		articles: Object.fromEntries(
			LOCALES.map((locale) => [
				locale,
				plan.articles.filter((article) => article.locale === locale).map(({ slug }) => slug)
			])
		),
		translations: plan.articles
			.filter((article) => article.translationOf)
			.map(({ locale, slug, translationOf }) => {
				const original = plan.articles.find(({ id }) => id === translationOf);
				return `${locale}/${slug} <- ${original?.locale}/${original?.slug}`;
			}),
		media: media.map(({ key, file, substitute }) => ({ key, file, substitute })),
		mediaWithoutFile: withoutFile,
		warnings: plan.warnings
	};
	writeFileSync(join(outDir, 'report.json'), `${JSON.stringify(report, null, '\t')}\n`);

	console.log(`Imported ${plan.articles.length} articles into ${databasePath}`);
	for (const locale of LOCALES) console.log(`  ${locale}: ${report.articles[locale].length}`);
	console.log(`Stored ${media.length} media files in the local R2 bucket`);
	for (const { key, file, substitute } of media) {
		if (substitute) console.log(`  substituted ${key} with ${file}`);
	}
	if (withoutFile.length) console.warn(`Media rows without a file: ${withoutFile.join(', ')}`);
	for (const warning of plan.warnings) console.warn(warning);
	console.log(`Report: ${join(outDir, 'report.json')}`);
}
