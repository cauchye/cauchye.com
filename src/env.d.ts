/// <reference types="astro/client" />

declare namespace Cloudflare {
	interface Env {
		SLACK_WEBHOOK_URL?: string;
		// One-time credential for initialising EmDash while its admin is closed.
		EMDASH_BOOTSTRAP_TOKEN?: string;
	}
}
