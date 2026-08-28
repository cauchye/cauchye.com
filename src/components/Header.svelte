<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Check from '@lucide/svelte/icons/check';
	import Globe from '@lucide/svelte/icons/globe';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';

	import { Button } from '@/components/ui/button/index.js';
	import * as DropdownMenu from '@/components/ui/dropdown-menu/index.js';
	import { Separator } from '@/components/ui/separator/index.js';
	import * as Sheet from '@/components/ui/sheet/index.js';
	import type { Dictionary, Locale, MessageKey } from '@/i18n';
	import { site } from '@/site';

	interface Props {
		locale: Locale;
		messages: Dictionary;
		pagePath?: string;
	}

	const localeOptions = [
		{ locale: 'en', label: 'English' },
		{ locale: 'ja', label: '日本語' }
	] as const;
	type PageNavItem = { hash: string; label: MessageKey };
	const homeNavItems: PageNavItem[] = [
		{ hash: '#services', label: 'nav_services' },
		{ hash: '#company', label: 'nav_company' }
	];
	const aiNavItems: PageNavItem[] = [
		{ hash: '#partners', label: 'nav_partners' },
		{ hash: '#capabilities', label: 'nav_capabilities' },
		{ hash: '#strengths', label: 'nav_strengths' },
		{ hash: '#product', label: 'nav_product' },
		{ hash: '#clients', label: 'nav_clients' }
	];
	const advisoryNavItems: PageNavItem[] = [
		{ hash: '#capabilities', label: 'nav_capabilities' },
		{ hash: '#perspective', label: 'nav_perspective' },
		{ hash: '#partners', label: 'nav_partners' }
	];

	let { locale, messages: m, pagePath = '' }: Props = $props();

	let mobileOpen = $state(false);
	let scrolled = $state(false);

	const home = $derived(`/${locale}`);
	const currentPage = $derived(`${home}${pagePath}`);
	const pageNavItems = $derived(
		pagePath === '/contact'
			? []
			: pagePath === '/business/it-ai'
				? aiNavItems
				: pagePath === '/business/corporate-advisory'
					? advisoryNavItems
					: homeNavItems
	);

	$effect(() => {
		const updateHeader = () => (scrolled = window.scrollY > 8);
		updateHeader();
		window.addEventListener('scroll', updateHeader, { passive: true });
		return () => window.removeEventListener('scroll', updateHeader);
	});
</script>

<header
	data-site-header
	data-scrolled={scrolled ? '' : undefined}
	class="sticky top-0 z-50 border-b border-transparent transition-[background-color,border-color,backdrop-filter] duration-300 data-scrolled:border-border data-scrolled:bg-background/80 data-scrolled:backdrop-blur-md"
>
	<div class="container mx-auto flex h-16 items-center gap-6">
		<a
			href={home}
			class="group -mx-1.5 flex items-center gap-2.5 rounded-full px-1.5 py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			<img
				src="/favicon.svg"
				alt=""
				class="size-6 transition-transform duration-300 group-hover:scale-105"
				width="24"
				height="24"
			/>
			<span class="text-[0.8125rem] font-semibold tracking-widest whitespace-nowrap sm:text-sm">
				{site.legalName}
			</span>
		</a>

		<nav class="hidden flex-1 items-center gap-1 lg:flex" aria-label={m.nav_menu_label}>
			{#each pageNavItems as item (item.hash)}
				<a
					href={`${currentPage}${item.hash}`}
					class="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
				>
					{m[item.label]}
				</a>
			{/each}
		</nav>

		<div class="ml-auto flex items-center gap-1 lg:ml-0">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button variant="outline" size="icon" {...props}>
							<Globe />
							<span class="sr-only">{m.locale_label}</span>
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="min-w-40">
					{#each localeOptions as option (option.locale)}
						<DropdownMenu.Item>
							{#snippet child({ props })}
								<a href={`/${option.locale}${pagePath}`} lang={option.locale} {...props}>
									{option.label}
									{#if option.locale === locale}
										<Check class="ml-auto text-brand" />
									{/if}
								</a>
							{/snippet}
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<Button
				href={`${home}/contact`}
				variant="brand"
				size="sm"
				class="ml-2 hidden h-8 px-3 sm:inline-flex"
			>
				{m.nav_contact}
			</Button>

			<Sheet.Root bind:open={mobileOpen}>
				<Sheet.Trigger>
					{#snippet child({ props })}
						<Button variant="outline" size="icon" class="lg:hidden" {...props}>
							<Menu />
							<span class="sr-only">{m.nav_menu_open}</span>
						</Button>
					{/snippet}
				</Sheet.Trigger>
				<Sheet.Content
					side="right"
					showCloseButton={false}
					class="w-80 gap-0 bg-background text-foreground"
				>
					<Sheet.Header class="relative gap-2 border-b border-border p-5 pr-14">
						<Sheet.Title class="text-left text-sm font-semibold tracking-widest">
							{site.legalName}
						</Sheet.Title>
						<Sheet.Description class="text-left leading-relaxed">
							{m.brand_descriptor}
						</Sheet.Description>
						<Sheet.Close>
							{#snippet child({ props })}
								<Button
									variant="outline"
									size="icon"
									class="absolute top-4 right-4"
									aria-label={m.nav_menu_close}
									{...props}
								>
									<X />
								</Button>
							{/snippet}
						</Sheet.Close>
					</Sheet.Header>

					<nav class="flex flex-col px-4" aria-label={m.nav_menu_label}>
						{#each pageNavItems as item (item.hash)}
							<a
								href={`${currentPage}${item.hash}`}
								onclick={() => (mobileOpen = false)}
								class="border-b border-border py-3.5 text-base transition-colors hover:text-brand"
							>
								{m[item.label]}
							</a>
						{/each}
					</nav>

					<Sheet.Footer>
						<Separator class="mb-2" />
						<Sheet.Close>
							{#snippet child({ props })}
								<Button
									href={`${home}/contact`}
									variant="brand"
									class="h-11 w-full px-6"
									{...props}
								>
									{m.contact_cta}
									<ArrowRight data-icon="inline-end" />
								</Button>
							{/snippet}
						</Sheet.Close>
					</Sheet.Footer>
				</Sheet.Content>
			</Sheet.Root>
		</div>
	</div>
</header>
