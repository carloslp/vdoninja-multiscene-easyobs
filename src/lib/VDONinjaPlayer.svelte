<script lang="ts">
	const VDO_NINJA_URL = 'https://vdo.ninja/';

	const buildStreamUrl = (value: string, muted: boolean, autoPlay: boolean) => {
		const trimmedValue = value.trim();

		if (!trimmedValue) {
			return '';
		}

		let url: URL;

		try {
			url = new URL(trimmedValue);
		} catch {
			url = new URL(VDO_NINJA_URL);
			url.searchParams.set('view', trimmedValue);
		}

		url.searchParams.set('clean', '');

		if (autoPlay) {
			url.searchParams.set('autoplay', '');
		} else {
			url.searchParams.delete('autoplay');
		}

		if (muted) {
			url.searchParams.set('muted', '');
		} else {
			url.searchParams.delete('muted');
		}

		return url.toString();
	};

	let {
		streamUrl,
		muted = false,
		autoPlay = true,
		title = 'VDO.Ninja Player',
		loading = 'eager',
		allow = 'autoplay; fullscreen; camera; microphone; display-capture',
		...restProps
	} = $props<{
		streamUrl: string;
		muted?: boolean;
		autoPlay?: boolean;
		title?: string;
		loading?: 'eager' | 'lazy';
		allow?: string;
		[key: string]: unknown;
	}>();

	const iframeSrc = $derived(buildStreamUrl(streamUrl, muted, autoPlay));
</script>

<iframe {...restProps} title={title} src={iframeSrc} {loading} {allow}></iframe>

<style>
	iframe {
		display: block;
		width: 100%;
		height: 100%;
		border: 0;
		background: transparent;
	}
</style>
