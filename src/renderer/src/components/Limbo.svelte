<script lang="ts">
	export let headless = true;
	let limboRunning = false;

	async function limbo() {
		limboRunning = true;
		await window.electron.ipcRenderer.invoke('limbo', { headless });
	}
</script>

<div class="bg-slate-400 p-4 rounded-lg">
	<h1 class="text-xl font-bold">LIMBO Report</h1>
	<button class="rounded px-2 bg-green-400" on:click={limbo}>Start</button>
</div>
