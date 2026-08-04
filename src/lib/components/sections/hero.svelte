<script lang="ts">
	import MapBackdrop from '$lib/components/map-backdrop.svelte';
	import { m } from '$lib/paraglide/messages';
</script>

<section class="relative isolate pt-20 pb-16 md:pt-28 md:pb-20">
	<!--
		Bleeds into the container gutters so the grid reaches the viewport edge on
		narrow screens; the radial mask in `grid-backdrop` fades it out on wide ones.
	-->
	<div
		class="pointer-events-none absolute inset-0 -z-10 -mx-5 grid-backdrop md:-mx-8"
		aria-hidden="true"
	></div>

	<!-- The two places we work from, sitting in the space the headline leaves. -->
	<MapBackdrop
		class="pointer-events-none absolute right-0 bottom-4 hidden h-60 w-72 text-brand/12 lg:block"
	/>

	<!--
		Each clause is its own block so the line break lands between them at every
		width — Japanese in particular reads badly when the two run together.
	-->
	<h1
		class="max-w-4xl text-4xl leading-[1.12] font-semibold sm:text-5xl md:text-6xl lg:text-[4.25rem]"
	>
		<span class="block">{m.hero_title_lead()}</span>
		<span class="block bg-linear-to-br from-brand to-foreground bg-clip-text text-transparent">
			{m.hero_title_accent()}
		</span>
	</h1>

	<!-- Same right edge as the headline, so the column reads as one block. -->
	<p class="mt-8 max-w-4xl text-base leading-relaxed text-muted-foreground md:text-lg">
		{m.hero_body()}
	</p>
</section>
