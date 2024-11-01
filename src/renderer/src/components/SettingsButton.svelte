<script lang="ts">
	import Icon from '@iconify/svelte';

	interface Props {
		settings: Boolean;
	}

	let { settings = $bindable() }: Props = $props();
</script>

<button class="rounded py-1 px-2 bg-gray-600 text-white" onclick={() => (settings = !settings)}>
	<Icon icon="mdi:gear" />
</button>
