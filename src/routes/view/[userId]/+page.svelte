<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/state';
	import {
		getMediaDevicesSelection,
		getPreviewStream,
		stopPreviewStream,
		watchMicrophoneLevel,
		type Camera,
		type CameraDevice
	} from '$lib/cameras';
	import { getPublicCameras } from '$lib/services/db';
	import { onChangeScene } from '$lib/services/realtime';

	const userId = page.params.userId ?? '';

	let spectatorCameras = $state<Camera[]>([]);
	let activeCameraId = $state('');
	let waitingRoom = $state(true);
	let joiningStream = $state(false);
	let waitingRoomError = $state('');
	let loadingDevices = $state(true);
	let availableCameras = $state<CameraDevice[]>([]);
	let availableMicrophones = $state<CameraDevice[]>([]);
	let selectedCameraDeviceId = $state('');
	let selectedMicrophoneDeviceId = $state('');
	let microphoneLevel = $state(0);

	let previewVideo = $state<HTMLVideoElement | null>(null);
	let previewStream = $state<MediaStream | null>(null);
	let stopLevelTracking: (() => void) | null = null;

	const buildCameraUrl = (baseUrl: string) => {
		const separator = baseUrl.includes('?') ? '&' : '?';
		const deviceParams = new URLSearchParams();

		if (selectedCameraDeviceId) {
			deviceParams.set('videodevice', selectedCameraDeviceId);
		}

		if (selectedMicrophoneDeviceId) {
			deviceParams.set('audiodevice', selectedMicrophoneDeviceId);
		}

		const selectedDevices = deviceParams.toString();
		const base = `${baseUrl}${separator}clean&autoplay&transparent&cover`;
		return selectedDevices ? `${base}&${selectedDevices}` : base;
	};

	const attachPreview = async (stream: MediaStream) => {
		if (!previewVideo) {
			return;
		}

		previewVideo.srcObject = stream;
		await previewVideo.play();
	};

	const refreshMediaPreview = async () => {
		const stream = await getPreviewStream(selectedCameraDeviceId || undefined, selectedMicrophoneDeviceId || undefined);
		stopPreviewStream(previewStream);
		stopLevelTracking?.();
		previewStream = stream;
		microphoneLevel = 0;
		stopLevelTracking = watchMicrophoneLevel(stream, (level) => {
			microphoneLevel = level;
		});
		await attachPreview(stream);
	};

	const loadMediaOptions = async () => {
		loadingDevices = true;
		waitingRoomError = '';

		try {
			const initialStream = await getPreviewStream();
			stopPreviewStream(previewStream);
			previewStream = initialStream;
			await attachPreview(initialStream);

			const { cameras, microphones } = await getMediaDevicesSelection();
			availableCameras = cameras;
			availableMicrophones = microphones;
			selectedCameraDeviceId = cameras[0]?.deviceId ?? '';
			selectedMicrophoneDeviceId = microphones[0]?.deviceId ?? '';

			if (selectedCameraDeviceId || selectedMicrophoneDeviceId) {
				await refreshMediaPreview();
			} else {
				stopLevelTracking?.();
				stopLevelTracking = watchMicrophoneLevel(initialStream, (level) => {
					microphoneLevel = level;
				});
			}
		} catch {
			waitingRoomError =
				'No se pudo acceder a la cámara o micrófono. Revisa permisos e inténtalo de nuevo.';
		} finally {
			loadingDevices = false;
		}
	};

	const handleCameraDeviceChange = async (event: Event) => {
		const target = event.target as HTMLSelectElement;
		selectedCameraDeviceId = target.value;
		await refreshMediaPreview();
	};

	const handleMicrophoneDeviceChange = async (event: Event) => {
		const target = event.target as HTMLSelectElement;
		selectedMicrophoneDeviceId = target.value;
		await refreshMediaPreview();
	};

	const enterStream = () => {
		joiningStream = true;
		waitingRoom = false;
		joiningStream = false;
		stopPreviewStream(previewStream);
		stopLevelTracking?.();
		previewStream = null;
		stopLevelTracking = null;
	};

	onMount(async () => {
		const loaded = await getPublicCameras(userId);
		spectatorCameras = loaded;
		activeCameraId = spectatorCameras[0]?.id ?? '';
		await loadMediaOptions();
	});

	const unsubscribe = onChangeScene(userId, (cameraId) => {
		if (spectatorCameras.some((camera) => camera.id === cameraId)) {
			activeCameraId = cameraId;
		}
	});

	onDestroy(() => {
		unsubscribe();
		stopPreviewStream(previewStream);
		stopLevelTracking?.();
	});
</script>

<main>
	{#if waitingRoom}
		<section class="green-room">
			<div class="green-room-card">
				<h1>Sala de Espera</h1>
				<p>Comprueba tu cámara y micrófono antes de entrar al stream.</p>

				{#if waitingRoomError}
					<p class="error-message">{waitingRoomError}</p>
				{/if}

				<video bind:this={previewVideo} autoplay playsinline muted></video>

				<div class="device-grid">
					<label>
						<span>Cámara</span>
						<select
							value={selectedCameraDeviceId}
							onchange={handleCameraDeviceChange}
							disabled={loadingDevices}
						>
							{#if availableCameras.length === 0}
								<option value="">Sin cámaras disponibles</option>
							{:else}
								{#each availableCameras as camera}
									<option value={camera.deviceId}>{camera.label}</option>
								{/each}
							{/if}
						</select>
					</label>

					<label>
						<span>Micrófono</span>
						<select
							value={selectedMicrophoneDeviceId}
							onchange={handleMicrophoneDeviceChange}
							disabled={loadingDevices}
						>
							{#if availableMicrophones.length === 0}
								<option value="">Sin micrófonos disponibles</option>
							{:else}
								{#each availableMicrophones as microphone}
									<option value={microphone.deviceId}>{microphone.label}</option>
								{/each}
							{/if}
						</select>
					</label>
				</div>

				<div class="mic-level">
					<span>Nivel de micrófono</span>
					<div class="mic-level-bar">
						<div class="mic-level-fill" style={`width: ${microphoneLevel}%`}></div>
					</div>
				</div>

				<button type="button" onclick={enterStream} disabled={joiningStream || !!waitingRoomError}>
					{joiningStream ? 'Entrando...' : 'Entrar al stream'}
				</button>
			</div>
		</section>
	{:else}
		{#each spectatorCameras as camera (camera.id)}
			<iframe
				title={camera.name}
				src={buildCameraUrl(camera.url)}
				allow="autoplay; fullscreen; camera; microphone; display-capture"
				class:visible={activeCameraId === camera.id}
			></iframe>
		{/each}
	{/if}
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

	.green-room {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		background: #0f172a;
		padding: 1rem;
	}

	.green-room-card {
		width: min(42rem, 100%);
		background: #111827;
		border: 1px solid #374151;
		border-radius: 1rem;
		padding: 1.5rem;
		color: #e5e7eb;
		display: grid;
		gap: 1rem;
	}

	h1 {
		margin: 0;
		font-size: 1.5rem;
	}

	p {
		margin: 0;
		color: #d1d5db;
	}

	video {
		width: 100%;
		aspect-ratio: 16 / 9;
		border-radius: 0.75rem;
		background: #000;
		object-fit: cover;
	}

	.device-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 0.75rem;
	}

	label {
		display: grid;
		gap: 0.375rem;
	}

	select {
		padding: 0.55rem 0.7rem;
		border-radius: 0.5rem;
		border: 1px solid #4b5563;
		background: #1f2937;
		color: #f9fafb;
	}

	.mic-level {
		display: grid;
		gap: 0.5rem;
	}

	.mic-level-bar {
		height: 0.75rem;
		border-radius: 9999px;
		background: #1f2937;
		overflow: hidden;
	}

	.mic-level-fill {
		height: 100%;
		background: linear-gradient(90deg, #16a34a, #22c55e);
		transition: width 0.1s linear;
	}

	button {
		justify-self: end;
		padding: 0.7rem 1rem;
		border: 0;
		border-radius: 0.6rem;
		background: #22c55e;
		color: #052e16;
		font-weight: 700;
		cursor: pointer;
	}

	button:disabled {
		background: #4b5563;
		color: #e5e7eb;
		cursor: not-allowed;
	}

	.error-message {
		color: #fca5a5;
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
