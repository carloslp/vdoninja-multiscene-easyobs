<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Camera } from '$lib/cameras';
	import { getCameras } from '$lib/services/db';
	import { onChangeScene } from '$lib/services/realtime';

	let spectatorCameras = $state<(Camera & { url: string })[]>([]);
	let activeCameraId = $state('');

	onMount(async () => {
		const loaded = await getCameras();
		spectatorCameras = loaded.map((camera) => ({
			...camera,
			url: `${camera.url}${camera.url.includes('?') ? '&' : '?'}clean&autoplay&transparent`
		}));
		activeCameraId = spectatorCameras[0]?.id ?? '';
	});

	const unsubscribe = onChangeScene((cameraId) => {
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
