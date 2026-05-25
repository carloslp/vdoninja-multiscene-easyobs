<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { supabase } from '$lib/supabaseClient';

	type Camera = {
		id: string;
		name: string;
		url: string;
	};

	const cameras: Camera[] = [
		{
			id: 'cam-1',
			name: 'Cámara 1',
			url: 'https://vdo.ninja/?view=cam-1'
		},
		{
			id: 'cam-2',
			name: 'Cámara 2',
			url: 'https://vdo.ninja/?view=cam-2'
		},
		{
			id: 'cam-3',
			name: 'Cámara 3',
			url: 'https://vdo.ninja/?view=cam-3'
		}
	];

	let directorChannel: ReturnType<typeof supabase.channel> | null = null;
	let selectedCameraId = $state<string | null>(null);
	let error = $state('');
	let sending = $state(false);

	const subscribeChannel = async () => {
		if (!browser) return false;

		const channel = (directorChannel ??= supabase.channel('director-control'));

		if (channel.state === 'joined') return true;

		const status = await new Promise<string>((resolve) => {
			channel.subscribe((channelStatus) => resolve(channelStatus));
		});

		return status === 'SUBSCRIBED';
	};

	const handleSendToAir = async (cameraId: string) => {
		error = '';
		sending = true;

		const isReady = await subscribeChannel();
		if (!isReady) {
			error = 'No se pudo conectar al canal de transmisión en tiempo real.';
			sending = false;
			return;
		}

		const channel = directorChannel;
		if (!channel) {
			error = 'No se pudo conectar al canal de transmisión en tiempo real.';
			sending = false;
			return;
		}

		const sendStatus = await channel.send({
			type: 'broadcast',
			event: 'camera-on-air',
			payload: { cameraId }
		});

		sending = false;

		if (sendStatus !== 'ok') {
			error = 'No se pudo mandar la cámara al aire.';
			return;
		}

		selectedCameraId = cameraId;
	};

	onDestroy(() => {
		if (directorChannel) {
			void supabase.removeChannel(directorChannel);
		}
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
