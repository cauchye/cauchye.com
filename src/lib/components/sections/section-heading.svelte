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

<!--
	Shared heading block, so every section starts on the same vertical rhythm.
	With a body it splits on the same columns the content below uses, so the
	measure of the paragraph lines up with the section instead of stopping at an
	arbitrary width.
-->
<div class="grid gap-4 md:grid-cols-[1fr_1.4fr] md:gap-16">
	<div>
		<p class="font-mono text-[0.6875rem] tracking-[0.14em] text-brand uppercase">{eyebrow}</p>
		<h2 class="mt-3 text-3xl font-semibold md:text-4xl">{title}</h2>
		{#if subtitle}
			<p class="mt-2 text-base text-muted-foreground">{subtitle}</p>
		{/if}
	</div>

	{#if body}
		<p class="leading-relaxed text-muted-foreground md:mt-1">{body}</p>
	{/if}
</div>
