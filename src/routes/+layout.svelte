<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { auth } from '$lib/stores/auth';
	import { supabase } from '$lib/supabaseClient';

	let { children } = $props();

	const PRIVATE_ROUTES = ['/director'];
	const CLEAN_ROUTES = ['/program'];

	$effect(() => {
		const { loading, user } = $auth;
		if (loading) return;
		if (!user && PRIVATE_ROUTES.some((r) => page.url.pathname.startsWith(r))) {
			goto('/login');
		}
	});

	async function handleSignOut() {
		await supabase.auth.signOut();
		goto('/login');
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if $auth.user && !CLEAN_ROUTES.some((r) => page.url.pathname.startsWith(r))}
	<nav>
		<button onclick={handleSignOut}>Cerrar sesión</button>
	</nav>
{/if}

{@render children()}
