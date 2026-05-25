<script lang="ts">
	import { supabase } from '$lib/supabaseClient';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let message = $state('');
	let loading = $state(false);

	const handleRegister = async (event: SubmitEvent) => {
		event.preventDefault();
		error = '';
		message = '';
		loading = true;

		const { data, error: authError } = await supabase.auth.signUp({
			email,
			password
		});

		loading = false;

		if (authError) {
			error = authError.message;
			return;
		}

		if (data.session) {
			message = 'Registro completado. Ya has iniciado sesión.';
			return;
		}

		message = 'Registro completado. Revisa tu correo para confirmar la cuenta.';
	};
</script>

<main class="auth-container">
	<form class="auth-form" onsubmit={handleRegister}>
		<h1>Crear cuenta</h1>

		<label for="email">Email</label>
		<input id="email" type="email" bind:value={email} required autocomplete="email" />

		<label for="password">Contraseña</label>
		<input
			id="password"
			type="password"
			bind:value={password}
			required
			minlength="6"
			autocomplete="new-password"
		/>

		{#if error}
			<p class="error-message">{error}</p>
		{/if}

		{#if message}
			<p class="success-message">{message}</p>
		{/if}

		<button type="submit" disabled={loading}>
			{loading ? 'Creando cuenta...' : 'Registrarse'}
		</button>
	</form>
</main>

<style>
	.auth-container {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 1.5rem;
	}

	.auth-form {
		width: min(100%, 26rem);
		display: grid;
		gap: 0.75rem;
		padding: 1.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.75rem;
		background-color: #fff;
	}

	h1 {
		margin: 0 0 0.5rem;
		font-size: 1.5rem;
	}

	label {
		font-size: 0.95rem;
		font-weight: 600;
	}

	input,
	button {
		font: inherit;
		padding: 0.65rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid #cbd5e1;
	}

	button {
		background-color: #0f172a;
		color: #fff;
		border-color: #0f172a;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}

	.error-message {
		margin: 0;
		color: #b91c1c;
		font-size: 0.9rem;
	}

	.success-message {
		margin: 0;
		color: #166534;
		font-size: 0.9rem;
	}
</style>
