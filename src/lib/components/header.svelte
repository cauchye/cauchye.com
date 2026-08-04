<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Check from '@lucide/svelte/icons/check';
	import Globe from '@lucide/svelte/icons/globe';
	import Menu from '@lucide/svelte/icons/menu';

	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Separator } from '$lib/components/ui/separator';
	import { m } from '$lib/paraglide/messages';
	import { deLocalizeHref, getLocale, localizeHref, locales } from '$lib/paraglide/runtime';
	import { navItems, site } from '$lib/site';

	let mobileOpen = $state(false);
	let scrolled = $state(false);

	const home = $derived(localizeHref('/'));
	const bareHref = $derived(deLocalizeHref(page.url.pathname));
	const activeLocale = $derived(getLocale());

	const localeLabel: Record<string, string> = { en: 'English', ja: '日本語' };
</script>

<svelte:window onscroll={() => (scrolled = window.scrollY > 8)} />

<!--
	Transparent over the hero, then earns a border and a blurred backdrop once
	the page scrolls — so the top of the site reads as one uninterrupted surface.
-->
<header
	data-scrolled={scrolled ? '' : undefined}
	class="sticky top-0 z-50 border-b border-transparent transition-[background-color,border-color,backdrop-filter] duration-300 data-scrolled:border-border data-scrolled:bg-background/80 data-scrolled:backdrop-blur-md"
>
	<div class="container mx-auto flex h-16 items-center gap-6">
		<a
			href={home}
			class="group -mx-1.5 flex items-center gap-2.5 rounded-md px-1.5 py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			<span
				class="size-2 rounded-full bg-brand transition-transform duration-300 group-hover:scale-125"
				aria-hidden="true"
			></span>
			<span class="text-[0.8125rem] font-semibold tracking-widest whitespace-nowrap sm:text-sm">
				{site.legalName}
			</span>
		</a>

		<nav class="hidden flex-1 items-center gap-1 md:flex" aria-label={m.nav_menu_label()}>
			{#each navItems as item (item.hash)}
				<a
					href="{home}{item.hash}"
					class="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
				>
					{item.label()}
				</a>
			{/each}
		</nav>

		<div class="ml-auto flex items-center gap-1 md:ml-0">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="icon" class="rounded-full">
							<Globe />
							<span class="sr-only">{m.locale_label()}</span>
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>

				<DropdownMenu.Content align="end" class="min-w-40">
					{#each locales as locale (locale)}
						<!--
							Each option is a real link, and a full reload rather than a
							client-side nav: the locale lives in the URL, so the server has to
							re-render the tree for the new one.
						-->
						<DropdownMenu.Item>
							{#snippet child({ props })}
								<a {...props} href={localizeHref(bareHref, { locale })} data-sveltekit-reload>
									{localeLabel[locale] ?? locale.toUpperCase()}
									{#if locale === activeLocale}
										<Check class="ml-auto text-brand" />
									{/if}
								</a>
							{/snippet}
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<Button href="{home}#contact" variant="brand" size="sm" class="ml-2 hidden sm:inline-flex">
				{m.nav_contact()}
			</Button>

			<Sheet.Root bind:open={mobileOpen}>
				<Sheet.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="icon" class="rounded-full md:hidden">
							<Menu />
							<span class="sr-only">{m.nav_menu_open()}</span>
						</Button>
					{/snippet}
				</Sheet.Trigger>

				<Sheet.Content side="right" class="w-full max-w-xs">
					<Sheet.Header>
						<Sheet.Title class="text-left text-sm tracking-widest">{site.legalName}</Sheet.Title>
						<Sheet.Description class="text-left">{m.brand_descriptor()}</Sheet.Description>
					</Sheet.Header>

					<nav class="flex flex-col px-4" aria-label={m.nav_menu_label()}>
						{#each navItems as item (item.hash)}
							<a
								href="{home}{item.hash}"
								onclick={() => (mobileOpen = false)}
								class="border-b border-border py-3.5 text-base transition-colors hover:text-brand"
							>
								{item.label()}
							</a>
						{/each}
					</nav>

					<Sheet.Footer>
						<Separator class="mb-2" />
						<Button
							href="{home}#contact"
							variant="brand"
							size="lg"
							class="w-full"
							onclick={() => (mobileOpen = false)}
						>
							{m.contact_cta()}
							<ArrowRight data-icon="inline-end" />
						</Button>
					</Sheet.Footer>
				</Sheet.Content>
			</Sheet.Root>
		</div>
	</div>
</header>
