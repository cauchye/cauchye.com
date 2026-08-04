<script lang="ts">
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Radar from '@lucide/svelte/icons/radar';
	import Workflow from '@lucide/svelte/icons/workflow';

	import D6eMark from '$lib/components/d6e-mark.svelte';
	import MapBackdrop from '$lib/components/map-backdrop.svelte';
	import SectionHeading from '$lib/components/sections/section-heading.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { m } from '$lib/paraglide/messages';
	import { d6e } from '$lib/site';

	// An icon per business rather than a sequence number, so reordering this
	// array cannot leave a row labelled with someone else's position. `backdrop`
	// puts the Singapore–Japan silhouettes behind a row.
	const services = [
		{
			id: 'ai',
			icon: Workflow,
			backdrop: false,
			tag: () => m.svc_ai_tag(),
			title: () => m.svc_ai_title(),
			body: () => m.svc_ai_body(),
			points: [() => m.svc_ai_point_1(), () => m.svc_ai_point_2(), () => m.svc_ai_point_3()],
			links: []
		},
		{
			id: 'd6e',
			icon: D6eMark,
			backdrop: false,
			tag: () => m.svc_d6e_tag(),
			title: () => m.svc_d6e_title(),
			body: () => m.svc_d6e_body(),
			points: [() => m.svc_d6e_point_1(), () => m.svc_d6e_point_2(), () => m.svc_d6e_point_3()],
			links: [
				{ href: d6e.url, label: () => m.d6e_link_site() },
				{ href: d6e.docsUrl, label: () => m.d6e_link_docs() }
			]
		},
		{
			id: 'ir',
			icon: Radar,
			backdrop: true,
			tag: () => m.svc_ir_tag(),
			title: () => m.svc_ir_title(),
			body: () => m.svc_ir_body(),
			points: [() => m.svc_ir_point_1(), () => m.svc_ir_point_2(), () => m.svc_ir_point_3()],
			links: []
		},
		{
			id: 'capital',
			icon: Landmark,
			backdrop: false,
			tag: () => m.svc_capital_tag(),
			title: () => m.svc_capital_title(),
			body: () => m.svc_capital_body(),
			points: [
				() => m.svc_capital_point_1(),
				() => m.svc_capital_point_2(),
				() => m.svc_capital_point_3()
			],
			links: []
		}
	];
</script>

<section id="services" class="border-t border-border section">
	<SectionHeading
		eyebrow={m.services_eyebrow()}
		title={m.services_title()}
		body={m.services_body()}
	/>

	<!--
		Full-width numbered rows rather than a card grid. Three practices of equal
		standing read as a company's business lines; three cards read as a pricing
		table.
	-->
	<div class="mt-14">
		{#each services as service (service.id)}
			{@const Icon = service.icon}
			<!--
				No bottom rule on the last row: the next section already draws its own
				border-t, and the two together read as a doubled line across the gap.
			-->
			<article
				class="relative isolate grid gap-6 overflow-hidden border-t border-border py-10 md:grid-cols-[1fr_1.4fr] md:gap-16 md:py-12"
			>
				{#if service.backdrop}
					<MapBackdrop
						class="pointer-events-none absolute inset-y-6 left-0 -z-10 hidden w-[38%] text-brand/20 md:block"
					/>
				{/if}

				<div>
					<span
						class="flex size-10 items-center justify-center rounded-lg bg-brand-subtle text-brand"
					>
						<Icon class="size-5" />
					</span>
					<h3 class="mt-4 text-xl font-semibold md:text-2xl">{service.title()}</h3>
					<Badge variant="outline" class="mt-4 font-mono text-[0.625rem] tracking-widest uppercase">
						{service.tag()}
					</Badge>
				</div>

				<div>
					<p class="leading-relaxed text-muted-foreground md:text-[0.9375rem]">{service.body()}</p>

					<!--
						A spec strip rather than boxes: one rule above the group and a marker
						dot per item, with nothing enclosing the text. Boxed cells read as a
						pricing table; this reads as a data sheet.
					-->
					<ul class="mt-8 grid gap-x-10 gap-y-4 border-t border-border pt-6 sm:grid-cols-3">
						{#each service.points as point (point())}
							<li class="flex gap-3 text-sm leading-snug text-muted-foreground">
								<span class="mt-1.75 size-1.5 shrink-0 rounded-full bg-brand"></span>
								<span>{point()}</span>
							</li>
						{/each}
					</ul>

					{#if service.links.length}
						<div class="mt-6 flex flex-wrap gap-x-6 gap-y-2">
							{#each service.links as link (link.href)}
								<a
									href={link.href}
									target="_blank"
									rel="noreferrer"
									class="inline-flex items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline"
								>
									{link.label()}
									<ArrowUpRight class="size-4" />
								</a>
							{/each}
						</div>
					{/if}
				</div>
			</article>
		{/each}
	</div>
</section>
