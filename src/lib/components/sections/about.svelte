<script lang="ts">
	import { m } from '$lib/paraglide/messages';
</script>

<!--
	Deliberately quiet: a smaller heading and body than every other section. The
	hero states the philosophy in plain language; this is where the reader who
	wants the reason behind it finds the name's origin.
-->
<section id="about" class="border-t border-border section">
	<div class="grid gap-6 md:grid-cols-[16rem_1fr] md:gap-16">
		<div>
			<p class="font-mono text-[0.6875rem] tracking-[0.14em] text-brand uppercase">
				{m.about_eyebrow()}
			</p>
			<h2 class="mt-3 text-lg font-semibold">{m.about_title()}</h2>
		</div>

		<div class="max-w-2xl space-y-5 text-sm leading-relaxed text-muted-foreground">
			<p>{m.about_body_1()}</p>
			<p>{m.about_body_2()}</p>
		</div>
	</div>
</section>
