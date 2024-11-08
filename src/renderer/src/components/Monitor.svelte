<script lang="ts">
	import { onMount } from 'svelte';
	import SettingsButton from './SettingsButton.svelte';
	import type { Config, MonitorConfig, Shipper, ShipperResult } from '.';

	interface Props {
		config: Config;
		cache: Cache;
	}

	let { config: fullConfig, cache }: Props = $props();
	let { headless } = $derived(fullConfig);

	let config: MonitorConfig = $state();
	let shippers: Shipper[] = $state([]);
	let outbounds: Shipper[] = $state([]);

	onMount(() => {
		config = fullConfig.monitor;
		shippers = config.shippers ?? [];
		outbounds = config.outbounds ?? [];
	});

	let results: { [name: string]: ShipperResult | undefined } = $state({});
	let settings = $state(false);

	function runAll() {
		shippers.filter(({ selected }) => selected).forEach(runShipper);
		outbounds.filter(({ selected }) => selected).forEach(runShipper);
	}

	async function runShipper(shipper: Shipper) {
		const { inPath, outPath } = shipper;
		// const result = results[shipper.name];
		// if (result) {
		// 	result.loading = true;
		// }
		const { pieceCount, scannedCount } = await window.api.monitor.run({
			data: { inPath, outPath },
			headless
		});
		results[shipper.name] = { pieceCount, scannedCount };
	}

	async function schedule() {
		while (config.automatic) {
			await new Promise((r) => setTimeout(r, 300000));
			console.log(Date.now());
		}
	}

	function openFile(path: string) {
		window.api.file.open(path);
	}

	$effect(() => {
		if (config?.automatic) schedule();
	});
</script>

{#if config}
	<div class="bg-slate-400 flex flex-col gap-2 p-4 rounded-lg">
		<div class="flex justify-between items-center">
			<h1 class="text-xl font-bold">Monitor</h1>
			<SettingsButton bind:settings />
		</div>
		<div class="flex flex-col gap-1">
			<div class="flex items-center gap-2">
				<button class="bg-green-400 rounded px-2 flex-grow" onclick={runAll}>Start</button>
				<label class="flex items-center gap-1 text-sm font-bold"
					>Automatic <input type="checkbox" bind:checked={config.automatic} /></label
				>
			</div>
			{#if !settings}
				<div>
					Shippers
					<div class="flex flex-col gap-2">
						{#each shippers.filter(({ active }) => active) as shipper}
							{@render shipperModule(shipper)}
						{/each}
					</div>
				</div>
				<div>
					Outbounds
					<div class="flex flex-col gap-2">
						{#each outbounds.filter(({ active }) => active) as outbound}
							{@render shipperModule(outbound)}
						{/each}
					</div>
				</div>
			{:else}
				{@render settingsSection()}
			{/if}
		</div>
	</div>
{/if}

{#snippet settingsSection()}
	<h1 class="text-lg font-bold">Settings</h1>
	<div class="bg-slate-300">
		<div>
			Shippers
			<div class="flex flex-col">
				{#each shippers as shipper}
					<div class="bg-slate-100 px-4 py-1">
						<div class="flex justify-between gap-2">
							<div class="font-bold">
								{shipper.name}
							</div>
							<input type="checkbox" bind:checked={shipper.active} />
						</div>
					</div>
				{/each}
			</div>
		</div>
		<div>
			Outbounds
			<div class="flex flex-col">
				{#each outbounds as outbound}
					<div class="bg-slate-100 px-4 py-1">
						<div class="flex justify-between gap-2">
							<div class="font-bold">
								{outbound.name}
							</div>
							<input type="checkbox" bind:checked={outbound.active} />
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/snippet}

{#snippet shipperModule(shipper: Shipper)}
	{@const result = results[shipper.name]}
	<div class="bg-slate-100 px-4 py-2 rounded">
		<div class="flex justify-between gap-2 items-center">
			<button class="font-bold" onclick={() => openFile(shipper.outPath)}>
				{shipper.name}
			</button>
			{#if result?.pieceCount}
				<button onclick={() => (config.pieceCountDisplay = !config.pieceCountDisplay)}>
					{#if config.pieceCountDisplay}
						<span class="text-xs">{result.scannedCount}/{result.pieceCount}</span>
					{:else}
						{Math.round((result.scannedCount / result.pieceCount) * 10000) / 100}%
					{/if}
				</button>
			{/if}
			<input type="checkbox" bind:checked={shipper.selected} />
		</div>
	</div>
{/snippet}
