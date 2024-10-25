<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	type Shipper = {
		name: string;
		inPath: string;
		outPath: string;
		active?: boolean;
		selected?: boolean;
		pieceCount?: number;
		scannedCount?: number;
	};

	let { headless = true } = $props();
	let config = $state(undefined);
	let settings = $state(false);
	let shippers: Shipper[] = $state([]);
	let outbounds: Shipper[] = $state([]);
	let pieceCountDisplay = $state(true);

	async function configure() {
		config = (await window.api.config.read()).monitor;
		shippers = config.shippers;
		outbounds = config.outbounds;
		pieceCountDisplay = config.pieceCountDisplay;
	}

	onMount(configure);

	$effect(() => {
		console.log('config update sent');
		window.api.config.update(JSON.parse(JSON.stringify({ monitor: { ...config } })));
	});
</script>

<div class="bg-slate-400 p-4 rounded-lg">
	<h1 class="text-xl font-bold">Monitor</h1>
	<div class="flex flex-col gap-1">
		<div class="flex justify-between">
			<button
				class="bg-green-400 rounded px-2"
				onclick={() => {
					shippers.forEach(async (shipper, index) => {
						const { selected, inPath, outPath } = shipper;
						if (selected) {
							const { pieceCount, scannedCount } = await window.api.monitor.run({
								data: { inPath, outPath },
								headless
							});
							shippers[index] = { ...shipper, pieceCount, scannedCount };
						}
					});
					outbounds.forEach(async (shipper, index) => {
						const { selected, inPath, outPath } = shipper;
						if (selected) {
							const { pieceCount, scannedCount } = await window.api.monitor.run({
								data: { inPath, outPath },
								headless
							});
							outbounds[index] = { ...shipper, pieceCount, scannedCount };
						}
					});
				}}>Run</button
			>
			<button class="rounded px-2 bg-gray-600 text-white" onclick={() => (settings = !settings)}>
				<Icon icon="mdi:gear" />
			</button>
		</div>
		{#if settings}
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
		{:else}
			<div>
				Shippers
				<div class="flex flex-col gap-2">
					{#each shippers.filter(({ active }) => active) as shipper}
						<div class="bg-slate-100 px-4 py-2 rounded">
							<div class="flex justify-between gap-2 items-center">
								<div class="font-bold">
									{shipper.name}
								</div>
								{#if shipper.pieceCount}
									<button onclick={() => (pieceCountDisplay = !pieceCountDisplay)}>
										{#if pieceCountDisplay}
											<span class="text-xs">{shipper.scannedCount}/{shipper.pieceCount}</span>
										{:else}
											{Math.round((shipper.scannedCount / shipper.pieceCount) * 10000) / 100}%
										{/if}
									</button>
								{/if}
								<input type="checkbox" bind:checked={shipper.selected} />
							</div>
						</div>
					{/each}
				</div>
			</div>
			<div>
				Outbounds
				<div class="flex flex-col gap-2">
					{#each outbounds.filter(({ active }) => active) as outbound}
						<div class="bg-slate-100 px-4 py-2 rounded">
							<div class="flex justify-between gap-2 items-center">
								<div class="font-bold">
									{outbound.name}
								</div>
								{#if outbound.pieceCount}
									<button onclick={() => (pieceCountDisplay = !pieceCountDisplay)}>
										{#if pieceCountDisplay}
											<span class="text-xs">{outbound.scannedCount}/{outbound.pieceCount}</span>
										{:else}
											{Math.round((outbound.scannedCount / outbound.pieceCount) * 10000) / 100}%
										{/if}
									</button>
								{/if}
								<input type="checkbox" bind:checked={outbound.selected} />
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
