<script lang="ts">
	import Icon from '@iconify/svelte';
	import { statusIcons } from '.';
	import SettingsButton from './SettingsButton.svelte';

	let { headless = true } = $props();
	let status: 'none' | 'loading' | 'done' | 'error' = $state('none');
	let settings = $state(false);
	let latestIndex = $state(0);
	let config = $state(undefined);
	let output: {
		topOrigin?: { code: string; quantity: number };
		topDestination?: { code: string; quantity: number };
	} = $state({});
	let automatic = $state(true);

	const latestValues = [
		{ value: 'B4 22:00', display: '22:00' },
		{ value: '22:00-22:59', display: '23:00' },
		{ value: '23:00-23:59', display: '00:00' },
		{ value: '00:00-00:29', display: '00:30' },
		{ value: '00:30-00:59', display: '01:00' },
		{ value: '01:00-01:29', display: '01:30' },
		{ value: '01:30-01:59', display: '02:00' },
		{ value: '02:00-02:59', display: '03:00' },
		{ value: 'After 02:59', display: 'All' }
	];

	async function limbo() {
		status = 'loading';
		const today = new Date(Date.now());
		if (today.getHours() < 11) today.setDate(today.getDate() - 1);
		const outData = await window.api.limbo.run({ date: today, untilIndex: latestIndex, headless });
		output = { ...output, ...outData };
		status = 'done';
	}

	async function configure() {
		const existing = await window.api.limbo.getExisting();
		config = (await window.api.config.read()).limbo;
		latestIndex = config.untilIndex;
		output = { ...output, ...existing };
		if (output?.topOrigin?.code != undefined) {
			status = 'done';
		}
	}

	$effect(() => {
		if (config?.untilIndex != undefined && config.untilIndex != latestIndex)
			window.api.config.update({ limbo: { untilIndex: latestIndex } });
	});

	configure();
</script>

<div class="bg-slate-400 flex flex-col gap-2 p-4 rounded-lg">
	<div class="flex justify-between items-center">
		<h1 class="text-xl font-bold">LIMBO</h1>
		<SettingsButton bind:settings />
	</div>
	<div class="flex items-center gap-2">
		<button class="rounded px-2 bg-green-400 flex-grow" onclick={limbo}>Start</button>
		<label class="flex items-center gap-1 text-sm font-bold"
			>Automatic <input type="checkbox" bind:checked={automatic} /></label
		>
	</div>
	{#if settings}
		Settings
		<div>
			<div>
				<span class="font-bold">Include Freight Until:</span>
				{latestValues[latestIndex].display}
			</div>
			<input type="range" min="0" max="7" bind:value={latestIndex} class="w-full" />
		</div>
	{:else}
		<div class="bg-slate-100 p-2 my-2 rounded">
			<div class="flex items-center gap-4">
				<span class="font-bold">Status:</span>
				<div>
					<span class:text-green-600={status == 'done'} class:text-red-600={status == 'error'}>
						<Icon icon={statusIcons[status]} class="text-xl" />
					</span>
				</div>
			</div>

			<div>
				<span class="font-bold">Top Origin:</span>
				<div class="flex justify-center items-center gap-4">
					<span class="text-2xl font-bold">{output.topOrigin?.code ?? ''}</span>
					<span class="text-xl">{output.topOrigin?.quantity ?? ''}</span>
				</div>
			</div>
			<div>
				<span class="font-bold">Top Destination:</span>
				<div class="flex justify-center items-center gap-4">
					<span class="text-2xl font-bold">{output.topDestination?.code ?? ''}</span>
					<span class="text-xl">{output.topDestination?.quantity ?? ''}</span>
				</div>
			</div>
		</div>
	{/if}
</div>
