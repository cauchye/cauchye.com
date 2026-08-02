<script lang="ts">
	import SectionHeading from '$lib/components/sections/section-heading.svelte';
	import { m } from '$lib/paraglide/messages';
</script>

<section id="leadership" class="border-t border-border section">
	<SectionHeading eyebrow={m.leader_eyebrow()} title={m.leader_title()} />

	<!-- Name, reading, title, then the career as prose — the standard profile form. -->
	<div class="mt-12 grid gap-6 md:grid-cols-[1fr_1.4fr] md:gap-16">
		<div>
			<p class="text-2xl font-semibold">{m.leader_name()}</p>
			<p class="mt-1.5 font-mono text-xs tracking-widest text-muted-foreground">
				{m.leader_name_native()}
			</p>
			<p class="mt-4 text-sm text-muted-foreground">{m.leader_role()}</p>
		</div>

		<p class="max-w-2xl leading-loose">{m.leader_bio()}</p>
	</div>
</section>
