// Adds the sample articles in tests/fixtures/articles-seed.json to a local Wrangler D1
// database, for previews and end-to-end tests. It writes to the SQLite file under a
// `--persist-to` directory and cannot reach a remote database.
// Usage: pnpm run articles:fixtures [persist directory, default .wrangler/state]
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

export function localDatabase(persistDir: string): string {
	const directory = join(resolve(persistDir), 'v3/d1/miniflare-D1DatabaseObject');
	let files: string[] = [];
	try {
		files = readdirSync(directory);
	} catch {
		// Reported below.
	}
	const databases = files.filter((file) => file.endsWith('.sqlite') && file !== 'metadata.sqlite');
	if (databases.length !== 1) {
		throw new Error(
			`Expected one local D1 database in ${directory}; found ${databases.length}. ` +
				'Start `wrangler dev --persist-to <dir>` and seed the site first.'
		);
	}
	return join(directory, databases[0]);
}

export function seedArticleFixtures(persistDir: string): void {
	execFileSync(
		'pnpm',
		[
			'exec',
			'emdash',
			'seed',
			'tests/fixtures/articles-seed.json',
			'--database',
			localDatabase(persistDir),
			'--uploads-dir',
			join(tmpdir(), 'cauchye-fixture-uploads')
		],
		{ cwd: root, stdio: 'inherit' }
	);
}

if (import.meta.main) {
	seedArticleFixtures(process.argv[2] ?? join(root, '.wrangler/state'));
}
