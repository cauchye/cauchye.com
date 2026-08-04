<script lang="ts">
	/*
	 * Singapore and Japan, laid out the way they sit on a map — Singapore to the
	 * south-west, Japan to the north-east. Japan is a Natural Earth 1:10m outline
	 * (public domain, via world-atlas); Singapore comes from @geo-maps at 1km
	 * resolution, since a city-state is just a blob at any coarser scale. Both are
	 * served from /maps and painted through a CSS mask, so they follow the accent
	 * colour and the theme. The flags are public-domain SVGs from svg-country-flags.
	 *
	 * Decorative only: aria-hidden throughout, and the caller positions it
	 * absolutely so it never takes part in layout.
	 */
	let { class: className = '' }: { class?: string } = $props();
</script>

<!-- Sizes itself from the box the caller gives it, so it can fill a column. -->
<div class={className} aria-hidden="true">
	<!-- Singapore: an island this small is the flag's job to identify. -->
	<div class="absolute bottom-[6%] left-[4%] w-[36%]">
		<div class="aspect-[1.85] w-full bg-current mask-[url(/maps/singapore.svg)] mask-map"></div>
		<img
			src="/flags/sg.svg"
			alt=""
			class="mt-3.5 h-6 w-9 rounded-xs opacity-70 ring-1 ring-border"
		/>
	</div>

	<!-- Japan. -->
	<div class="absolute top-[4%] right-0 flex h-[76%] flex-col items-end">
		<div class="aspect-[0.75] h-full bg-current mask-[url(/maps/japan.svg)] mask-map"></div>
		<img
			src="/flags/jp.svg"
			alt=""
			class="mt-3.5 h-6 w-9 rounded-xs opacity-70 ring-1 ring-border"
		/>
	</div>
</div>
