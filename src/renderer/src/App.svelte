<script lang="ts">
	import { LaneToLanes, Limbo, Scorecard } from './components';
	import Monitor from './components/Monitor.svelte';
	import Shippers from './components/Shippers.svelte';
	let headless = true;

	// window.electron.ipcRenderer.send('test');
</script>

<div class="container mx-auto my-10">
	<div class="text-center text-3xl text-white">Welcome to Colin's Awesome <i>Do Work</i> Tool!</div>
	<div class="text-center text-lg text-white">Let's do some work!</div>

	<input type="checkbox" bind:checked={headless} />
	<div class="flex justify-center gap-2">
		<LaneToLanes {headless} />
		<Limbo {headless} />
		<Monitor {headless} />
		<Scorecard {headless} />
		<Shippers {headless} />
	</div>
</div>
