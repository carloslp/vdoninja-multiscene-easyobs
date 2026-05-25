<script lang="ts">
	import { onDestroy } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import { cameras } from '$lib/cameras';
	import { SCENE_CHANNEL, SCENE_CHANGE_EVENT } from '$lib/sceneChannel';

	let activeCameraId = $state(cameras[0]?.id ?? '');

	const channel = supabase
		.channel(SCENE_CHANNEL)
		.on('broadcast', { event: SCENE_CHANGE_EVENT }, ({ payload }) => {
			const cameraId = payload?.cameraId;
			if (typeof cameraId === 'string' && cameras.some((camera) => camera.id === cameraId)) {
				activeCameraId = cameraId;
			}
		})
		.subscribe();

	onDestroy(() => {
		void supabase.removeChannel(channel);
	});

	async function changeScene(cameraId: string) {
		activeCameraId = cameraId;
		await channel.send({
			type: 'broadcast',
			event: SCENE_CHANGE_EVENT,
			payload: { cameraId }
		});
	}
</script>

<main>
	<h1>Director</h1>
	<div class="camera-list">
		{#each cameras as camera}
			<button
				type="button"
				class:active={camera.id === activeCameraId}
				onclick={() => changeScene(camera.id)}
			>
				{camera.name}
			</button>
		{/each}
	</div>
</main>

<style>
	main {
		padding: 1.5rem;
	}

	.camera-list {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	button {
		padding: 0.65rem 1rem;
		border: 1px solid #0f172a;
		border-radius: 0.5rem;
		background: #fff;
		cursor: pointer;
	}

	button.active {
		background: #0f172a;
		color: #fff;
	}
</style>
