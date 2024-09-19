<script lang="ts">
	import Icon from '@iconify/svelte';
	import { dests, cities } from './data';

	let flightNumbers = [1645, 1648, 1650, 1654, 1601, 1609];
	let laneToLaneOutput: {
		number: number;
		dest: string;
		city: string;
		cons: string;
		status: 'done' | 'loading' | 'error' | 'none';
	}[] = flightNumbers.sort().map((flightNumber) => ({
		number: flightNumber,
		dest: dests[flightNumber],
		city: cities[dests[flightNumber]],
		cons: '',
		status: 'none'
	}));
	const statusIcons = {
		loading: 'eos-icons:three-dots-loading',
		error: 'material-symbols:error',
		done: 'icon-park-solid:check-one'
	};

	let headless = true;
	let l2lRunning = false;
	let limboRunning = false;
	async function laneToLanes() {
		l2lRunning = true;
		laneToLaneOutput = laneToLaneOutput.map((flight) => ({ ...flight, status: 'loading' }));
		await window.api.laneToLane({
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
		laneToLaneOutput = laneToLaneOutput.map((flight) => ({
			...flight,
			status: flight.status == 'loading' ? 'none' : flight.status
		}));
	}
	function laneToLaneCONS(flightCONS: { number: number; cons: string }[]) {
		console.log({ flightCONS });
		laneToLaneOutput = laneToLaneOutput.map((flight) => ({
			...flight,
			cons: flightCONS.find(({ number }) => number == flight.number)?.cons ?? ''
		}));
	}
	function failLaneToLanes(flightNumbers: number[]) {
		laneToLaneOutput = laneToLaneOutput.map((flight) => ({
			...flight,
			status: flightNumbers.includes(flight.number) ? 'error' : flight.status
		}));
	}
	function succeedLaneToLane(flightNumber: number) {
		laneToLaneOutput = laneToLaneOutput.map((flight) => ({
			...flight,
			status: flightNumber == flight.number ? 'done' : flight.status
		}));
	}
	window.electron.ipcRenderer.on('log', (_, msg) => console.log(msg));
	window.api.laneToLaneFailed((_event, value) => failLaneToLanes(value));
	window.api.laneToLaneSucceeded((_event, value) => succeedLaneToLane(value));
	window.api.laneToLaneUpdateCONS((_event, value) => laneToLaneCONS(value));
</script>

<div class="container mx-auto my-10">
	<div class="text-center text-3xl">Welcome to Colin's Awesome <i>Do Work</i> Tool!</div>
	<div class="text-center text-lg">Let's do some work!</div>

	<div class="flex gap-2">
		<div class="flex flex-col bg-slate-400 p-4">
			<h1 class="text-lg font-bold">Lane to Lanes</h1>
			<div>
				<button
					class="rounded p-2 bg-green-500"
					class:bg-slate-400={l2lRunning}
					class:cursor-wait={l2lRunning}
					on:click={laneToLanes}
					disabled={l2lRunning}>Start</button
				>
				<button
					class="outline outline-1 rounded p-2 bg-red-400"
					class:hidden={!l2lRunning}
					on:click={stop}>Stop</button
				>
			</div>
			<p class="font-bold">Flights</p>
			<ul class="flex flex-col gap-2 py-2">
				{#each laneToLaneOutput as flight}
					<li class="bg-slate-100 py-2 px-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<div class="text-3xl font-bold">{flight.number}</div>
								<div class="flex flex-col">
									<div class="font-bold -mb-1">{flight.dest}</div>
									<div class="text-xs">{flight.city}</div>
								</div>
							</div>
							<div class="flex flex-col">
								<div>
									<span class:hidden={flight.status != 'loading'}>
										<Icon icon={statusIcons['loading']} class="text-3xl" />
									</span>
									<span class:hidden={flight.status != 'error'}>
										<Icon icon={statusIcons['error']} class="text-xl text-red-600" />
									</span>
									<span class:hidden={flight.status != 'done'}>
										<Icon icon={statusIcons['done']} class="text-xl text-green-600" />
									</span>
								</div>
							</div>
						</div>
						<div class="text-sm"><span class="font-bold italic">CONS:</span> {flight.cons}</div>
					</li>
				{/each}
			</ul>
		</div>

		<div>
			<button class="outline outline-1 rounded p-2 bg-green-400" on:click={limbo}>LIMBO</button>
		</div>
	</div>
</div>
