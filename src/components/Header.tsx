import { useEffect, useState } from 'react';
import { ArrowRight, Check, Globe, Menu, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger
} from '@/components/ui/sheet';
import type { Dictionary, Locale } from '@/i18n';
import { navItems, site } from '@/site';

interface HeaderProps {
	locale: Locale;
	messages: Dictionary;
}

const localeOptions = [
	{ locale: 'en', label: 'English' },
	{ locale: 'ja', label: '日本語' }
] as const;

export default function Header({ locale, messages: m }: HeaderProps) {
	const [mobileOpen, setMobileOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const home = `/${locale}`;

	useEffect(() => {
		const updateHeader = () => setScrolled(window.scrollY > 8);
		updateHeader();
		window.addEventListener('scroll', updateHeader, { passive: true });
		return () => window.removeEventListener('scroll', updateHeader);
	}, []);

	return (
		<header
			data-site-header
			data-scrolled={scrolled ? '' : undefined}
			className="sticky top-0 z-50 border-b border-transparent transition-[background-color,border-color,backdrop-filter] duration-300 data-scrolled:border-border data-scrolled:bg-background/80 data-scrolled:backdrop-blur-md"
		>
			<div className="container mx-auto flex h-16 items-center gap-6">
				<a
					href={home}
					className="group -mx-1.5 flex items-center gap-2.5 rounded-md px-1.5 py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					<span
						className="size-2 rounded-full bg-brand transition-transform duration-300 group-hover:scale-125"
						aria-hidden="true"
					/>
					<span className="text-[0.8125rem] font-semibold tracking-widest whitespace-nowrap sm:text-sm">
						{site.legalName}
					</span>
				</a>

				<nav className="hidden flex-1 items-center gap-1 md:flex" aria-label={m.nav_menu_label}>
					{navItems.map((item) => (
						<a
							key={item.hash}
							href={`${home}${item.hash}`}
							className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
						>
							{m[item.label]}
						</a>
					))}
				</nav>

				<div className="ml-auto flex items-center gap-1 md:ml-0">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="icon" className="rounded-full">
								<Globe />
								<span className="sr-only">{m.locale_label}</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="min-w-40">
							{localeOptions.map((option) => (
								<DropdownMenuItem key={option.locale} asChild>
									<a href={`/${option.locale}`} lang={option.locale}>
										{option.label}
										{option.locale === locale && <Check className="ml-auto text-brand" />}
									</a>
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					<Button asChild variant="brand" size="sm" className="ml-2 hidden h-8 px-3 sm:inline-flex">
						<a href={`${home}#contact`}>{m.nav_contact}</a>
					</Button>

					<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
						<SheetTrigger asChild>
							<Button variant="outline" size="icon" className="rounded-full md:hidden">
								<Menu />
								<span className="sr-only">{m.nav_menu_open}</span>
							</Button>
						</SheetTrigger>
						<SheetContent
							side="right"
							showCloseButton={false}
							className="w-full max-w-xs gap-0 bg-background text-foreground"
						>
							<SheetHeader className="relative gap-2 border-b border-border p-5 pr-14">
								<SheetTitle className="text-left text-sm font-semibold tracking-widest">
									{site.legalName}
								</SheetTitle>
								<SheetDescription className="text-left leading-relaxed">
									{m.brand_descriptor}
								</SheetDescription>
								<SheetClose asChild>
									<Button
										variant="outline"
										size="icon"
										className="absolute top-4 right-4 rounded-full"
										aria-label={m.nav_menu_close}
									>
										<X />
									</Button>
								</SheetClose>
							</SheetHeader>

							<nav className="flex flex-col px-4" aria-label={m.nav_menu_label}>
								{navItems.map((item) => (
									<a
										key={item.hash}
										href={`${home}${item.hash}`}
										onClick={() => setMobileOpen(false)}
										className="border-b border-border py-3.5 text-base transition-colors hover:text-brand"
									>
										{m[item.label]}
									</a>
								))}
							</nav>

							<SheetFooter>
								<Separator className="mb-2" />
								<SheetClose asChild>
									<Button asChild variant="brand" className="h-11 w-full px-6">
										<a href={`${home}#contact`}>
											{m.contact_cta}
											<ArrowRight data-icon="inline-end" />
										</a>
									</Button>
								</SheetClose>
							</SheetFooter>
						</SheetContent>
					</Sheet>
				</div>
			</div>
		</header>
	);
}
