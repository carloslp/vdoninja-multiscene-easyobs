<script lang="ts">
	type Props = {
		title: string;
		url: string;
		muted?: boolean;
	};

	let { title, url, muted = true }: Props = $props();

	const getEmbedUrl = (rawUrl: string, isMuted: boolean) =>
		`${rawUrl}${rawUrl.includes('?') ? '&' : '?'}clean&autoplay${isMuted ? '&muted' : ''}`;
</script>

<div class="player-shell">
	<iframe
		title={title}
		src={getEmbedUrl(url, muted)}
		loading="lazy"
		allow="camera; microphone; autoplay; fullscreen; display-capture"
	></iframe>
</div>

<style>
	.player-shell {
		aspect-ratio: 16 / 9;
		border-radius: 0.75rem;
		overflow: hidden;
		background: #0f172a;
	}

	iframe {
		width: 100%;
		height: 100%;
		border: 0;
		background: #0f172a;
	}
</style>
