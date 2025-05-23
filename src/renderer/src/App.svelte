<script lang="ts">
	import Icon from '@iconify/svelte';
	import { LaneToLanes, Limbo, Monitor, CST } from './components';
	import { onMount } from 'svelte';
	import Scorecard from './components/Scorecard.svelte';

	const email = 'colin.mothersead@fedex.com';
	let config: any = $state();
	let cache: any = $state();
	let settings = $state(false);
	let maxWindows = $state(5);
	let userName = $state('');
	let password = $state('');

	onMount(async () => {
		config = await window.api.config.read();
		cache = await window.api.cache.read();
		userName = config.username;
		password = config.password;
	});

	$effect(() => {
		if (config) window.api.config.update(JSON.parse(JSON.stringify(config)));
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

			{#if config.username && config.password}
				<button
					class="rounded p-3 text-xl flex items-center gap-2 {settings
						? 'bg-white border-2 border-gray-600 text-gray-600'
						: 'bg-gray-600 text-white'}"
					onclick={() => (settings = !settings)}
				>
					<Icon icon="mdi:gear" class="text-2xl" /> <span>Settings</span>
				</button>
			{/if}
		</div>

		<div class="flex flex-col flex-wrap gap-2 overflow-hidden flex-grow" class:hidden={settings}>
			{#if config.username && config.password}
				<LaneToLanes bind:config {cache} />
				<Limbo {config} {cache} />
				<Monitor {config} {cache} />
				<CST {config} {cache} />
				<!-- <Shippers {config} {cache} /> -->
				<Scorecard />
			{:else}
				<div class="w-full flex justify-center items-center flex-grow">
					<div class="bg-slate-400 p-8 rounded-lg overflow-hidden w-[500px]">
						<div class="flex flex-col gap-2">
							<span class="text-2xl font-bold text-center">Login</span>

							<form>
								<label class="flex flex-col gap-1">
									<span class="text-lg font-bold">Username</span>
									<input type="text" class="rounded p-1" bind:value={userName} />
								</label>
								<label class="flex flex-col gap-1">
									<span class="text-lg font-bold">Password</span>
									<input type="password" class="rounded p-1" bind:value={password} />
								</label>
								<button
									class="bg-gray-600 text-white p-2 rounded hover:bg-gray-500 mt-4"
									onclick={() => {
										config.username = userName;
										config.password = password;
									}}>Sign In</button
								>
							</form>
						</div>
					</div>
				</div>
			{/if}
		</div>
		<div class="flex-grow bg-slate-400 rounded-lg py-4 px-6" class:hidden={!settings}>
			<h1 class="text-3xl font-semibold">Settings</h1>

			<div class="p-3 flex flex-col gap-3">
				<div class="flex flex-col gap-1">
					<h2 class="text-xl font-bold">Login Credentials</h2>
					<div class="flex gap-2">
						<label class="flex items-center gap-2">
							<span>Username</span>
							<input type="text" class="rounded p-1" bind:value={userName} />
						</label>
						<label class="flex items-center gap-2">
							<span>Password</span>
							<input type="password" class="rounded p-1" bind:value={password} />
						</label>
						{#if config.username != userName || config.password != password}
							<button class="bg-gray-600 text-white p-2 rounded text-xs">Update</button>
						{/if}
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
			<span class="text-sm">v0.2.0 | 2024</span>
		</div>
	</div>
{/if}
