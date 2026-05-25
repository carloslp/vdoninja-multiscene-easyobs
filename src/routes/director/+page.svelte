<script lang="ts">
import { page } from '$app/state';
import DirectorDashboard from '$lib/components/DirectorDashboard.svelte';

const sessionId = page.url.searchParams.get('session') ?? '';
</script>

<DirectorDashboard {sessionId} />
