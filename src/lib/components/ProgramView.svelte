<script lang="ts">
	let { sessionId = '' } = $props<{ sessionId?: string }>();
</script>

<svelte:head>
	<title>{sessionId ? `Program · ${sessionId}` : 'Program'}</title>
</svelte:head>

<main class="program-screen" data-session-id={sessionId || undefined}>
	<section class="program-canvas" aria-label={sessionId ? `Programa ${sessionId}` : 'Programa'}>
		<div class="program-copy">
			<h1>Programa</h1>
			<p>Vista de salida preparada para emisión a pantalla completa.</p>
			{#if sessionId}
				<p class="session-label">Sesión: {sessionId}</p>
			{/if}
		</div>
	</section>
</main>

<style>
	:global(body) {
		margin: 0;
		background: #020617;
	}

	.program-screen {
		position: fixed;
		inset: 0;
		background:
			radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 48%),
			linear-gradient(180deg, #020617 0%, #111827 100%);
		color: #e2e8f0;
	}

	.program-canvas {
		width: 100vw;
		height: 100vh;
		display: grid;
		place-items: center;
		padding: 2rem;
		box-sizing: border-box;
	}

	.program-copy {
		text-align: center;
		display: grid;
		gap: 0.75rem;
	}

	h1,
	p {
		margin: 0;
	}

	h1 {
		font-size: clamp(2rem, 4vw, 3rem);
	}

	p {
		font-size: clamp(1rem, 2vw, 1.25rem);
		color: #cbd5e1;
	}

	.session-label {
		color: #93c5fd;
		font-weight: 600;
	}
</style>
