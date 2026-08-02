<script lang="ts">
	import SectionHeading from '$lib/components/sections/section-heading.svelte';
	import { m } from '$lib/paraglide/messages';
	import { addressLines, site } from '$lib/site';

	const rows = [
		{ id: 'name', label: () => m.company_label_name(), lines: [site.legalName], list: false },
		{
			id: 'representative',
			label: () => m.company_label_representative(),
			lines: [m.leader_name()],
			list: false
		},
		{ id: 'address', label: () => m.company_label_address(), lines: addressLines, list: false },
		{
			id: 'business',
			label: () => m.company_label_business(),
			// Reuses the business-line titles so this row cannot drift from the
			// Business section above.
			lines: [m.svc_ai_title(), m.svc_d6e_title(), m.svc_capital_title()],
			list: true
		}
	];
</script>

<section id="company" class="border-t border-border section">
	<SectionHeading eyebrow={m.company_eyebrow()} title={m.company_title()} />

	<dl class="mt-12 max-w-3xl">
		{#each rows as row (row.id)}
			<div class="grid gap-1 border-b border-border py-5 sm:grid-cols-[12rem_1fr] sm:gap-6">
				<dt
					class="font-mono text-[0.6875rem] tracking-[0.14em] text-muted-foreground uppercase sm:pt-1"
				>
					{row.label()}
				</dt>
				<dd class="leading-relaxed">
					{#if row.list}
						<ul class="list-outside list-disc space-y-1 pl-4 marker:text-brand">
							{#each row.lines as line (line)}
								<li>{line}</li>
							{/each}
						</ul>
					{:else}
						{#each row.lines as line (line)}
							<span class="block">{line}</span>
						{/each}
					{/if}
				</dd>
			</div>
		{/each}
	</dl>
</section>
