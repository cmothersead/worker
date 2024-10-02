<script lang="ts">
	async function scorecard() {
		await window.api.shippers.run();
	}
</script>

<div class="bg-slate-400 p-4 rounded-lg">
	<h1 class="text-xl font-bold">Shippers</h1>
	<div class="flex flex-col gap-1">
		<button class="bg-green-500" on:click={scorecard}>Let's Go!</button>
	</div>
</div>
