/// <reference types="astro/client" />

declare namespace Cloudflare {
	interface Env {
		SLACK_WEBHOOK_URL?: string;
	}
}
