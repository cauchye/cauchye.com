<script lang="ts">
	// The mark itself lives in $lib/assets/d6e.svg, copied from the product's own
	// favicon (d6e-ai/d6e → packages/frontend/static/favicon.svg) with the baked-in
	// colours swapped for currentColor and the viewBox cropped to the artwork —
	// the favicon's padding would leave it tiny inside a 20px badge. It is inlined
	// rather than linked so it can take the accent colour like the lucide icons.
	import mark from '$lib/assets/d6e.svg?raw';

	let { class: className = '' }: { class?: string } = $props();
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
<span class="inline-flex {className}" aria-hidden="true">{@html mark}</span>
