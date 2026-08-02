<script lang="ts">
	import './layout.css';

	import favicon from '$lib/assets/favicon.svg';
	import Footer from '$lib/components/footer.svelte';
	import Header from '$lib/components/header.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex min-h-svh flex-col">
	<Header />

	<main class="container mx-auto flex-1">
		{@render children()}
	</main>

	<Footer />
</div>
