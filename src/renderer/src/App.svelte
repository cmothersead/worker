<script lang="ts">
	import { LaneToLanes, Scorecard } from './components';
	let headless = true;
	let limboRunning = false;

	async function limbo() {
		limboRunning = true;
		await window.electron.ipcRenderer.invoke('limbo', { headless: true });
	}

	window.electron.ipcRenderer.on('log', (_, msg) => console.log(msg));
</script>

<div class="container mx-auto my-10">
	<div class="text-center text-3xl">Welcome to Colin's Awesome <i>Do Work</i> Tool!</div>
	<div class="text-center text-lg">Let's do some work!</div>

	<div class="flex">
		<LaneToLanes {headless} />

		<div class="flex gap-2">
			<div>
				<button class="outline outline-1 rounded p-2 bg-green-400" on:click={limbo}>LIMBO</button>
			</div>
		</div>
		<Scorecard />
	</div>
</div>
