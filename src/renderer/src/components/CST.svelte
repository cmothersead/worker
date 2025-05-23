<script lang="ts">
	import Icon from '@iconify/svelte';
	import { type Cache, type Config, type CSTConfig } from '.';
	import { onMount } from 'svelte';
	import { getToday } from '../../../main/scripts';
	import SettingsButton from './SettingsButton.svelte';
	import { slide } from 'svelte/transition';

	interface Props {
		config: Config;
		cache: Cache;
	}

	let { config: fullConfig }: Props = $props();

	let config: CSTConfig = $state();
	let {
		shippers,
		summarizedShippers,
		outputDirectoryPath,
		shipperDirectoryPath,
		preAlertDirectoryPath
	} = $derived(config);

	let settings: boolean = $state(false);

	onMount(async () => {
		if (fullConfig.cst == undefined) {
			fullConfig.cst = {
				automatic: false,
				autoStartTime: {
					hour: 23,
					minute: 40
				},
				shippers: [
					'Eureka',
					'Maxcess - Roto Die',
					'North Coast Seafood',
					'Reptiles by Mack',
					'Seafood.com'
				],
				summarizedShippers: ['Cardinal', 'Cencora', 'Humana'],

				shipperDirectoryPath: '',
				preAlertDirectoryPath: '',
				outputDirectoryPath: ''
			};
		}
		config = fullConfig.cst;

		if (config.automatic) {
			schedule();
		}
	});

	// $effect(() => {
	// 	if (cache) {
	// 		cache.shippers = Object.fromEntries(
	// 			[...criticalOutput, ...preAlertOutput]
	// 				.filter(({ count }) => count !== undefined)
	// 				.map(({ name, count }) => [name, { count }])
	// 		);
	// 	}
	// });

	async function cstReport() {
		console.log(config);
		window.api.shippers.aggregate({
			shippers: JSON.parse(JSON.stringify(shippers)),
			summarizedShippers: JSON.parse(JSON.stringify(summarizedShippers)),
			outputDirectoryPath,
			shipperDirectoryPath,
			preAlertDirectoryPath
		});
	}

	async function schedule() {
		const today = getToday();
		const dateString = `${today.toLocaleDateString('en-us', { month: '2-digit' })}${today.toLocaleDateString('en-us', { day: '2-digit' })}`;
		if (
			await window.api.file.exists(
				`${config.outputDirectoryPath}/Shipments by Outbound - ${dateString}.xlsx`
			)
		)
			return;
		const now = new Date(Date.now());
		const hours = now.getHours();
		const minutes = now.getMinutes();
		if ((hours <= 23 && hours >= 10) || (hours === 23 && minutes < 30)) {
			const timeUntil = (23 - hours) * 3600000 + (40 - minutes) * 60000;
			await new Promise((r) => setTimeout(r, timeUntil));
		}
		cstReport();
	}
</script>

{#if config}
	<div class="flex flex-col bg-slate-400 p-4 rounded-lg overflow-hidden min-w-[300px] gap-2">
		<div class="flex justify-between items-center">
			<h1 class="text-xl font-bold">CST Report</h1>
			<SettingsButton bind:settings />
		</div>
		{#if !settings}
			<div class="flex items-center gap-2">
				<button class="rounded px-2 bg-green-400 flex-grow" onclick={cstReport}>Start</button>
				<label class="flex items-center gap-1 text-sm font-bold"
					>Automatic<input type="checkbox" bind:checked={config.automatic} /></label
				>
			</div>
		{:else}
			{@render settingsSection()}
		{/if}
	</div>
{/if}

{#snippet editButton(onclick)}
	<button class="bg-blue-400 px-2 rounded flex items-center gap-1" {onclick}
		><Icon icon="bxs:edit" /> Edit</button
	>
{/snippet}

{#snippet settingsSection()}
	<div class="flex flex-col gap-2 overflow-hidden" transition:slide>
		Settings
		<div class="flex flex-col gap-2 pe-2 overflow-y-auto">
			<div class="bg-slate-100 p-3 rounded">
				<div class="flex justify-between items-center">
					<span class="text-md font-bold">Output Directory</span>
					{@render editButton(
						async () => (config.outputDirectoryPath = (await window.api.dialog.folder()).at(0))
					)}
				</div>
				<p class="text-xs">{config.outputDirectoryPath}</p>
			</div>
			<div class="bg-slate-100 p-3 rounded">
				<div class="flex justify-between items-center">
					<span class="text-md font-bold">Critical Shipper Directory</span>
					{@render editButton(
						async () => (config.shipperDirectoryPath = (await window.api.dialog.folder()).at(0))
					)}
				</div>
				<p class="text-xs">{config.shipperDirectoryPath}</p>
			</div>
			<div class="bg-slate-100 p-3 rounded">
				<div class="flex justify-between items-center">
					<div>
						<span class="text-md font-bold">Pre-Alert Directory</span>
					</div>
					{@render editButton(
						async () => (config.preAlertDirectoryPath = (await window.api.dialog.folder()).at(0))
					)}
				</div>
				<p class="text-xs">{config.preAlertDirectoryPath}</p>
			</div>
		</div>
	</div>
{/snippet}
