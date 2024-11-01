<script lang="ts">
	import { onMount } from 'svelte';
	import SettingsButton from './SettingsButton.svelte';

	type Shipper = {
		name: string;
		inPath: string;
		outPath: string;
		active?: boolean;
		selected?: boolean;
	};

	type ShipperResult = {
		pieceCount?: number;
		scannedCount?: number;
	};

	let { headless = true } = $props();
	let config = $state(undefined);
	let settings = $state(false);
	let shippers: Shipper[] = $state([]);
	let outbounds: Shipper[] = $state([]);
	let results: { [name: string]: ShipperResult | undefined } = $state({});
	let pieceCountDisplay = $state(true);
	let automatic = $state(true);

	async function configure() {
		config = (await window.api.config.read()).monitor;
		shippers = config.shippers ?? [];
		outbounds = config.outbounds ?? [];
		pieceCountDisplay = config.pieceCountDisplay;
	}

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
		while (automatic) {
			await new Promise((r) => setTimeout(r, 300000));
			console.log(Date.now());
		}
	}

	onMount(configure);

	$effect(() => {
		window.api.config.update(JSON.parse(JSON.stringify({ monitor: { ...config } })));
	});
	$effect(() => {
		window.api.cache.update(JSON.parse(JSON.stringify({ monitor: results })));
	});
	$effect(() => {
		if (automatic) schedule();
	});
</script>

<div class="bg-slate-400 flex flex-col gap-2 p-4 rounded-lg">
	<div class="flex justify-between items-center">
		<h1 class="text-xl font-bold">Monitor</h1>
		<SettingsButton bind:settings />
	</div>
	<div class="flex flex-col gap-1">
		<div class="flex items-center gap-2">
			<button class="bg-green-400 rounded px-2 flex-grow" onclick={runAll}>Start</button>
			<label class="flex items-center gap-1 text-sm font-bold"
				>Automatic <input type="checkbox" bind:checked={automatic} /></label
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
			<div class="font-bold">
				{shipper.name}
			</div>
			{#if result?.pieceCount}
				<button onclick={() => (pieceCountDisplay = !pieceCountDisplay)}>
					{#if pieceCountDisplay}
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
