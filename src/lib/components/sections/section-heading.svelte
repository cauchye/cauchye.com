<script lang="ts">
	let {
		eyebrow,
		title,
		subtitle,
		body
	}: {
		eyebrow: string;
		title: string;
		/** Sits under the title at a smaller size — for a name that needs qualifying. */
		subtitle?: string;
		body?: string;
	} = $props();
</script>

<!-- Shared heading block, so every section starts on the same vertical rhythm. -->
<div class="max-w-2xl">
	<p class="font-mono text-[0.6875rem] tracking-[0.14em] text-brand uppercase">{eyebrow}</p>
	<h2 class="mt-3 text-3xl font-semibold md:text-4xl">{title}</h2>
	{#if subtitle}
		<p class="mt-2 text-base text-muted-foreground">{subtitle}</p>
	{/if}
	{#if body}
		<p class="mt-4 leading-relaxed text-muted-foreground">{body}</p>
	{/if}
</div>
