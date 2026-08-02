<script lang="ts">
	import Mail from '@lucide/svelte/icons/mail';

	import { Separator } from '$lib/components/ui/separator';
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { addressLines, navItems, site } from '$lib/site';

	const home = $derived(localizeHref('/'));
	const year = new Date().getFullYear();
</script>

<footer class="mt-auto border-t border-border bg-muted/30">
	<div class="container mx-auto py-14">
		<div class="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
			<div class="max-w-sm">
				<div class="flex items-center gap-2.5">
					<span class="size-2 rounded-full bg-brand" aria-hidden="true"></span>
					<span class="text-sm font-semibold tracking-widest">{site.legalName}</span>
				</div>
				<p class="mt-3 text-sm text-muted-foreground">{m.brand_descriptor()}</p>
				<a
					href="{home}#contact"
					class="mt-5 inline-flex items-center gap-2 text-sm text-foreground underline-offset-4 transition-colors hover:text-brand hover:underline"
				>
					<Mail class="size-4" />
					{m.nav_contact()}
				</a>
			</div>

			<nav aria-label={m.footer_nav_label()}>
				<h2 class="font-mono text-[0.6875rem] tracking-[0.14em] text-muted-foreground uppercase">
					{m.footer_nav_label()}
				</h2>
				<ul class="mt-4 space-y-2.5">
					{#each navItems as item (item.hash)}
						<li>
							<a
								href="{home}{item.hash}"
								class="text-sm text-muted-foreground transition-colors hover:text-foreground"
							>
								{item.label()}
							</a>
						</li>
					{/each}
				</ul>
			</nav>

			<div>
				<h2 class="font-mono text-[0.6875rem] tracking-[0.14em] text-muted-foreground uppercase">
					{m.footer_company_label()}
				</h2>
				<address class="mt-4 text-sm leading-relaxed text-muted-foreground not-italic">
					<span class="block text-foreground">{site.legalName}</span>
					{#each addressLines as line (line)}
						<span class="block">{line}</span>
					{/each}
				</address>
			</div>
		</div>

		<Separator class="my-10" />

		<p class="text-xs text-muted-foreground">
			© {year}
			{site.legalName}
			{m.footer_rights()}
		</p>
	</div>
</footer>
