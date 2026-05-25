<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Camera } from '$lib/cameras';
	import { getCameras } from '$lib/services/db';
	import { onChangeScene, sendChangeScene } from '$lib/services/realtime';

	let cameras = $state<Camera[]>([]);
	let selectedCameraId = $state<string | null>(null);
	let error = $state('');
	let sending = $state(false);

	onMount(async () => {
		try {
			cameras = await getCameras();
			selectedCameraId = cameras[0]?.id ?? null;
		} catch {
			error = 'No se pudieron cargar las cámaras.';
		}
	});

	const handleSendToAir = async (cameraId: string) => {
		if (!cameras.some((camera) => camera.id === cameraId)) {
			return;
		}

		error = '';
		sending = true;

		try {
			const sendStatus = await sendChangeScene(cameraId);
			if (sendStatus !== 'ok') {
				error = 'No se pudo mandar la cámara al aire.';
				return;
			}

			selectedCameraId = cameraId;
		} catch {
			error = 'No se pudo conectar al canal de transmisión en tiempo real.';
		} finally {
			sending = false;
		}
	};

	const unsubscribe = onChangeScene((cameraId) => {
		if (cameras.some((camera) => camera.id === cameraId)) {
			selectedCameraId = cameraId;
		}
	});

	onDestroy(() => {
		unsubscribe();
	});
</script>

<main class="director-panel">
	<h1>Panel de Control del Director</h1>

	{#if error}
		<p class="error-message">{error}</p>
	{/if}

	<section class="camera-grid">
		{#each cameras as camera}
			<article class="camera-card">
				<h2>{camera.name}</h2>
				<p class="camera-id">ID: {camera.id}</p>
				<p class="camera-url">URL: {camera.url}</p>
				<iframe
					title={`Miniatura de ${camera.name}`}
					src={camera.url}
					loading="lazy"
					allow="camera; microphone; fullscreen; display-capture"
				></iframe>
				<button onclick={() => handleSendToAir(camera.id)} disabled={sending}>
					{#if selectedCameraId === camera.id}
						En vivo ahora
					{:else}
						Mandar al Aire
					{/if}
				</button>
			</article>
		{/each}
	</section>
</main>

<style>
	.director-panel {
		padding: 1.5rem;
	}

	h1 {
		margin: 0 0 1rem;
	}

	.camera-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 1rem;
	}

	.camera-card {
		border: 1px solid #d1d5db;
		border-radius: 0.75rem;
		padding: 1rem;
		display: grid;
		gap: 0.75rem;
		background: #fff;
	}

	h2 {
		margin: 0;
		font-size: 1.2rem;
	}

	.camera-id {
		margin: 0;
		color: #475569;
		font-size: 0.9rem;
	}

	.camera-url {
		margin: 0;
		color: #475569;
		font-size: 0.85rem;
		word-break: break-all;
	}

	iframe {
		width: 100%;
		height: 12rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
	}

	button {
		font: inherit;
		font-size: 1.1rem;
		font-weight: 700;
		padding: 0.9rem 0.75rem;
		border-radius: 0.65rem;
		border: 1px solid #0f172a;
		background: #0f172a;
		color: #fff;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}

	.error-message {
		margin: 0 0 1rem;
		color: #b91c1c;
	}
</style>
