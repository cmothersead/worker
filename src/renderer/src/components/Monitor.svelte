<script lang="ts">
	export let headless = true;
	let shippers = [];

	async function getShippers() {
		shippers = await window.api.monitor.shippers();
	}
</script>

<div class="bg-slate-400 p-4 rounded-lg">
	<h1 class="text-xl font-bold">Monitor</h1>
	<div class="flex flex-col gap-1">
		<button class="bg-green-400" on:click={getShippers}>Test</button>
		{#each shippers as shipper}
			<div>
				{shipper}
			</div>
		{/each}
	</div>
</div>
