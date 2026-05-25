<script lang="ts">
	import type { AuthError } from '@supabase/supabase-js';
	import { supabase } from '$lib/supabaseClient';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let message = $state('');
	let loading = $state(false);
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const isEmailValid = $derived(emailRegex.test(email));

	const isSpanish =
		typeof navigator === 'undefined' || navigator.language.toLowerCase().startsWith('es');
	const t = (es: string, en: string) => (isSpanish ? es : en);

	const mapAuthErrorMessage = (authError: AuthError) => {
		const code = authError.code ?? '';
		const rawMessage = authError.message.toLowerCase();

		if (
			code === 'weak_password' ||
			rawMessage.includes('password should be at least') ||
			rawMessage.includes('weak password')
		) {
			return t(
				'Esta contraseña es demasiado débil. Usa al menos 6 caracteres.',
				'This password is too weak. Use at least 6 characters.'
			);
		}

		if (
			code === 'user_already_exists' ||
			rawMessage.includes('user already registered') ||
			rawMessage.includes('already registered')
		) {
			return t('Este correo ya está registrado.', 'This email is already registered.');
		}

		if (code === 'invalid_email' || rawMessage.includes('invalid email')) {
			return t('El formato del correo no es válido.', 'The email format is invalid.');
		}

		return t(
			'No se pudo completar el registro. Inténtalo de nuevo.',
			'Could not complete sign up. Please try again.'
		);
	};

	const handleRegister = async (event: SubmitEvent) => {
		event.preventDefault();
		if (loading) return;
		error = '';
		message = '';
		loading = true;

		const { data, error: authError } = await supabase.auth.signUp({
			email,
			password
		});

		loading = false;

		if (authError) {
			error = mapAuthErrorMessage(authError);
			return;
		}

		if (data.session) {
			message = t('Registro completado. Ya has iniciado sesión.', 'Sign up complete. You are logged in.');
			return;
		}

		message = t(
			'Registro completado. Revisa tu correo para confirmar la cuenta.',
			'Sign up complete. Check your email to confirm your account.'
		);
	};
</script>

<main class="auth-container">
	<form class="auth-form" onsubmit={handleRegister}>
		<h1>Crear cuenta</h1>

		<label for="email">
			Email
			{#if email && isEmailValid}
				<span class="email-valid" aria-label={t('Correo válido', 'Valid email')}>✓</span>
			{/if}
		</label>
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
			{#if loading}
				<span class="spinner" aria-hidden="true"></span>
				<span>{t('Creando cuenta...', 'Creating account...')}</span>
			{:else}
				<span>{t('Registrarse', 'Sign up')}</span>
			{/if}
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
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
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

	.email-valid {
		margin-left: 0.35rem;
		color: #15803d;
		font-weight: 700;
	}

	.spinner {
		width: 0.9rem;
		height: 0.9rem;
		border-radius: 9999px;
		border: 2px solid rgba(255, 255, 255, 0.35);
		border-top-color: #fff;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
