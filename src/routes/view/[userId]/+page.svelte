<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/state';
	import type { Camera } from '$lib/cameras';
	import { getPublicCameras } from '$lib/services/db';
	import { onChangeScene } from '$lib/services/realtime';

	const userId = page.params.userId ?? '';

	let spectatorCameras = $state<(Camera & { url: string })[]>([]);
	let activeCameraId = $state('');

	onMount(async () => {
		const loaded = await getPublicCameras(userId);
		spectatorCameras = loaded.map((camera) => ({
			...camera,
			url: `${camera.url}${camera.url.includes('?') ? '&' : '?'}clean&autoplay&transparent&cover`
		}));
		activeCameraId = spectatorCameras[0]?.id ?? '';
	});

	const unsubscribe = onChangeScene(userId, (cameraId) => {
		if (spectatorCameras.some((camera) => camera.id === cameraId)) {
			activeCameraId = cameraId;
		}
	});

	onDestroy(() => {
		unsubscribe();
	});
</script>

<main>
	{#each spectatorCameras as camera (camera.id)}
		<iframe
			title={camera.name}
			src={camera.url}
			allow="autoplay; fullscreen; camera; microphone; display-capture"
			class:visible={activeCameraId === camera.id}
		></iframe>
	{/each}
</main>

<style>
	main {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		background: transparent;
	}

	iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		border: 0;
		opacity: 0;
		transition: opacity 0.5s ease;
		pointer-events: none;
	}

	iframe.visible {
		opacity: 1;
	}
</style>
