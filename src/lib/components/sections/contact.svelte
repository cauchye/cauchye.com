<script lang="ts">
	import { enhance } from '$app/forms';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Check from '@lucide/svelte/icons/check';

	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { emptyContactValues, type ContactActionResult, type ContactField } from '$lib/contact';
	import { m } from '$lib/paraglide/messages';

	let { form }: { form: ContactActionResult } = $props();

	let submitting = $state(false);

	const values = $derived(form?.values ?? emptyContactValues);
	const errors = $derived(form?.errors);
	const succeeded = $derived(form?.success === true);
	const unavailable = $derived(form?.unavailable === true);

	/** FieldError takes objects; zod's flattened output is plain strings. */
	function messagesFor(field: ContactField) {
		return errors?.[field]?.map((message) => ({ message }));
	}

	function invalid(field: ContactField) {
		return (errors?.[field]?.length ?? 0) > 0;
	}
</script>

<!--
	Sits directly above the footer as its own band — the placement every corporate
	site uses for the close-out. The only inverted surface on the page, so it lands.

	`dark` on the panel re-points the tokens for everything inside it, so the
	inputs, field errors and button pick up their dark treatments on their own
	rather than needing per-element overrides here.
-->
<section id="contact" class="section">
	<div
		class="dark relative overflow-hidden rounded-2xl bg-background px-6 py-14 text-foreground md:px-12 md:py-20"
	>
		<div
			class="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-brand/25 blur-3xl"
			aria-hidden="true"
		></div>

		<div class="relative grid gap-10 md:grid-cols-[1fr_1.2fr] md:gap-16">
			<div class="max-w-md">
				<p class="font-mono text-[0.6875rem] tracking-[0.14em] text-brand uppercase">
					{m.contact_eyebrow()}
				</p>
				<h2 class="mt-3 text-3xl font-semibold md:text-4xl">{m.contact_title()}</h2>
				<p class="mt-4 leading-relaxed text-muted-foreground">{m.contact_body()}</p>
			</div>

			{#if succeeded}
				<div class="flex items-start gap-3 self-center rounded-xl bg-muted/60 p-6">
					<span
						class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand"
					>
						<Check class="size-4 text-brand-foreground" />
					</span>
					<div>
						<p class="font-medium">{m.form_success_title()}</p>
						<p class="mt-1 text-sm text-muted-foreground">{m.form_success_body()}</p>
					</div>
				</div>
			{:else}
				<form
					method="POST"
					action="?/contact"
					novalidate
					class="flex flex-col gap-5"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							// Keep what was typed — the action echoes the values back.
							await update({ reset: false });
							submitting = false;
						};
					}}
				>
					<!-- Honeypot: hidden from people, tempting to bots. -->
					<div class="hidden" aria-hidden="true">
						<label for="website">Website</label>
						<input id="website" name="website" type="text" tabindex={-1} autocomplete="off" />
					</div>

					<div class="grid gap-5 sm:grid-cols-2">
						<Field.Field data-invalid={invalid('name')}>
							<Field.Label for="name">{m.form_label_name()}</Field.Label>
							<Input
								id="name"
								name="name"
								required
								autocomplete="name"
								value={values.name}
								aria-invalid={invalid('name')}
							/>
							<Field.Error errors={messagesFor('name')} />
						</Field.Field>

						<Field.Field data-invalid={invalid('company')}>
							<Field.Label for="company">
								{m.form_label_company()}
								<span class="text-xs font-normal text-muted-foreground">
									{m.form_label_company_optional()}
								</span>
							</Field.Label>
							<Input
								id="company"
								name="company"
								autocomplete="organization"
								value={values.company}
								aria-invalid={invalid('company')}
							/>
							<Field.Error errors={messagesFor('company')} />
						</Field.Field>
					</div>

					<Field.Field data-invalid={invalid('email')}>
						<Field.Label for="email">{m.form_label_email()}</Field.Label>
						<Input
							id="email"
							name="email"
							type="email"
							required
							autocomplete="email"
							value={values.email}
							aria-invalid={invalid('email')}
						/>
						<Field.Error errors={messagesFor('email')} />
					</Field.Field>

					<Field.Field data-invalid={invalid('message')}>
						<Field.Label for="message">{m.form_label_message()}</Field.Label>
						<Textarea
							id="message"
							name="message"
							required
							rows={5}
							value={values.message}
							aria-invalid={invalid('message')}
						/>
						<Field.Description>{m.form_hint_message()}</Field.Description>
						<Field.Error errors={messagesFor('message')} />
					</Field.Field>

					{#if unavailable}
						<p role="alert" class="rounded-lg bg-destructive/15 px-4 py-3 text-sm text-destructive">
							{m.form_error_unavailable()}
						</p>
					{/if}

					<Button type="submit" variant="brand" size="xl" disabled={submitting} class="self-start">
						{submitting ? m.form_submitting() : m.form_submit()}
						<ArrowRight data-icon="inline-end" />
					</Button>
				</form>
			{/if}
		</div>
	</div>
</section>
