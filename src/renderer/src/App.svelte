<script lang="ts">
	let flightNumbers = [1642, 1686, 1645, 1648, 1650, 1654, 1601, 1609, 1614];
	let headless = true;
	let l2lRunning = false;
	let limboRunning = false;
	async function laneToLanes() {
		l2lRunning = true;
		await window.electron.ipcRenderer.invoke('laneToLane', {
			flightNumbers,
			headless
		});
		l2lRunning = false;
	}
	async function limbo() {
		limboRunning = true;
		await window.electron.ipcRenderer.invoke('limbo', { headless: true });
	}
	function stop() {
		window.electron.ipcRenderer.send('stop');
	}
</script>

<div class="container mx-auto my-10">
	<div class="text-center text-3xl">Welcome to Colin's Awesome <i>Do Work</i> Tool!</div>
	<div class="text-center text-lg">Let's do some work!</div>

	<button
		class="outline outline-1 rounded p-2 bg-slate-400"
		class:bg-slate-400={l2lRunning}
		class:cursor-wait={l2lRunning}
		on:click={laneToLanes}
		disabled={l2lRunning}>Lane to Lanes</button
	>
	<button
		class="outline outline-1 rounded p-2 bg-red-400"
		class:hidden={!l2lRunning}
		on:click={stop}>Stop</button
	>
	<button class="outline outline-1 rounded p-2 bg-green-400" on:click={limbo}>LIMBO</button>
</div>
