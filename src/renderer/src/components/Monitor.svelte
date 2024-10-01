<script lang="ts">
	export let headless = true;
	let shippers = [];
	let outbounds = [];

	async function getShippers() {
		const config = await window.api.monitor.shippers();
		shippers = config.shippers.map((shipper) => ({ ...shipper, active: true }));
		outbounds = config.outbounds.map((outbound) => ({ ...outbound, active: true }));
	}

	getShippers();
</script>

<div class="bg-slate-400 p-4 rounded-lg">
	<h1 class="text-xl font-bold">Monitor</h1>
	<div class="flex flex-col gap-1">
		<button
			class="bg-green-400"
			on:click={() =>
				window.api.monitor.run({
					data: [
						...shippers.filter(({ active }) => active),
						...outbounds.filter(({ active }) => active)
					],
					headless
				})}>Run</button
		>
		<div>
			Shippers
			<div class="flex flex-col gap-2">
				{#each shippers as shipper}
					<div class="bg-slate-100 px-4 py-2 rounded">
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
			<div class="flex flex-col gap-2">
				{#each outbounds as outbound}
					<div class="bg-slate-100 px-4 py-2 rounded">
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
</div>
