<script lang="ts">
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import Boxes from '@lucide/svelte/icons/boxes';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Workflow from '@lucide/svelte/icons/workflow';

	import SectionHeading from '$lib/components/sections/section-heading.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { m } from '$lib/paraglide/messages';
	import { d6e } from '$lib/site';

	// An icon per business rather than a sequence number, so reordering this
	// array cannot leave a row labelled with someone else's position.
	const services = [
		{
			id: 'ai',
			icon: Workflow,
			tag: () => m.svc_ai_tag(),
			title: () => m.svc_ai_title(),
			body: () => m.svc_ai_body(),
			points: [() => m.svc_ai_point_1(), () => m.svc_ai_point_2(), () => m.svc_ai_point_3()],
			links: []
		},
		{
			id: 'd6e',
			icon: Boxes,
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
			id: 'capital',
			icon: Landmark,
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
			<article
				class="grid gap-6 border-t border-border py-10 last:border-b md:grid-cols-[1fr_1.4fr] md:gap-16 md:py-12"
			>
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
						Hairline cells rather than bulleted text: the three points read as
						a small spec panel, which sits better next to a heading than a list.
					-->
					<ul
						class="mt-7 grid gap-px overflow-hidden rounded-lg bg-border ring-1 ring-border sm:grid-cols-3"
					>
						{#each service.points as point (point())}
							<li class="bg-background px-4 py-3.5 text-sm leading-snug text-muted-foreground">
								{point()}
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
