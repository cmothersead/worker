<script lang="ts">
	import Icon from '@iconify/svelte';
	import { statusIcons, type Cache, type Config, type ShipperConfig } from '.';
	import { onMount } from 'svelte';
	import { getToday } from '../../../main/scripts';

	interface ShipperResult {
		name: string;
		count?: number;
		status: string;
		checked: boolean;
		accountNumbers: string | string[];
	}

	interface Props {
		config: Config;
		cache: Cache;
	}

	let { config: fullConfig, cache }: Props = $props();
	let { headless } = $derived(fullConfig);

	let config: ShipperConfig = $state();
	let criticalShippers = $state([]);
	let preAlerts = $state([]);
	let cstShippers = $state([]);
	let criticalOutput: ShipperResult[] = $state([]);
	let preAlertOutput: ShipperResult[] = $state([]);

	let tab = $state(0);
	let input = $derived(tab === 0 ? criticalShippers : preAlerts);
	let output = $derived(tab === 0 ? criticalOutput : preAlertOutput);
	let totalQuantity = $derived(
		criticalOutput.reduce((prev, { count }) => (count == undefined ? prev : prev + count), 0)
	);
	let checkAll = $state(true);

	onMount(async () => {
		console.log('onMount started.');
		config = fullConfig.shippers;
		criticalShippers = config.criticalShippers;
		preAlerts = config.preAlerts;
		cstShippers = config.cstShippers;

		criticalOutput = criticalShippers.map((shipper) => ({
			...shipper,
			status:
				cache?.shippers && cache.shippers[shipper.name]?.count === undefined ? 'loading' : 'done',
			count: cache?.shippers && cache.shippers[shipper.name]?.count
		}));
		criticalOutput
			.filter(({ status }) => status === 'loading')
			.forEach(async (shipper) => {
				const count = await window.api.shippers.existing({ name: shipper.name, preAlert: false });
				shipper.count = count;
				shipper.status = count != undefined ? 'done' : 'none';
			});
		preAlertOutput = preAlerts.map((shipper) => ({
			...shipper,
			status:
				cache?.shippers && cache.shippers[shipper.name]?.count === undefined ? 'loading' : 'done',
			count: cache?.shippers && cache.shippers[shipper.name]?.count
		}));
		preAlertOutput
			.filter(({ status }) => status === 'loading')
			.forEach(async (shipper) => {
				const count = await window.api.shippers.existing({ name: shipper.name, preAlert: true });
				shipper.count = count;
				shipper.status = count != undefined ? 'done' : 'none';
			});
		console.log('hello?');
		schedule();
	});

	$effect(() => {
		if (cache) {
			cache.shippers = Object.fromEntries(
				[...criticalOutput, ...preAlertOutput]
					.filter(({ count }) => count !== undefined)
					.map(({ name, count }) => [name, { count }])
			);
		}
	});

	async function shippers() {
		const simultaneousCount = 5;
		const shipperPromise = async ({ name, accountNumbers }, index: number) => {
			criticalOutput = criticalOutput.map((shipper) =>
				shipper.name === name ? { ...shipper, status: 'loading' } : shipper
			);
			const count = await window.api.shippers.run({
				name,
				accountNumbers,
				preAlert: false,
				headless
			});
			criticalOutput = criticalOutput.map((shipper) =>
				shipper.name === name ? { ...shipper, count, status: 'done' } : shipper
			);
			return index;
		};

		const activeShippers = criticalOutput.filter(({ checked }) => checked === true);

		const promises = activeShippers
			.slice(0, simultaneousCount)
			.map(async ({ name, accountNumbers }, index) =>
				shipperPromise({ name, accountNumbers }, index)
			);
		for (let i = simultaneousCount; i <= activeShippers.length; i++) {
			const { name, accountNumbers } = activeShippers[i];
			const index = await Promise.race(promises);
			promises.splice(index, 1, shipperPromise({ name, accountNumbers }, index));
		}
		await Promise.all(promises);
	}

	async function cstReport() {
		window.api.shippers.aggregate(
			cstShippers.map((shipper) => ({
				name: shipper,
				preAlert: preAlerts.some(({ name }) => shipper === name)
			}))
		);
	}

	async function schedule() {
		console.log('here now yes');
		const today = getToday();
		const dateString = `${today.toLocaleDateString('en-us', { month: '2-digit' })}${today.toLocaleDateString('en-us', { day: '2-digit' })}`;
		if (
			await window.api.file.exists(
				`C:/Users/5260673/OneDrive - MyFedEx/SAA/CST Beginning of Night/Shipments by Outbound - ${dateString}.xlsx`
			)
		)
			return;
		const now = new Date(Date.now());
		const hours = now.getHours();
		const minutes = now.getMinutes();
		console.log(hours, minutes);
		if ((hours <= 23 && hours >= 10) || (hours === 23 && minutes < 30)) {
			console.log('scheduling CST file process');
			const timeUntil = (23 - hours) * 3600000 + (40 - minutes) * 60000;
			console.log(timeUntil);
			await new Promise((r) => setTimeout(r, timeUntil));
			console.log('schedule complete 1');
		}
		cstReport();
	}
</script>

{#if config}
	<div class="bg-slate-400 p-4 rounded-lg flex flex-col overflow-hidden">
		<h1 class="text-xl font-bold">Shippers</h1>
		<div class="flex flex-col gap-1 overflow-hidden">
			<button class="bg-green-500" onclick={shippers}>Let's Go!</button>
			<button class="bg-blue-500" onclick={cstReport}>CST Report</button>
			<div class="flex items-center ps-4 gap-2">
				<input
					type="checkbox"
					checked={checkAll}
					onclick={() => {
						checkAll = !checkAll;
						if (tab === 0) {
							criticalShippers = criticalShippers.map((shipper) => ({
								...shipper,
								checked: checkAll
							}));
						} else if (tab === 1) {
							preAlerts = preAlerts.map((shipper) => ({ ...shipper, checked: checkAll }));
						}
					}}
				/>
				<span class="text-sm font-bold"> Select/Unselect All </span>
			</div>
			<div class="p-1 overflow-hidden flex flex-col">
				<div class="flex items-end">
					<button
						class="px-2 rounded-t text-white font-bold cursor-pointer"
						class:bg-slate-800={tab === 0}
						class:bg-slate-600={tab != 0}
						class:p-1={tab === 0}
						onclick={() => (tab = 0)}
					>
						Critical Shippers
					</button>
					<button
						class="px-2 rounded-t text-white font-bold cursor-pointer"
						class:bg-slate-800={tab === 1}
						class:bg-slate-600={tab != 1}
						class:p-1={tab === 1}
						onclick={() => (tab = 1)}
					>
						Pre-Alerts
					</button>
				</div>
				<div class="flex flex-col gap-1 p-2 pe-2 overflow-y-auto bg-slate-500">
					{#each input as shipper, i}
						<div class="bg-slate-100 py-1 px-4 rounded">
							<div class="flex justify-between gap-4 items-center">
								<div class="flex items-center gap-2">
									<input type="checkbox" bind:checked={shipper.checked} />
									<div class="text-xs font-bold">
										{shipper.name}
									</div>
								</div>
								<div class="flex items-center gap-2">
									<div class="text-xs" class:invisible={output[i]?.count === undefined}>
										{criticalOutput[i]?.count ?? '-'}
									</div>
									<div class="group">
										<span class:hidden={criticalOutput[i]?.status != 'loading'}>
											<Icon icon={statusIcons['loading']} class="" />
										</span>
										<span class="group-hover:hidden" class:hidden={output[i]?.status != 'error'}>
											<Icon icon={statusIcons['error']} class="text-red-600" />
										</span>
										<span class="group-hover:hidden" class:hidden={output[i]?.status != 'done'}>
											<Icon icon={statusIcons['done']} class="text-green-600" />
										</span>
										<button
											class:hidden={output[i]?.status != 'none'}
											class="block group-hover:block cursor-pointer"
											onclick={() => {}}
										>
											<Icon icon={statusIcons['refresh']} class="text-gray-600" />
										</button>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
		<div class="flex justify-center gap-4">
			<b>Total Pieces:</b><span>{totalQuantity}</span>
		</div>
	</div>
{/if}
