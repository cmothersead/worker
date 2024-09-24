<script lang="ts">
	import Icon from '@iconify/svelte';
	import { dests, cities } from '../data';

	type flightInfo = {
		number: number;
		dest: string;
		city: string;
		cons: string;
		path: string;
		status: 'done' | 'loading' | 'error' | 'none';
	};

	const statusIcons = {
		loading: 'eos-icons:three-dots-loading',
		error: 'material-symbols:error',
		done: 'icon-park-solid:check-one'
	};

	let flightNumbers = [1645, 1648, 1650, 1654, 1601, 1609];
	let laneToLaneOutput: flightInfo[] = flightNumbers.sort().map((flightNumber) => ({
		number: flightNumber,
		dest: dests[flightNumber],
		city: cities[dests[flightNumber]],
		cons: '',
		path: '',
		status: 'none'
	}));

	export let headless = true;
	let l2lRunning = false;

	async function laneToLanes() {
		l2lRunning = true;
		laneToLaneOutput = laneToLaneOutput.map((flight) => ({ ...flight, status: 'loading' }));
		await window.api.laneToLane.run({
			flightNumbers,
			headless
		});
		l2lRunning = false;
	}

	async function getExisting() {
		const existing = await window.api.laneToLane.getExisting(flightNumbers);
		laneToLaneOutput = laneToLaneOutput.map((flight) => ({
			...flight,
			...existing.find(({ number }) => number === flight.number)
		}));
	}
	async function getCONS() {
		window.api.laneToLane.cons({ flightNumbers, headless });
	}

	function stop() {
		window.electron.ipcRenderer.send('stop');
		laneToLaneOutput = laneToLaneOutput.map((flight) => ({
			...flight,
			status: flight.status == 'loading' ? 'none' : flight.status
		}));
	}

	window.api.laneToLane.receiveUpdate((_, values: flightInfo | flightInfo[]) => {
		const info = [values].flat();
		laneToLaneOutput = laneToLaneOutput.map((flight) => ({
			...flight,
			...info.find(({ number }) => number === flight.number)
		}));
	});

	function openFile(path) {
		window.api.laneToLane.open(path);
	}

	getExisting();
	getCONS();
</script>

<div class="flex flex-col bg-slate-400 p-4 rounded-lg">
	<h1 class="text-xl font-bold">Lane to Lanes</h1>
	<div>
		<button
			class="rounded px-2 bg-green-400"
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
			<li class="bg-slate-100 py-2 px-4 rounded">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="text-3xl font-bold">{flight.number}</div>
						<div class="flex flex-col">
							<div class="font-bold -mb-1">{flight.dest}</div>
							<div class="text-xs">{flight.city}</div>
						</div>
					</div>
					<div class="flex flex-col items-center justify-between gap-1">
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
						{#if flight.path}
							<button class="cursor-pointer" on:click={() => openFile(flight.path)}>
								<Icon icon="majesticons:open" class="text-xl" />
							</button>
						{/if}
					</div>
				</div>
				<div class="text-sm flex items-center gap-1">
					<span class="font-bold italic">CONS:</span>
					{#if flight.cons == ''}<Icon icon={statusIcons['loading']} />
					{:else}<span>{flight.cons}</span>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
</div>
