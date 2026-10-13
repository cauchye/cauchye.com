// Inserts or updates articles in the site's D1 database without the EmDash admin screen:
// each file becomes one `ec_articles` row (matched by slug and locale), a revision, and
// the article's tags, written as SQL and run through `wrangler d1 execute`.
// Usage: pnpm run articles:add (--local [--persist-to <directory>] | --remote | --dry-run)
//          [--tags <tag map>.json] [<article>.md | <article>.json]...
// See docs/articles.md for the file format and the production procedure.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { ulid } from 'emdash';
import { markdownToPortableText } from 'emdash/client';

import { exportedRows } from './import-articles.ts';

// D1 database bound as DB in wrangler.jsonc.
const DATABASE = 'cauchye-com';
const COLLECTION = 'articles';
// EmDash taxonomy the tags are terms of. A term is stored once, in the default locale,
// and assigned to an article's translation group: both languages share the tags.
const TAG_TAXONOMY = 'tag';
const TAG_LOCALE = 'en';
const LOCALES = ['en', 'ja'];
const STATUSES = ['published', 'draft'];
const FRONTMATTER_KEYS = new Set([
	'title',
	'slug',
	'locale',
	'excerpt',
	'status',
	'publishedAt',
	'translationOf',
	'tags',
	'image',
	'imageAlt',
	'imageWidth',
	'imageHeight'
]);

export interface ArticleTag {
	slug: string;
	label: string;
}

export interface ArticleInput {
	slug: string;
	locale: string;
	status: 'published' | 'draft';
	title: string;
	excerpt: string;
	// ISO timestamp; unset for a draft.
	publishedAt?: string;
	// `<locale>/<slug>` of the article this one translates.
	translationOf?: { locale: string; slug: string };
	// Unset leaves the tags of the article as they are.
	tags?: ArticleTag[];
	featuredImage?: { src: string; alt: string; width?: number; height?: number };
	content: unknown[];
}

function fail(source: string, message: string): never {
	throw new Error(`${source}: ${message}`);
}

function scalar(value: string): string {
	const quoted = /^(["'])(.*)\1$/.exec(value);
	if (!quoted) return value;
	return quoted[1] === '"' ? (JSON.parse(value) as string) : quoted[2].replaceAll("''", "'");
}

// The front matter is a flat list of `key: value` lines; a value is plain text, a quoted
// string, or (for `tags`) a `[one, two]` list.
export function parseFrontMatter(text: string, source: string): Record<string, unknown> {
	const fields: Record<string, unknown> = {};
	for (const line of text.split('\n')) {
		if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
		const match = /^([A-Za-z]+):\s*(.*)$/.exec(line);
		if (!match) fail(source, `cannot read the front matter line "${line}"`);
		const value = match[2].trim();
		const list = /^\[(.*)\]$/.exec(value);
		fields[match[1]] = list
			? list[1]
					.split(',')
					.map((item) => scalar(item.trim()))
					.filter(Boolean)
			: scalar(value);
	}
	return fields;
}

export function tagOf(label: string, source: string): ArticleTag {
	const slug = label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
	if (!slug) fail(source, `tag "${label}" needs latin letters or digits for its slug`);
	return { slug, label };
}

function articleRef(value: unknown, source: string): { locale: string; slug: string } {
	const match = typeof value === 'string' ? /^(en|ja)\/([a-z0-9-]+)$/.exec(value) : null;
	if (!match) fail(source, `expected "<locale>/<slug>", got ${JSON.stringify(value)}`);
	return { locale: match[1], slug: match[2] };
}

function required(fields: Record<string, unknown>, key: string, source: string): string {
	const value = fields[key];
	if (typeof value !== 'string' || value.trim() === '') fail(source, `"${key}" is required`);
	return value.trim();
}

function size(value: unknown, key: string, source: string): number | undefined {
	if (value == null || value === '') return undefined;
	const number = Number(value);
	if (!Number.isInteger(number) || number <= 0) fail(source, `"${key}" must be a whole number`);
	return number;
}

// An article from its fields and body. `body` is Markdown; `content` (JSON input only) is
// Portable Text and wins over it.
export function articleFromFields(
	fields: Record<string, unknown>,
	body: string,
	source: string
): ArticleInput {
	for (const key of Object.keys(fields)) {
		if (!FRONTMATTER_KEYS.has(key) && key !== 'body' && key !== 'content') {
			fail(source, `unknown field "${key}"`);
		}
	}
	const slug = required(fields, 'slug', source);
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
		fail(source, '"slug" must be lowercase letters, digits, and hyphens');
	}
	const locale = required(fields, 'locale', source);
	if (!LOCALES.includes(locale)) fail(source, `"locale" must be one of ${LOCALES.join(', ')}`);
	const status = fields.status == null ? 'published' : String(fields.status);
	if (!STATUSES.includes(status)) fail(source, `"status" must be one of ${STATUSES.join(', ')}`);

	let publishedAt: string | undefined;
	if (status === 'published') {
		const date = new Date(required(fields, 'publishedAt', source));
		if (Number.isNaN(date.getTime())) fail(source, '"publishedAt" must be an ISO 8601 date');
		publishedAt = date.toISOString();
	}

	const tags = fields.tags;
	if (tags != null && !Array.isArray(tags)) fail(source, '"tags" must be a [one, two] list');
	const content = Array.isArray(fields.content) ? fields.content : markdownToPortableText(body);
	if (content.length === 0) fail(source, 'the article has no body');

	const image = fields.image == null ? undefined : String(fields.image);
	if (image && !/^(\/(?!\/)|https:\/\/)/.test(image)) {
		fail(source, '"image" must be a site path (a file in public/) or an https URL');
	}
	const title = required(fields, 'title', source);
	return {
		slug,
		locale,
		status: status as ArticleInput['status'],
		title,
		excerpt: required(fields, 'excerpt', source),
		...(publishedAt ? { publishedAt } : {}),
		...(fields.translationOf ? { translationOf: articleRef(fields.translationOf, source) } : {}),
		...(tags ? { tags: tags.map((tag) => tagOf(String(tag), source)) } : {}),
		...(image
			? {
					featuredImage: {
						src: image,
						alt: fields.imageAlt ? String(fields.imageAlt) : title,
						width: size(fields.imageWidth, 'imageWidth', source),
						height: size(fields.imageHeight, 'imageHeight', source)
					}
				}
			: {}),
		content
	};
}

// A Markdown file with front matter between `---` lines, or a JSON object of the same
// fields plus `body` (Markdown) or `content` (Portable Text).
export function parseArticleFile(text: string, source: string): ArticleInput {
	if (extname(source) === '.json') {
		const fields = JSON.parse(text) as Record<string, unknown>;
		return articleFromFields(fields, typeof fields.body === 'string' ? fields.body : '', source);
	}
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
	if (!match) fail(source, 'expected front matter between "---" lines');
	return articleFromFields(
		parseFrontMatter(match[1].replaceAll('\r', ''), source),
		match[2].replaceAll('\r', ''),
		source
	);
}

// `{ "<locale>/<slug>": ["Tag", ...] }`: tags for articles that are already in the database.
export function parseTagMap(
	text: string,
	source: string
): Array<{ article: { locale: string; slug: string }; tags: ArticleTag[] }> {
	const map = JSON.parse(text) as Record<string, unknown>;
	return Object.entries(map).map(([ref, tags]) => {
		if (!Array.isArray(tags)) fail(source, `tags of ${ref} must be a list`);
		return {
			article: articleRef(ref, source),
			tags: tags.map((tag) => tagOf(String(tag), source))
		};
	});
}

function quote(value: string | number | null | undefined): string {
	if (value == null) return 'NULL';
	if (typeof value === 'number') return String(value);
	return `'${value.replaceAll("'", "''")}'`;
}

function rowOf({ locale, slug }: { locale: string; slug: string }): string {
	return `slug = ${quote(slug)} AND locale = ${quote(locale)}`;
}

// Replaces the tags of the article's translation group.
export function tagSql(
	article: { locale: string; slug: string },
	tags: readonly ArticleTag[],
	newId: () => string = ulid
): string[] {
	const group = `(SELECT translation_group FROM ec_articles WHERE ${rowOf(article)})`;
	const statements = tags.map((tag) => {
		const id = newId();
		return (
			'INSERT INTO taxonomies (id, name, slug, label, locale, translation_group) ' +
			`VALUES (${quote(id)}, ${quote(TAG_TAXONOMY)}, ${quote(tag.slug)}, ${quote(tag.label)}, ${quote(TAG_LOCALE)}, ${quote(id)}) ` +
			'ON CONFLICT (name, slug, locale) DO NOTHING;'
		);
	});
	statements.push(
		`DELETE FROM content_taxonomies WHERE collection = ${quote(COLLECTION)} AND entry_id = ${group} ` +
			`AND taxonomy_id IN (SELECT translation_group FROM taxonomies WHERE name = ${quote(TAG_TAXONOMY)});`
	);
	if (tags.length > 0) {
		statements.push(
			'INSERT INTO content_taxonomies (collection, entry_id, taxonomy_id) ' +
				`SELECT ${quote(COLLECTION)}, article.translation_group, term.translation_group ` +
				'FROM ec_articles AS article, taxonomies AS term ' +
				`WHERE article.${rowOf(article).replace(' AND ', ' AND article.')} ` +
				`AND term.name = ${quote(TAG_TAXONOMY)} AND term.locale = ${quote(TAG_LOCALE)} ` +
				`AND term.slug IN (${tags.map((tag) => quote(tag.slug)).join(', ')}) ` +
				'ON CONFLICT (collection, entry_id, taxonomy_id) DO NOTHING;'
		);
	}
	return statements;
}

// Lets the admin offer the tag taxonomy on articles; reading the tags does not depend on it.
const TAG_TAXONOMY_SQL =
	`UPDATE _emdash_taxonomy_defs SET collections = json_insert(coalesce(collections, '[]'), '$[#]', ${quote(COLLECTION)}) ` +
	`WHERE name = ${quote(TAG_TAXONOMY)} AND NOT EXISTS ` +
	`(SELECT 1 FROM json_each(coalesce(_emdash_taxonomy_defs.collections, '[]')) WHERE value = ${quote(COLLECTION)});`;

// The statements that insert the article, or update the one with its slug and locale, the
// way EmDash stores a published entry: the row, a revision of its fields, and its tags.
export function articleSql(
	article: ArticleInput,
	now: string = new Date().toISOString(),
	newId: () => string = ulid
): string[] {
	const id = newId();
	const revisionId = newId();
	const fields = {
		title: article.title,
		excerpt: article.excerpt,
		featured_image: article.featuredImage ?? null,
		content: article.content
	};
	const featuredImage = article.featuredImage ? JSON.stringify(article.featuredImage) : null;
	const content = JSON.stringify(article.content);
	// A translation joins the group of the article it translates; an original starts its own.
	const group = article.translationOf
		? `(SELECT translation_group FROM ec_articles WHERE ${rowOf(article.translationOf)})`
		: quote(id);
	const published = article.status === 'published';

	const statements = [
		'INSERT INTO ec_articles (id, slug, status, created_at, updated_at, published_at, version, locale, translation_group, title, excerpt, featured_image, content) ' +
			`VALUES (${quote(id)}, ${quote(article.slug)}, ${quote(article.status)}, ${quote(now)}, ${quote(now)}, ${quote(article.publishedAt)}, 1, ${quote(article.locale)}, ${group}, ${quote(article.title)}, ${quote(article.excerpt)}, ${quote(featuredImage)}, ${quote(content)}) ` +
			'ON CONFLICT (slug, locale) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at, published_at = excluded.published_at, ' +
			'version = ec_articles.version + 1, title = excluded.title, excerpt = excluded.excerpt, featured_image = excluded.featured_image, content = excluded.content' +
			`${article.translationOf ? ', translation_group = excluded.translation_group' : ''};`,
		'INSERT INTO revisions (id, collection, entry_id, data) ' +
			`SELECT ${quote(revisionId)}, ${quote(COLLECTION)}, id, ${quote(JSON.stringify(fields))} FROM ec_articles WHERE ${rowOf(article)};`,
		`UPDATE ec_articles SET live_revision_id = ${published ? quote(revisionId) : 'NULL'}, draft_revision_id = ${published ? 'NULL' : quote(revisionId)} WHERE ${rowOf(article)};`
	];
	if (article.tags) statements.push(...tagSql(article, article.tags, newId));
	return statements;
}

// Originals before their translations, so a translation finds the group it joins.
export function inWriteOrder(articles: readonly ArticleInput[]): ArticleInput[] {
	return [...articles].sort(
		(left, right) => Number(Boolean(left.translationOf)) - Number(Boolean(right.translationOf))
	);
}

if (import.meta.main) {
	const root = fileURLToPath(new URL('..', import.meta.url));
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: {
			local: { type: 'boolean', default: false },
			remote: { type: 'boolean', default: false },
			'dry-run': { type: 'boolean', default: false },
			'persist-to': { type: 'string' },
			tags: { type: 'string' }
		}
	});
	const targets = [values.local, values.remote, values['dry-run']].filter(Boolean).length;
	if (targets !== 1 || (positionals.length === 0 && !values.tags)) {
		throw new Error(
			'Usage: node scripts/add-article.ts (--local [--persist-to <directory>] | --remote | --dry-run) [--tags <tag map>.json] [<article>.md | <article>.json]...'
		);
	}
	if (values['persist-to'] && !values.local) throw new Error('--persist-to needs --local');

	const articles = inWriteOrder(
		positionals.map((file) => parseArticleFile(readFileSync(file, 'utf8'), file))
	);
	const tagged = values.tags ? parseTagMap(readFileSync(values.tags, 'utf8'), values.tags) : [];
	const key = ({ locale, slug }: { locale: string; slug: string }) => `${locale}/${slug}`;
	const written = new Set<string>();
	for (const article of articles) {
		if (written.has(key(article))) throw new Error(`${key(article)} is given twice`);
		written.add(key(article));
	}

	const statements = [
		...articles.flatMap((article) => articleSql(article)),
		...tagged.flatMap(({ article, tags }) => tagSql(article, tags)),
		TAG_TAXONOMY_SQL
	];
	if (values['dry-run']) {
		console.log(statements.join('\n'));
		process.exit(0);
	}

	const target = values.remote
		? ['--remote']
		: ['--local', ...(values['persist-to'] ? ['--persist-to', resolve(values['persist-to'])] : [])];
	const d1 = (...args: string[]) =>
		execFileSync(
			'pnpm',
			['exec', 'wrangler', 'd1', 'execute', DATABASE, ...target, '--yes', ...args],
			{ cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
		);
	const query = (sql: string) => exportedRows(JSON.parse(d1('--json', '--command', sql)));

	// Fail before writing anything when the database or an article referred to is missing.
	let existing: Set<string>;
	try {
		existing = new Set(
			query('SELECT locale, slug FROM ec_articles WHERE deleted_at IS NULL').map((row) =>
				key(row as { locale: string; slug: string })
			)
		);
	} catch {
		throw new Error(
			`Cannot read ec_articles in the ${values.remote ? 'remote' : 'local'} database "${DATABASE}". ` +
				'EmDash must have created its tables there first (for a local database: start the site once and seed it).'
		);
	}
	const missing = [
		...articles.flatMap(({ translationOf }) => translationOf ?? []),
		...tagged.map(({ article }) => article)
	].filter((article) => !existing.has(key(article)) && !written.has(key(article)));
	if (missing.length > 0) {
		throw new Error(`Not in the database: ${missing.map(key).join(', ')}`);
	}

	const directory = mkdtempSync(join(tmpdir(), 'cauchye-add-article-'));
	try {
		const file = join(directory, 'articles.sql');
		writeFileSync(file, `${statements.join('\n')}\n`);
		d1('--file', file);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}

	const refs = [...articles, ...tagged.map(({ article }) => article)];
	const rows = query(
		'SELECT article.locale, article.slug, article.status, article.published_at, article.version, ' +
			"(SELECT group_concat(term.slug, ', ') FROM content_taxonomies AS pivot " +
			'JOIN taxonomies AS term ON term.translation_group = pivot.taxonomy_id ' +
			`WHERE pivot.collection = ${quote(COLLECTION)} AND pivot.entry_id = article.translation_group) AS tags ` +
			`FROM ec_articles AS article WHERE ${refs.map((ref) => `(article.${rowOf(ref).replace(' AND ', ' AND article.')})`).join(' OR ')} ` +
			'ORDER BY article.locale, article.slug'
	);
	console.log(`Wrote to the ${values.remote ? 'remote' : 'local'} database "${DATABASE}":`);
	for (const row of rows) {
		console.log(
			`  /${row.locale}/articles/${row.slug}  ${row.status}  ${row.published_at ?? '-'}  v${row.version}  tags: ${row.tags ?? '-'}`
		);
	}
}
