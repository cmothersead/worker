<script lang="ts">
	import { LaneToLanes, Limbo, Scorecard } from './components';
	let headless = true;

	window.electron.ipcRenderer.on('log', (_, msg) => console.log(msg));
</script>

<div class="container mx-auto my-10">
	<div class="text-center text-3xl text-white">Welcome to Colin's Awesome <i>Do Work</i> Tool!</div>
	<div class="text-center text-lg text-white">Let's do some work!</div>

	<div class="flex gap-2">
		<LaneToLanes {headless} />
		<Limbo {headless} />
		<Scorecard {headless} />
	</div>
</div>
