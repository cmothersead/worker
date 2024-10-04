<script lang="ts">
	import Icon from '@iconify/svelte';
	import { statusIcons } from '.';

	export let headless = true;
	const criticalShippers = [
		{
			name: 'Abbott',
			accountNumbers:
				'106499462, 110963963, 170911660, 187619858, 217485738, 237927915, 243482194, 256041782, 267310203, 315926726, 356652401, 415728344, 415729626, 459318488, 528032621, 675067236, 746597061, 746779488, 898384047'
		},
		{
			name: 'Abbvie',
			accountNumbers:
				'106671001, 108631120, 178506587, 178508580, 222967589, 240860732, 241396371, 243043751, 286329586, 400021228'
		},
		{
			name: 'Alliance',
			accountNumbers:
				'127418772, 129634545, 131172672, 143299236, 239196896, 315032938, 560377282, 925535818'
		},
		{
			name: 'Cardinal',
			accountNumbers:
				'080222858, 157044834, 215679217, 223518303, 230922381, 254205680, 312495848, 312830043, 318210527, 510431863, 687235606, 694883273, 723066921, 806126810'
		},
		{ name: 'Community Tissue', accountNumbers: '222288916, 985296634, 985959951' },
		{
			name: 'Eureka',
			accountNumbers: '174515514'
		},
		{
			name: 'Express Scripts',
			accountNumbers:
				'206365340, 252355863, 252360867, 258625501, 260887785, 305426962, 356637143, 391701067, 447439883, 630075157, 846966463, 868544490'
		},
		{
			name: 'GE Healthcare',
			accountNumbers: '060663432, 007101058, 216438523, 210701095, 330929928, 694365876'
		},
		{
			name: 'Johnson n Johnson',
			accountNumbers:
				'275729562, 307676508, 46600576, 338866364, 337098860, 80902158, 876174537, 091535866, 135078808, 264828546, 779068536, 102988205, 275759562'
		},
		{
			name: 'Leiters',
			accountNumbers: '659311852, 884275318'
		},
		{
			name: 'LifeNet Health',
			accountNumbers:
				'622902265, 616818805, 619099745, 233979384, 867033742, 623486702, 378555299, 256771594, 610564224, 648978057, 411491820, 634035184, 786155444, 599586784, 314397525, 872348913, 915006248, 681866302, 192473527, 619184947, 110924780, 767030843, 626831133'
		},
		{ name: 'LuluLemon', accountNumbers: '944751971' },
		{
			name: 'McKesson',
			accountNumbers: '353808788, 355701727, 359541198, 370160953, 410947188, 682488972'
		},
		{
			name: 'MNX',
			accountNumbers: '336817323, 814048209'
		},
		{ name: 'Mt Parnell', accountNumbers: '368944696' },
		{
			name: 'OptumRx',
			accountNumbers:
				'127339058, 134206292, 201878898, 238797942, 238809622, 243069432, 251733805, 285109825, 291063748, 292714920, 294509798, 306368540, 308927857, 310729558, 319090762, 320661943, 335423038, 341963800, 366154078, 373726460, 406276465, 428754166, 440521525, 491253681, 502842765, 517536202, 621677250, 621757350, 642261053, 642420674, 650841999, 684804391, 692692896, 692731492, 730300999, 762753960, 775343079, 795501835, 795542051, 805397357, 865124996, 865125038, 865125070, 873939451, 884923204, 911425793, 952971280'
		},
		{ name: 'Ozark', accountNumbers: '152777337, 230178356, 883642015' },
		{ name: 'Quality Marine', accountNumbers: '128124802' },
		{ name: 'Reptiles by Mack', accountNumbers: '445853364' },
		{
			name: 'Roche',
			accountNumbers: '161353485, 046207840, 234032666, 197316624, 161557757, 128953809'
		},
		{
			name: 'Stryker',
			accountNumbers:
				'173030746, 216005244, 229226380, 245115954, 256347814, 259098769, 285545730, 319316213, 319493514, 319747338, 319782796, 343081162, 345685847, 355712869, 650622731, 660987975, 911662639'
		},
		{
			name: 'Tailored Brands',
			accountNumbers: '320206570, 320206650, 799453126, 799454246, 799817829, 799906287, 800088461'
		},
		{ name: 'Takeda', accountNumbers: '943853738' },
		{
			name: 'ThermoLife',
			accountNumbers: '014200215, 108993340, 230855951, 242598520, 298646196, 412575881'
		},
		{ name: 'VA CMOP', accountNumbers: '339344124' },
		{
			name: 'Vaxserve',
			accountNumbers:
				'136496182, 137546299, 138390233, 163910950, 241045994, 356651464, 356660986, 356662920, 360097340, 364743025, 400360448, 535871906, 599848002, 693429277, 726468648, 872896430'
		}
	];

	let output = criticalShippers.map((shipper) => ({
		...shipper,
		count: undefined,
		status: 'none'
	}));
	let status = 'not started';

	async function shippers() {
		status = 'running';
		const simultaneousCount = 5;
		const shipperPromise = async ({ name, accountNumbers }, index: number) => {
			output = output.map((shipper) =>
				shipper.name === name ? { ...shipper, status: 'loading' } : shipper
			);
			const count = await window.api.shippers.run({ name, accountNumbers, headless });
			console.log(count);
			output = output.map((shipper) =>
				shipper.name === name ? { ...shipper, count, status: 'done' } : shipper
			);
			return index;
		};

		const promises = criticalShippers
			.slice(0, simultaneousCount)
			.map(async ({ name, accountNumbers }, index) =>
				shipperPromise({ name, accountNumbers }, index)
			);
		for (let i = simultaneousCount; i <= criticalShippers.length; i++) {
			const { name, accountNumbers } = criticalShippers[i];
			const index = await Promise.race(promises);
			promises.splice(index, 1, shipperPromise({ name, accountNumbers }, index));
		}
		status = 'done';
	}

	$: totalQuantity = output.reduce(
		(prev, { count }) => (count == undefined ? prev : prev + count),
		0
	);
</script>

<div class="bg-slate-400 p-4 rounded-lg">
	<h1 class="text-xl font-bold">Shippers</h1>
	<div class="flex flex-col gap-1">
		<button class="bg-green-500" on:click={shippers}>Let's Go!</button>
		<div class="flex justify-between">
			<span>{status}</span>
			<span>{totalQuantity}</span>
		</div>
		<div class="flex flex-col gap-1">
			{#each output as shipper}
				<div class="bg-slate-100 py-1 px-4 rounded">
					<div class="flex justify-between gap-4">
						<div class="text-xs font-bold">
							{shipper.name}
						</div>
						<div class="flex">
							<div class="text-xs">{shipper.count ?? '-'}</div>
							<div><Icon icon={statusIcons[shipper.status]} /></div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
