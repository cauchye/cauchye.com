<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	import { Button } from '$lib/components/ui/button';
	import { m } from '$lib/paraglide/messages';
	import { site } from '$lib/site';
</script>

<!--
	Sits directly above the footer as its own band — the placement every corporate
	site uses for the close-out. The only inverted surface on the page, so it lands.
-->
<section id="contact" class="section">
	<div
		class="relative overflow-hidden rounded-2xl bg-primary px-6 py-14 text-primary-foreground md:px-12 md:py-20"
	>
		<div
			class="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-brand/30 blur-3xl"
			aria-hidden="true"
		></div>

		<div class="relative max-w-2xl">
			<p class="font-mono text-[0.6875rem] tracking-[0.14em] uppercase opacity-60">
				{m.contact_eyebrow()}
			</p>
			<h2 class="mt-3 text-3xl font-semibold md:text-4xl">{m.contact_title()}</h2>
			<p class="mt-4 leading-relaxed opacity-70">{m.contact_body()}</p>

			<Button
				href="mailto:{site.email}"
				size="xl"
				class="mt-8 bg-background text-foreground hover:bg-background/90"
			>
				{m.contact_cta()}
				<ArrowRight data-icon="inline-end" />
			</Button>

			<p class="mt-4 font-mono text-sm opacity-60">{site.email}</p>
		</div>
	</div>
</section>
