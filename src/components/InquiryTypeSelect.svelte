<script lang="ts">
	import * as Select from '@/components/ui/select/index.js';

	type InquiryOption = {
		value: string;
		label: string;
	};

	interface Props {
		name: string;
		placeholder: string;
		options: InquiryOption[];
		errorId: string;
	}

	let { name, placeholder, options, errorId }: Props = $props();
	let value = $state('');
	const selectedLabel = $derived(
		options.find((option) => option.value === value)?.label ?? placeholder
	);
</script>

<Select.Root type="single" {name} required items={options} bind:value>
	<Select.Trigger
		id={name}
		data-field-control={name}
		aria-describedby={errorId}
		class="h-10 w-full text-base md:text-sm"
	>
		{selectedLabel}
	</Select.Trigger>
	<Select.Content>
		<Select.Group>
			{#each options as option (option.value)}
				<Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
			{/each}
		</Select.Group>
	</Select.Content>
</Select.Root>
