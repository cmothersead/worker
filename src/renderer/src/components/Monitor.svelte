<script lang="ts">
	import Icon from '@iconify/svelte';

	let { headless = true } = $props();
	let settings = $state(false);
	let shippers = $state([]);
	let outbounds = $state([]);

	async function getShippers() {
		const config = await window.api.monitor.shippers();
		shippers = config.shippers.map((shipper) => ({ ...shipper, active: true, selected: false }));
		outbounds = config.outbounds.map((outbound) => ({
			...outbound,
			active: true,
			selected: false
		}));
	}

	getShippers();

	function getCurrentSelected() {
		return JSON.parse(JSON.stringify([...shippers.filter(({ selected }) => selected)]));
	}
</script>

<div class="bg-slate-400 p-4 rounded-lg">
	<h1 class="text-xl font-bold">Monitor</h1>
	<div class="flex flex-col gap-1">
		<div class="flex justify-between">
			<button
				class="bg-green-400 rounded px-2"
				onclick={() =>
					window.api.monitor.run({
						data: getCurrentSelected(),
						headless
					})}>Run</button
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
							<div class="flex justify-between gap-2">
								<div class="font-bold">
									{shipper.name}
								</div>
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
							<div class="flex justify-between gap-2">
								<div class="font-bold">
									{outbound.name}
								</div>
								<input type="checkbox" bind:checked={outbound.selected} />
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
