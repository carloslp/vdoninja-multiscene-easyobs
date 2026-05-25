<script lang="ts">
	import { page } from '$app/state';
	import ProgramView from '$lib/components/ProgramView.svelte';

	const sessionId = page.url.searchParams.get('session') ?? '';
</script>

<ProgramView {sessionId} />
