<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		size = 'default',
		interactive = false,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		size?: 'default' | 'sm';
		/** Lifts and warms its border on hover. For cards that link somewhere. */
		interactive?: boolean;
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	data-size={size}
	data-interactive={interactive ? '' : undefined}
	class={cn(
		'group/card relative flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground shadow-xs ring-1 ring-foreground/10 transition-[box-shadow,transform,--tw-ring-color] duration-200 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-interactive:hover:-translate-y-0.5 data-interactive:hover:shadow-lg data-interactive:hover:shadow-foreground/5 data-interactive:hover:ring-brand/30 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
