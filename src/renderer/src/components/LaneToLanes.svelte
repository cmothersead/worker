<script lang="ts">
	import Icon from '@iconify/svelte';
	import { dests, cities } from '../data';
	import { openFile, statusIcons, type LaneToLaneConfig, type Config, type Cache } from '.';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import SettingsButton from './SettingsButton.svelte';

	interface FlightInfo {
		number: number;
		dest: string;
		city: string;
		cons: string;
		path: string;
		status: 'done' | 'loading' | 'error' | 'none';
	}

	interface Props {
		config: Config;
		cache: Cache;
	}

	let { config: fullConfig, cache }: Props = $props();
	let { headless } = $derived(fullConfig);

	let config: LaneToLaneConfig = $state();
	let flightNumbers = $state([]);
	let allFlightNumbers = $state([]);
	let templateFilePath = $derived(config.templateFilePath);
	let outputDirectoryPath = $derived(config.outputDirectoryPath);
	let archiveDirectoryPath = $derived(config.archiveDirectoryPath);
	let { showPending, showDone } = $derived(config);

	let output: FlightInfo[] = $state([]);

	let settings = $state(false);
	let search = $state('');

	onMount(async () => {
		config = fullConfig.laneToLane;
		flightNumbers = config.flightNumbers;
		allFlightNumbers = config.allFlightNumbers.sort();

		if (!cache.laneToLane) cache.laneToLane = {};
		output = flightNumbers.sort().map((flightNumber) => ({
			number: flightNumber,
			dest: dests[flightNumber],
			city: cities[dests[flightNumber]],
			cons: cache.laneToLane[flightNumber]?.cons,
			path: cache.laneToLane[flightNumber]?.path,
			status: cache.laneToLane[flightNumber]?.path ? 'done' : 'none'
		}));
		output
			.filter(({ cons }) => cons === undefined)
			.forEach(async (flight) => {
				flight.cons = await window.api.laneToLane.cons({ flightNumber: flight.number, headless });
				if (config.automatic) {
					laneToLane(flight.number);
				}
			});
		output
			.filter(({ path }) => path === undefined)
			.forEach(async (flight) => {
				const path = await window.api.laneToLane.exists({
					flightNumber: flight.number,
					outputDirectoryPath
				});
				flight.path = path;
				flight.status = path === undefined ? flight.status : 'done';
			});
	});

	$effect(() => {
		if (cache)
			cache.laneToLane = Object.fromEntries(
				output.map(({ number, cons, path }) => [number, { cons, path }])
			);
	});

	async function laneToLanes() {
		output
			.filter(({ status, cons }) => status != 'loading' && status != 'done' && cons != undefined)
			.map(({ number }) => laneToLane(number));
	}

	async function laneToLane(flightNumber: number) {
		const flight = output.find(({ number }) => number === flightNumber);
		flight.status = 'loading';
		const result = await window.api.laneToLane.run({
			consNumber: output.find(({ number }) => number === flightNumber).cons,
			templateFilePath,
			outputDirectoryPath,
			archiveDirectoryPath,
			headless
		});
		if (!result?.path) {
			flight.status = 'error';
			return;
		}
		flight.path = result.path;
		flight.status = 'done';
	}
</script>

{#if config}
	<div class="flex flex-col bg-slate-400 p-4 rounded-lg overflow-hidden min-w-[300px] gap-2">
		<div class="flex justify-between items-center">
			<h1 class="text-xl font-bold">Lane to Lanes</h1>
			<SettingsButton bind:settings />
		</div>
		{#if !settings}
			{#if output.some(({ status }) => status != 'done')}
				{@const pendingOutput = output.filter(({ status }) => status != 'done')}
				<div class="flex items-center gap-2">
					<button class="rounded px-2 bg-green-400 flex-grow" onclick={laneToLanes}>Start</button>
					<label class="flex items-center gap-1 text-sm font-bold"
						>Automatic<input type="checkbox" bind:checked={config.automatic} /></label
					>
				</div>
				<button
					class="flex justify-between items-center p-2 rounded cursor-pointer bg-slate-300"
					onclick={() => (config.showPending = !showPending)}
				>
					<h2 class="text-xl font-bold">Pending</h2>
					<span class="font-bold">{pendingOutput.length} / {output.length}</span>
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
			{#if output.some(({ status }) => status === 'done')}
				{@const doneOutput = output.filter(({ status }) => status === 'done')}
				<button
					class="flex justify-between items-center p-2 rounded cursor-pointer bg-slate-200 hover:bg-slate-300"
					onclick={() => (config.showDone = !showDone)}
				>
					<h2 class="text-xl font-bold">Done</h2>
					<span class="font-bold">{doneOutput.length} / {output.length}</span>
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
		{:else}
			{@render settingsSection()}
		{/if}
	</div>
{/if}

{#snippet flightModule(flight: FlightInfo)}
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

{#snippet settingsSection()}
	<div class="flex flex-col gap-2 overflow-hidden" transition:slide>
		Settings
		<div class="flex flex-col gap-2 pe-2 overflow-y-auto">
			<div class="bg-slate-100 p-3 rounded">
				<div class="flex justify-between items-center">
					<span class="text-md font-bold">Template File</span>
					{@render editButton(
						async () => (config.templateFilePath = (await window.api.dialog.file()).at(0))
					)}
				</div>
				<p class="text-xs">{config.templateFilePath}</p>
			</div>
			<div class="bg-slate-100 p-3 rounded">
				<div class="flex justify-between items-center">
					<span class="text-md font-bold">Output Directory</span>
					{@render editButton(
						async () => (config.outputDirectoryPath = (await window.api.dialog.folder()).at(0))
					)}
				</div>
				<p class="text-xs">{config.outputDirectoryPath}</p>
			</div>
			<div class="bg-slate-100 p-3 rounded">
				<div class="flex justify-between items-center">
					<div>
						<span class="text-md font-bold">Archive Directory</span>
					</div>
					{@render editButton(
						async () => (config.archiveDirectoryPath = (await window.api.dialog.folder()).at(0))
					)}
				</div>
				<p class="text-xs">{config.archiveDirectoryPath}</p>
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
{/snippet}
