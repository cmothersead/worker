<script lang="ts">
	let { headless = false } = $props();
	let areaText = $state('');
	let trackingNumbers = $derived(
		areaText
			.split('\n')
			.map((number) => parseInt(number))
			.filter((value) => !Number.isNaN(value))
	);

	async function scorecard() {
		await window.api.scorecard.run({ trackingNumbers, headless });
	}
</script>

<div class="bg-slate-400 p-4 rounded-lg">
	<h1 class="text-xl font-bold">Scorecard</h1>
	<div class="flex flex-col gap-1">
		<textarea bind:value={areaText}></textarea>
		<p class="text-sm">Total Numbers: {trackingNumbers.length}</p>
		<button class="bg-blue-500" onclick={scorecard}>Submit</button>
	</div>
</div>
