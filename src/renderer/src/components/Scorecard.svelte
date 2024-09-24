<script lang="ts">
	let areaText = '';
	$: trackingNumbers = areaText.split('\n').map((number) => parseInt(number));

	$: console.log(trackingNumbers);

	async function scorecard() {
		await window.api.scorecard.run(trackingNumbers);
	}
</script>

<div>
	<button on:click={scorecard}>Process</button>
	<textarea bind:value={areaText}></textarea>
</div>
