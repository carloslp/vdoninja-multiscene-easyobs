<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Camera } from '$lib/cameras';
	import { getCameras } from '$lib/services/db';
	import { onSwitchCamera, type SceneSwitchPayload } from '$lib/services/realtime';
	import { supabase } from '$lib/supabaseClient';

	let cameras = $state<Camera[]>([]);
	let activeCameraId = $state<string | null>(null);
	let activeExternalUrl = $state<string | null>(null);
	let loading = $state(true);
	let error = $state('');

	let unsubscribe: (() => void) | null = null;

	const buildCameraUrl = (baseUrl: string) =>
		`${baseUrl}${baseUrl.includes('?') ? '&' : '?'}clean&autoplay&transparent&cover`;

	const syncActiveCamera = (nextCameras: Camera[]) => {
		if (activeExternalUrl) {
			return;
		}

		if (activeCameraId && nextCameras.some((camera) => camera.id === activeCameraId)) {
			return;
		}

		activeCameraId = nextCameras[0]?.id ?? null;
	};

	const loadProgramCameras = async () => {
		const loaded = await getCameras();
		cameras = loaded;
		syncActiveCamera(loaded);
		return loaded;
	};

	const applyCameraSwitch = (payload: SceneSwitchPayload, availableCameras: Camera[]) => {
		if (payload.cameraId) {
			const matchingCamera = availableCameras.find((camera) => camera.id === payload.cameraId);
			if (matchingCamera) {
				activeCameraId = matchingCamera.id;
				activeExternalUrl = null;
				return true;
			}
		}

		if (payload.url) {
			const matchingCamera = availableCameras.find((camera) => camera.url === payload.url);
			if (matchingCamera) {
				activeCameraId = matchingCamera.id;
				activeExternalUrl = null;
			} else {
				activeCameraId = null;
				activeExternalUrl = payload.url;
			}
			return true;
		}

		return false;
	};

	const handleCameraSwitch = async (payload: SceneSwitchPayload) => {
		if (applyCameraSwitch(payload, cameras) || !payload.cameraId) {
			return;
		}

		try {
			const loaded = await loadProgramCameras();
			applyCameraSwitch(payload, loaded);
		} catch {
			error = 'No se pudo refrescar la salida del programa.';
		}
	};

	onMount(async () => {
		try {
			const {
				data: { user }
			} = await supabase.auth.getUser();

			if (!user) {
				error = 'Inicia sesión para abrir la salida del programa.';
				return;
			}

			await loadProgramCameras();

			unsubscribe = onSwitchCamera(user.id, (payload) => {
				void handleCameraSwitch(payload);
			});
		} catch {
			error = 'No se pudo cargar la salida del programa.';
		} finally {
			loading = false;
		}
	});

	onDestroy(() => {
		unsubscribe?.();
	});
</script>

<main class="program-output">
	{#if loading}
		<p class="status-message">Cargando salida del programa...</p>
	{:else if error}
		<p class="status-message error-message">{error}</p>
	{:else if cameras.length === 0 && !activeExternalUrl}
		<p class="status-message">Todavía no hay cámaras registradas.</p>
	{:else}
		{#each cameras as camera (camera.id)}
			<iframe
				title={camera.name}
				src={buildCameraUrl(camera.url)}
				allow="autoplay; fullscreen; camera; microphone; display-capture"
				class:visible={activeCameraId === camera.id}
			></iframe>
		{/each}

		{#if activeExternalUrl}
			<iframe
				title="Program Output"
				src={buildCameraUrl(activeExternalUrl)}
				allow="autoplay; fullscreen; camera; microphone; display-capture"
				class="visible"
			></iframe>
		{/if}
	{/if}
</main>

<style>
	main {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		background: #000;
	}

	.status-message {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		margin: 0;
		padding: 1.5rem;
		color: #e5e7eb;
		text-align: center;
		font-size: 1.125rem;
		background: #020617;
	}

	.error-message {
		color: #fca5a5;
	}

	iframe {
		position: absolute;
		inset: 0;
		width: 100vw;
		height: 100vh;
		border: 0;
		opacity: 0;
		transition: opacity 0.25s ease;
		pointer-events: none;
	}

	iframe.visible {
		opacity: 1;
	}
</style>
