<script lang="ts">
	import Icon from '@iconify/svelte';
	import { statusIcons } from '.';

	export let headless = true;
	let limboRunning = false;
	let status: 'none' | 'loading' | 'done' | 'error' = 'none';
	let settings = false;
	let latestIndex = 0;
	let output: {
		topOrigin?: { code: string; quantity: number };
		topDestination?: { code: string; quantity: number };
	} = {};

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
		limboRunning = true;
		const today = new Date(Date.now());
		if (today.getHours() < 11) today.setDate(today.getDate() - 1);
		const outData = await window.api.limbo.run({ date: today, headless });
		output = { ...output, ...outData };
		status = 'done';
	}

	async function configure() {
		const existing = await window.api.limbo.getExisting();
		output = { ...output, ...existing };
		if (output.topOrigin.code != undefined) {
			status = 'done';
		}
	}

	configure();
</script>

<div class="bg-slate-400 p-4 rounded-lg">
	<h1 class="text-xl font-bold">LIMBO</h1>
	<div class="flex justify-between">
		<button class="rounded px-2 bg-green-400" on:click={limbo}>Start</button>
		{#if settings}
			<button class="rounded px-2 bg-gray-600 text-white" on:click={() => (settings = !settings)}>
				Save
			</button>
		{:else}
			<button class="rounded px-2 bg-gray-600 text-white" on:click={() => (settings = !settings)}>
				<Icon icon="mdi:gear" />
			</button>
		{/if}
	</div>
	{#if settings}
		Settings!
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
