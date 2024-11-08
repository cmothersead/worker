<script lang="ts">
	import Icon from '@iconify/svelte';
	import { statusIcons } from '.';
	import SettingsButton from './SettingsButton.svelte';
	import { onMount } from 'svelte';
	import { getToday } from '../../../main/scripts';
	import type { LimboConfig } from '.';
	import type { LimboCache } from '.';

	interface Props {
		config: {
			headless: boolean;
			limbo: LimboConfig;
		};
		cache: {
			limbo: LimboCache;
		};
	}

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

	const today = getToday();

	let { config: fullConfig, cache }: Props = $props();
	let { headless } = $derived(fullConfig);

	let config: LimboConfig = $state();
	let untilIndex = $state(0);
	let { automatic } = $derived(config);

	let status: 'none' | 'loading' | 'done' | 'error' = $state('none');
	let settings = $state(false);
	let output: LimboCache = $state();

	onMount(async () => {
		config = fullConfig.limbo;
		untilIndex = config.untilIndex;
		output = cache?.limbo;
		if (output?.topOrigin?.code === undefined) {
			cache.limbo = await window.api.limbo.getExisting();
		}
		if (output?.topOrigin?.code != undefined) {
			status = 'done';
		}
		if (automatic && status != 'done' && today.getDay() != 1) {
			limbo();
		}
	});

	async function limbo() {
		status = 'loading';
		output = await window.api.limbo.run({ date: today, untilIndex, headless });
		status = 'done';
	}
</script>

{#if config}
	<div class="bg-slate-400 flex flex-col gap-2 p-4 rounded-lg">
		<div class="flex justify-between items-center">
			<h1 class="text-xl font-bold">LIMBO</h1>
			<SettingsButton bind:settings />
		</div>
		<div class="flex items-center gap-2">
			<button class="rounded px-2 bg-green-400 flex-grow" onclick={limbo}>Start</button>
			<label class="flex items-center gap-1 text-sm font-bold"
				>Automatic <input
					type="checkbox"
					bind:checked={config.automatic}
					onclick={() => {
						if (automatic && status != 'done' && today.getDay() != 1) {
							limbo();
						}
					}}
				/></label
			>
		</div>
		{#if settings}
			Settings
			<div>
				<div>
					<span class="font-bold">Include Freight Until:</span>
					{latestValues[untilIndex].display}
				</div>
				<input type="range" min="0" max="7" bind:value={untilIndex} class="w-full" />
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
						<span class="text-2xl font-bold">{output?.topOrigin?.code ?? ''}</span>
						<span class="text-xl">{output?.topOrigin?.quantity ?? ''}</span>
					</div>
				</div>
				<div>
					<span class="font-bold">Top Destination:</span>
					<div class="flex justify-center items-center gap-4">
						<span class="text-2xl font-bold">{output?.topDestination?.code ?? ''}</span>
						<span class="text-xl">{output?.topDestination?.quantity ?? ''}</span>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}
