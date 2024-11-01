<script lang="ts">
	import { LaneToLanes, Limbo, Monitor, Shippers } from './components';
	let headless = $state(true);
</script>

<div class="container mx-auto py-10 h-full flex flex-col overflow-hidden">
	<div class="text-center text-3xl text-white">Welcome to Colin's Awesome <i>Do Work</i> Tool!</div>
	<div class="text-center text-lg text-white">Let's do some work!</div>

	<input type="checkbox" bind:checked={headless} />
	<div class="flex flex-col flex-wrap gap-2 overflow-hidden">
		<LaneToLanes {headless} />
		<Limbo {headless} />
		<Monitor {headless} />
		<Shippers {headless} />
	</div>
</div>
