<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Camera } from '$lib/cameras';
	import { deleteCamera, getCameras, insertCamera } from '$lib/services/db';
	import { onChangeScene, sendChangeScene } from '$lib/services/realtime';
	import { supabase } from '$lib/supabaseClient';

	let cameras = $state<Camera[]>([]);
	let selectedCameraId = $state<string | null>(null);
	let sceneName = $state('');
	let cameraUrl = $state('');

	const previewUrl = (url: string) =>
		`${url}${url.includes('?') ? '&' : '?'}clean&autoplay&muted`;
	let error = $state('');
	let loadingCameras = $state(true);
	let saving = $state(false);
	let sending = $state(false);
	let deletingCameraId = $state<string | null>(null);
	let directorUserId = $state<string | null>(null);
	let copiedCameraId = $state<string | null>(null);
	let copiedTimeout: ReturnType<typeof setTimeout> | null = null;

	const syncSelectedCamera = () => {
		if (!cameras.some((camera) => camera.id === selectedCameraId)) {
			selectedCameraId = cameras[0]?.id ?? null;
		}
	};

	const loadCameras = async () => {
		loadingCameras = true;
		error = '';

		try {
			cameras = await getCameras();
			syncSelectedCamera();
		} catch {
			error = 'No se pudo cargar la lista de cámaras.';
		} finally {
			loadingCameras = false;
		}
	};

	const handleAddCamera = async (event: SubmitEvent) => {
		event.preventDefault();

		const name = sceneName.trim();
		const url = cameraUrl.trim();

		if (!name || !url) {
			return;
		}

		error = '';
		saving = true;

		try {
			const camera = await insertCamera(name, url);
			cameras = [...cameras, camera];
			sceneName = '';
			cameraUrl = '';
			syncSelectedCamera();
		} catch {
			error = 'No se pudo añadir la cámara.';
		} finally {
			saving = false;
		}
	};

	const handleDeleteCamera = async (cameraId: string) => {
		deletingCameraId = cameraId;
		error = '';

		try {
			await deleteCamera(cameraId);
			cameras = cameras.filter((camera) => camera.id !== cameraId);
			syncSelectedCamera();
		} catch {
			error = 'No se pudo eliminar la cámara.';
		} finally {
			deletingCameraId = null;
		}
	};

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

	const resetCopiedState = () => {
		if (copiedTimeout) {
			clearTimeout(copiedTimeout);
			copiedTimeout = null;
		}
		copiedCameraId = null;
	};

	const handleCopyViewUrl = async (cameraId: string) => {
		if (!directorUserId || typeof window === 'undefined' || !navigator.clipboard) {
			error = 'No se pudo copiar el enlace de vista.';
			return;
		}

		try {
			const url = new URL(`/view/${directorUserId}`, window.location.origin).toString();
			await navigator.clipboard.writeText(url);
			error = '';
			copiedCameraId = cameraId;
			if (copiedTimeout) {
				clearTimeout(copiedTimeout);
			}
			copiedTimeout = setTimeout(() => {
				copiedCameraId = null;
				copiedTimeout = null;
			}, 1500);
		} catch {
			error = 'No se pudo copiar el enlace de vista.';
		}
	};

	let unsubscribe: (() => void) | null = null;

	onMount(async () => {
		void loadCameras();
		const {
			data: { user }
		} = await supabase.auth.getUser();
		if (user) {
			directorUserId = user.id;
			unsubscribe = onChangeScene(user.id, (cameraId) => {
				if (cameras.some((camera) => camera.id === cameraId)) {
					selectedCameraId = cameraId;
				}
			});
		}
	});

	onDestroy(() => {
		resetCopiedState();
		unsubscribe?.();
	});
</script>

<main class="director-panel">
	<h1>Panel de Control del Director</h1>

	<form class="camera-form" onsubmit={handleAddCamera}>
		<label>
			<span>Nombre de la Escena</span>
			<input
				type="text"
				bind:value={sceneName}
				placeholder="Ej. Cámara principal"
				required
			/>
		</label>

		<label>
			<span>URL de VDO.Ninja</span>
			<input
				type="url"
				bind:value={cameraUrl}
				placeholder="https://vdo.ninja/?view=..."
				required
			/>
		</label>

		<button type="submit" disabled={saving}>{saving ? 'Añadiendo...' : 'Añadir'}</button>
	</form>

	{#if error}
		<p class="error-message">{error}</p>
	{/if}

	<section class="camera-grid">
		{#if loadingCameras}
			<p class="status-message">Cargando cámaras...</p>
		{:else if cameras.length === 0}
			<p class="status-message">Todavía no hay cámaras registradas.</p>
		{/if}

		{#each cameras as camera (camera.id)}
			<article class="camera-card" class:on-air={selectedCameraId === camera.id}>
				<header class="camera-card-header">
					<h2>{camera.name}</h2>
					{#if selectedCameraId === camera.id}
						<span class="on-air-badge">● En Vivo</span>
					{/if}
					<button
						type="button"
						class="copy-button"
						aria-label="Copiar enlace de la escena"
						title={copiedCameraId === camera.id
							? '¡Copiado!'
							: 'Copiar URL para el invitado / OBS'}
						onclick={(event) => {
							event.stopPropagation();
							void handleCopyViewUrl(camera.id);
						}}
					>
						<span class="copy-icon" aria-hidden="true">
							{#if copiedCameraId === camera.id}✅{:else}📋{/if}
						</span>
					</button>
					<button
						type="button"
						class="delete-button"
						aria-label={`Eliminar ${camera.name}`}
						title="Eliminar"
						disabled={deletingCameraId === camera.id}
						onclick={() => handleDeleteCamera(camera.id)}
					>
						🗑️
					</button>
				</header>
				<iframe
					title={`Previo de ${camera.name}`}
					src={previewUrl(camera.url)}
					loading="lazy"
					allow="camera; microphone; autoplay; fullscreen; display-capture"
				></iframe>
				<button type="button" class="primary-button" onclick={() => handleSendToAir(camera.id)} disabled={sending}>
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

	.camera-form {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
		align-items: end;
	}

	.camera-form label {
		display: grid;
		gap: 0.35rem;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.camera-form input {
		font: inherit;
		padding: 0.65rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid #cbd5e1;
	}

	.camera-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 1rem;
	}

	.camera-card {
		border: 2px solid #d1d5db;
		border-radius: 0.75rem;
		padding: 1rem;
		display: grid;
		gap: 0.75rem;
		background: #fff;
	}

	.camera-card.on-air {
		border-color: #dc2626;
		box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2);
	}

	.camera-card-header {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	h2 {
		margin: 0;
		font-size: 1.2rem;
	}

	.on-air-badge {
		margin-left: auto;
		padding: 0.2rem 0.55rem;
		border-radius: 999px;
		background: #dc2626;
		color: #fff;
		font-size: 0.75rem;
		font-weight: 700;
		white-space: nowrap;
	}

	iframe {
		width: 100%;
		height: 12rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
	}

	button {
		font: inherit;
		border-radius: 0.65rem;
		cursor: pointer;
	}

	.primary-button {
		font: inherit;
		font-size: 1.1rem;
		font-weight: 700;
		padding: 0.9rem 0.75rem;
		border: 1px solid #0f172a;
		background: #0f172a;
		color: #fff;
	}

	.delete-button {
		display: inline-grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: 1px solid #cbd5e1;
		background: #fff;
		font-size: 1rem;
	}

	.copy-button {
		display: inline-grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: 1px solid #cbd5e1;
		background: #fff;
		color: #64748b;
		transition: background-color 0.15s ease;
	}

	.copy-button:hover,
	.copy-button:focus-visible {
		background: #e2e8f0;
	}

	.copy-button:focus-visible {
		outline: 2px solid #0f172a;
		outline-offset: 2px;
	}

	.copy-icon {
		font-size: 1rem;
		line-height: 1;
	}

	button:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}

	.error-message {
		margin: 0 0 1rem;
		color: #b91c1c;
	}

	.status-message {
		margin: 0;
		color: #475569;
	}
</style>
