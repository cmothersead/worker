<script lang="ts">
	// import { laneToLanes } from './scripts'

	let l2lRunning = false
	async function laneToLanes() {
		l2lRunning = true
		await window.electron.ipcRenderer.invoke('laneToLane')
		l2lRunning = false
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
</div>
