<script lang="ts">
	import { page } from '$app/state';
	import ProgramView from '$lib/components/ProgramView.svelte';

	const sessionId = page.params.sessionId ?? '';
</script>

<ProgramView {sessionId} />
