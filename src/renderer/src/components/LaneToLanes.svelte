<script lang="ts">
	import Icon from '@iconify/svelte';
	import { dests, cities } from '../data';
	import { statusIcons } from '.';
	import { onMount } from 'svelte';

	type flightInfo = {
		number: number;
		dest: string;
		city: string;
		cons: number;
		path: string;
		status: 'done' | 'loading' | 'error' | 'none';
	};

	let { headless = true } = $props();

	let config = $state(undefined);
	let flightNumbers = $state([]);
	let allFlightNumbers = $state([]);
	let laneToLaneOutput: flightInfo[] = $state([]);
	let l2lRunning = $state(false);
	let settings = $state(false);
	let search = $state('');
	let outputDirectoryPath = $state('');
	let archiveDirectoryPath = $state('');

	async function laneToLanes() {
		laneToLaneOutput
			.filter(({ status }) => status != 'loading' && status != 'done')
			.map(({ number }) => laneToLane(number));
	}

	async function laneToLane(flightNumber: number) {
		laneToLaneOutput = laneToLaneOutput.map((flight) => ({
			...flight,
			status: flight.number === flightNumber ? 'loading' : flight.status
		}));
		await window.api.laneToLane.run({
			consNumber: laneToLaneOutput.find(({ number }) => number === flightNumber).cons,
			outputDirectoryPath,
			archiveDirectoryPath,
			headless
		});
	}

	async function configure() {
		config = (await window.api.config.read()).laneToLane;
		flightNumbers = config.flightNumbers;
		allFlightNumbers = config.allFlightNumbers.sort();
		outputDirectoryPath = config.outputDirectoryPath;
		archiveDirectoryPath = config.archiveDirectoryPath;
		laneToLaneOutput = flightNumbers.sort().map((flightNumber) => ({
			number: flightNumber,
			dest: dests[flightNumber],
			city: cities[dests[flightNumber]],
			cons: undefined,
			path: '',
			status: 'none'
		}));
		await getCONS();
		await getExisting();
	}

	async function getExisting() {
		const existing = await window.api.laneToLane.getExisting({
			flightNumbers: [...flightNumbers],
			outputDirectoryPath
		});
		laneToLaneOutput = laneToLaneOutput.map((flight) => ({
			...flight,
			...existing.find(({ number }) => number === flight.number)
		}));
	}
	async function getCONS() {
		laneToLaneOutput.map(async (flight) => {
			const cons = await window.api.laneToLane.cons({ flightNumber: flight.number, headless });
			laneToLaneOutput = laneToLaneOutput.map((f) =>
				f.number === flight.number ? { ...f, cons } : f
			);
		});
	}

	window.api.laneToLane.receiveUpdate((_, values: flightInfo | flightInfo[]) => {
		const info = [values].flat();
		laneToLaneOutput = laneToLaneOutput.map((flight) => ({
			...flight,
			...info.find(({ number }) => number === flight.number)
		}));
	});

	function openFile(path: string) {
		window.api.laneToLane.open(path);
	}

	onMount(configure);

	$effect(() =>
		window.api.laneToLane.writeCONS(laneToLaneOutput?.map(({ number, cons }) => ({ number, cons })))
	);
	$effect(() => {
		window.api.config.update(
			JSON.parse(
				JSON.stringify({
					laneToLane: {
						flightNumbers,
						allFlightNumbers,
						outputDirectoryPath,
						archiveDirectoryPath
					}
				})
			)
		);
	});
</script>

<div class="flex flex-col bg-slate-400 p-4 rounded-lg">
	<h1 class="text-xl font-bold">Lane to Lanes</h1>
	<div class="flex justify-between">
		<button
			class="rounded px-2 bg-green-400"
			class:bg-slate-400={l2lRunning}
			class:cursor-wait={l2lRunning}
			onclick={laneToLanes}
			disabled={l2lRunning}>Start All</button
		>
		<button class="rounded px-2 bg-gray-600 text-white" onclick={() => (settings = !settings)}>
			<Icon icon="mdi:gear" />
		</button>
	</div>
	{#if settings}
		Settings
		<div class="flex flex-col gap-2">
			<div class="bg-slate-100 p-2 rounded">
				<span class="text-lg font-bold">Output Directory</span>
				<div class="flex justify-between">
					<span class="text-xs">{outputDirectoryPath}</span>
					<button
						class="bg-blue-400 px-1 rounded"
						onclick={async () => (outputDirectoryPath = (await window.api.dialog.folder()).at(0))}
						>Change</button
					>
				</div>
			</div>
			<div class="bg-slate-100 p-2 rounded">
				<span class="text-md font-bold">Archive Directory</span>
				<span class="text-sm">(opt)</span>
				<div class="flex justify-between">
					<span class="text-xs">{archiveDirectoryPath}</span>
					<button
						class="bg-blue-400 px-1 rounded"
						onclick={async () => (archiveDirectoryPath = (await window.api.dialog.folder()).at(0))}
						>Change</button
					>
				</div>
			</div>
			<div class="bg-slate-100 p-2 rounded">
				<h1 class="text-lg font-bold">Flights</h1>
				<input
					type="text"
					bind:value={search}
					placeholder="Search Flights..."
					class="p-1 rounded bg-slate-100"
				/>
				<div class="flex justify-around items-stretch h-72 overflow-hidden mt-1">
					<div>
						<span class="font-bold">Active</span>
						<div>
							{#each flightNumbers as fNum}
								<div class="group hover:bg-red-400 flex items-center cursor-pointer px-1">
									{fNum}
									<Icon icon="raphael:arrowright" class="invisible group-hover:visible" />
								</div>
							{/each}
						</div>
					</div>
					<div class="flex flex-col">
						<span class="font-bold">Inactive</span>
						<div class="overflow-y-auto">
							{#each allFlightNumbers.filter((value) => (search != '' ? value
											.toString()
											.contains(search) : true)) as fNum}
								<div class="group hover:bg-green-400 flex items-center cursor-pointer px-1">
									<Icon icon="raphael:arrowleft" class="invisible group-hover:visible" />
									{fNum}
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<ul class="flex flex-col gap-2 py-2">
			{#each laneToLaneOutput as flight}
				<li class="bg-slate-100 py-2 px-4 rounded">
					<div class="flex items-center justify-between gap-3">
						<div>
							<div class="flex items-center gap-2">
								<div class="text-3xl font-bold">{flight.number}</div>
								<div class="flex flex-col">
									<div class="font-bold -mb-1">{flight.dest}</div>
									<div class="text-xs">{flight.city}</div>
								</div>
							</div>
							<div class="text-sm flex items-center gap-1">
								<span class="font-bold italic">CONS:</span>
								{#if flight.cons == undefined}<Icon icon={statusIcons['loading']} />
								{:else}<span>{flight.cons ?? ''}</span>
								{/if}
							</div>
						</div>
						<div class="flex flex-col items-center justify-between gap-1">
							<div class:group={flight.status != 'loading'}>
								<span class:hidden={flight.status != 'loading'}>
									<Icon icon={statusIcons['loading']} class="text-xl" />
								</span>
								<span class="group-hover:hidden" class:hidden={flight.status != 'error'}>
									<Icon icon={statusIcons['error']} class="text-xl text-red-600" />
								</span>
								<span class="group-hover:hidden" class:hidden={flight.status != 'done'}>
									<Icon icon={statusIcons['done']} class="text-xl text-green-600" />
								</span>
								<button
									class:hidden={flight.status != 'none' || flight.cons == undefined}
									class="block group-hover:block cursor-pointer"
									onclick={() => laneToLane(flight.number)}
								>
									<Icon icon={statusIcons['refresh']} class="text-xl text-gray-600" />
								</button>
							</div>
							{#if flight.path}
								<button class="cursor-pointer" onclick={() => openFile(flight.path)}>
									<Icon icon="majesticons:open" class="text-xl" />
								</button>
							{/if}
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
