<script lang="ts">
	import Icon from '@iconify/svelte';
	import { LaneToLanes, Limbo, Monitor, Shippers } from './components';
	import { onMount } from 'svelte';

	const email = 'colin.mothersead@fedex.com';
	let config: any = $state();
	let cache: any = $state();
	let settings = $state(false);
	let maxWindows = $state(5);

	onMount(async () => {
		config = await window.api.config.read();
		cache = await window.api.cache.read();
	});

	$effect(() => {
		if (cache) window.api.config.update(JSON.parse(JSON.stringify(config)));
	});
	$effect(() => {
		if (cache) window.api.cache.update(JSON.parse(JSON.stringify(cache)));
	});
</script>

{#if config && cache}
	<div class="container mx-auto py-8 h-full flex flex-col gap-5 overflow-hidden">
		<div class="flex justify-between items-center">
			<div class="flex items-center gap-3">
				<img src="src/assets/fedex-logo.png" alt="" class="h-10" />
				<div class="flex flex-col">
					<div class="text-3xl text-white font-bold">Service Assurance Helper</div>
					<div class="text-lg text-white">INDHU Night SAA Department</div>
				</div>
			</div>

			<button
				class="rounded p-3 bg-gray-600 text-white text-xl flex items-center gap-2"
				onclick={() => (settings = !settings)}
			>
				<Icon icon="mdi:gear" class="text-2xl" /> <span>Settings</span>
			</button>
		</div>

		<div class="flex flex-col flex-wrap gap-2 overflow-hidden" class:hidden={settings}>
			<LaneToLanes {config} {cache} />
			<Limbo {config} {cache} />
			<Monitor {config} {cache} />
			<Shippers {config} {cache} />
		</div>
		<div class="flex-grow bg-slate-400 rounded-lg py-4 px-6" class:hidden={!settings}>
			<h1 class="text-3xl font-semibold">Settings</h1>

			<div class="p-3 flex flex-col gap-3">
				<div class="flex flex-col gap-1">
					<h2 class="text-xl font-bold">Login Credentials</h2>
					<div class="flex gap-2">
						<label class="flex items-center gap-2">
							<span>Username</span>
							<input type="text" class="rounded" />
						</label>
						<label class="flex items-center gap-2">
							<span>Password</span>
							<input type="password" class="rounded" />
						</label>
					</div>
				</div>
				<div class="flex flex-col gap-1">
					<h2 class="text-xl font-bold">Browser Settings</h2>
					<label class="flex items-center gap-2">
						<input type="checkbox" bind:checked={config.headless} />
						<span>Hide Browser Windows</span>
					</label>
					<label class="flex items-center gap-2">
						<input type="number" bind:value={maxWindows} class="rounded w-8 text-center" />
						<span>Max Concurrent Windows</span>
					</label>
				</div>
			</div>
		</div>
		<div class="flex justify-end items-center gap-2 text-white">
			<a href="mailto:{email}" class="flex flex-col">
				<span class="italic text-end">Colin Mothersead</span>
				<span class="-mt-1 text-sm text-end">{email}</span>
			</a>
			<span class="text-sm">v0.1.0 | 2024</span>
		</div>
	</div>
{/if}
