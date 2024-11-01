<script lang="ts">
	import Icon from '@iconify/svelte';
	import { dests, cities } from '../data';
	import { statusIcons } from '.';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import SettingsButton from './SettingsButton.svelte';

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
	let showPending = $state(true);
	let showDone = $state(false);

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

	$effect(
		() =>
			window.api.cache.update(
				Object.fromEntries(
					laneToLaneOutput
						?.filter(({ cons }) => cons != undefined)
						.map(({ number, cons }) => [number, cons])
				)
			)
		// window.api.laneToLane.writeCONS(laneToLaneOutput?.map(({ number, cons }) => ({ number, cons })))
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

<div class="flex flex-col bg-slate-400 p-4 rounded-lg overflow-hidden min-w-[300px] gap-2">
	<div class="flex justify-between items-center">
		<h1 class="text-xl font-bold">Lane to Lanes</h1>
		<SettingsButton bind:settings />
	</div>
	{#if settings}
		<div class="flex flex-col gap-2 overflow-hidden" transition:slide>
			Settings
			<div class="flex flex-col gap-2 pe-2 overflow-y-auto">
				<div class="bg-slate-100 p-3 rounded">
					<div class="flex justify-between items-center">
						<span class="text-md font-bold">Output Directory</span>
						{@render editButton(
							async () => (outputDirectoryPath = (await window.api.dialog.folder()).at(0))
						)}
					</div>
					<p class="text-xs">{outputDirectoryPath}</p>
				</div>
				<div class="bg-slate-100 p-3 rounded">
					<div class="flex justify-between items-center">
						<div>
							<span class="text-md font-bold">Archive Directory</span>
						</div>
						{@render editButton(
							async () => (archiveDirectoryPath = (await window.api.dialog.folder()).at(0))
						)}
					</div>
					<p class="text-xs">{archiveDirectoryPath}</p>
				</div>
				<div class="bg-slate-100 p-3 rounded">
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
		</div>
	{:else}
		{#if laneToLaneOutput.some(({ status }) => status != 'done')}
			<button
				class="rounded px-2 bg-green-400"
				class:bg-slate-400={l2lRunning}
				class:cursor-wait={l2lRunning}
				onclick={laneToLanes}
				disabled={l2lRunning}>Start All</button
			>
		{/if}
		{#if laneToLaneOutput.some(({ status }) => status != 'done')}
			{@const pendingOutput = laneToLaneOutput.filter(({ status }) => status != 'done')}
			<button
				class="flex justify-between items-center p-2 rounded cursor-pointer bg-slate-300"
				onclick={() => (showPending = !showPending)}
			>
				<h2 class="text-xl font-bold">Pending</h2>
				<span class="font-bold">{pendingOutput.length} / {laneToLaneOutput.length}</span>
				<span class="transition" class:rotate-180={showPending}>
					<Icon icon="mingcute:down-fill" class="text-2xl" />
				</span>
			</button>
			{#if showPending}
				<ul class="flex flex-col gap-2 pe-2 overflow-y-auto" transition:slide>
					{#each pendingOutput as flight}
						{@render flightModule(flight)}
					{/each}
				</ul>
			{/if}
		{/if}
		{#if laneToLaneOutput.some(({ status }) => status === 'done')}
			{@const doneOutput = laneToLaneOutput.filter(({ status }) => status === 'done')}
			<button
				class="flex justify-between items-center p-2 rounded cursor-pointer bg-slate-200 hover:bg-slate-300"
				onclick={() => (showDone = !showDone)}
			>
				<h2 class="text-xl font-bold">Done</h2>
				<span class="font-bold">{doneOutput.length} / {laneToLaneOutput.length}</span>
				<span class="transition" class:rotate-180={showDone}>
					<Icon icon="mingcute:down-fill" class="text-2xl" />
				</span>
			</button>
			{#if showDone}
				<ul class="flex flex-col gap-2 pe-2 overflow-y-auto" transition:slide>
					{#each doneOutput as flight}
						{@render flightModule(flight)}
					{/each}
				</ul>
			{/if}
		{/if}
	{/if}
</div>

{#snippet flightModule(flight: flightInfo)}
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
{/snippet}

{#snippet editButton(onclick)}
	<button class="bg-blue-400 px-2 rounded flex items-center gap-1" {onclick}
		><Icon icon="bxs:edit" /> Edit</button
	>
{/snippet}
