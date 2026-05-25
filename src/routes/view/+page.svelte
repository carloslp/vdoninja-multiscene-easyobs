<script lang="ts">
	import { onDestroy } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import { cameras } from '$lib/cameras';
	import { SCENE_CHANNEL, SCENE_CHANGE_EVENT } from '$lib/sceneChannel';

	const spectatorCameras = cameras.map((camera) => ({
		...camera,
		url: `${camera.url}${camera.url.includes('?') ? '&' : '?'}clean&autoplay&transparent`
	}));

	let activeCameraId = $state(spectatorCameras[0]?.id ?? '');

	const channel = supabase
		.channel(SCENE_CHANNEL)
		.on('broadcast', { event: SCENE_CHANGE_EVENT }, ({ payload }) => {
			const cameraId = payload?.cameraId;
			if (typeof cameraId === 'string' && spectatorCameras.some((camera) => camera.id === cameraId)) {
				activeCameraId = cameraId;
			}
		})
		.subscribe();

	onDestroy(() => {
		void supabase.removeChannel(channel);
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
