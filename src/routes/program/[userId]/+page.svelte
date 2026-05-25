<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/state';
	import type { Camera } from '$lib/cameras';
	import { getPublicCameras } from '$lib/services/db';
	import { onChangeScene } from '$lib/services/realtime';

	const userId = page.params.userId ?? '';

	let cameras = $state<Camera[]>([]);
	let activeCameraId = $state('');
	let loading = $state(true);

	onMount(async () => {
		const loaded = await getPublicCameras(userId);
		cameras = loaded;
		activeCameraId = cameras[0]?.id ?? '';
		loading = false;
	});

	const unsubscribe = onChangeScene(userId, (cameraId) => {
		if (cameras.some((camera) => camera.id === cameraId)) {
			activeCameraId = cameraId;
		}
	});

	onDestroy(() => {
		unsubscribe();
	});
</script>

<svelte:head>
	<title>Programa en Vivo</title>
</svelte:head>

<main>
	{#if loading}
		<div class="loading" aria-live="polite">Cargando...</div>
	{:else if cameras.length === 0}
		<div class="empty" aria-live="polite">Sin cámaras configuradas.</div>
	{:else}
		{#each cameras as camera (camera.id)}
			<iframe
				title={camera.name}
				src={`${camera.url}${camera.url.includes('?') ? '&' : '?'}clean&autoplay&transparent&cover`}
				allow="autoplay; fullscreen; camera; microphone; display-capture"
				class:visible={activeCameraId === camera.id}
			></iframe>
		{/each}
	{/if}
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background: #000;
		overflow: hidden;
	}

	main {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		background: #000;
		overflow: hidden;
	}

	.loading,
	.empty {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: #e5e7eb;
		font-family: sans-serif;
		font-size: 1.25rem;
	}

	iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		border: 0;
		opacity: 0;
		transition: opacity 0.4s ease;
		pointer-events: none;
	}

	iframe.visible {
		opacity: 1;
	}
</style>
