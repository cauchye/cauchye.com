<script lang="ts">
	import About from '$lib/components/sections/about.svelte';
	import Company from '$lib/components/sections/company.svelte';
	import Contact from '$lib/components/sections/contact.svelte';
	import Hero from '$lib/components/sections/hero.svelte';
	import Leadership from '$lib/components/sections/leadership.svelte';
	import Services from '$lib/components/sections/services.svelte';
	import { m } from '$lib/paraglide/messages';
	import { site } from '$lib/site';

	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	const title = $derived(`${site.legalName} — ${m.brand_descriptor()}`);
	const description = $derived(m.hero_body());

	const organizationSchema = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'Organization',
			name: site.legalName,
			alternateName: site.shortName,
			url: site.url,
			description,
			address: {
				'@type': 'PostalAddress',
				streetAddress: `${site.address.street}, ${site.address.unit}`,
				addressLocality: site.address.locality,
				postalCode: site.address.postalCode,
				addressCountry: site.address.country
			}
			// Escaping `<` makes a closing-script-tag breakout impossible regardless
			// of what ends up in these strings later.
		}).replace(/</g, '\\u003c')
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={site.url} />
	<!--
		JSON-LD has to be injected as raw markup — Svelte would otherwise compile a
		<script> in the head as component code. The payload is serialized from our
		own constants and `<` is escaped above, so there is nothing to inject.
	-->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html `<script type="application/ld+json">${organizationSchema}<` + `/script>`}
</svelte:head>

<Hero />
<Services />
<Leadership />
<About />
<Company />
<Contact {form} />
