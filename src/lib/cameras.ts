export type Camera = {
	id: string;
	name: string;
	url: string;
};

export type CameraDevice = {
	deviceId: string;
	label: string;
};

export type MediaDevicesSelection = {
	cameras: CameraDevice[];
	microphones: CameraDevice[];
};

export const getMediaDevicesSelection = async (): Promise<MediaDevicesSelection> => {
	if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
		return { cameras: [], microphones: [] };
	}

	const devices = await navigator.mediaDevices.enumerateDevices();
	const cameras = devices
		.filter((device) => device.kind === 'videoinput')
		.map((device, index) => ({
			deviceId: device.deviceId,
			label: device.label || `Cámara ${index + 1}`
		}));
	const microphones = devices
		.filter((device) => device.kind === 'audioinput')
		.map((device, index) => ({
			deviceId: device.deviceId,
			label: device.label || `Micrófono ${index + 1}`
		}));

	return { cameras, microphones };
};

export const getPreviewStream = async (
	cameraDeviceId?: string,
	microphoneDeviceId?: string
): Promise<MediaStream> => {
	return navigator.mediaDevices.getUserMedia({
		video: cameraDeviceId ? { deviceId: { exact: cameraDeviceId } } : true,
		audio: microphoneDeviceId ? { deviceId: { exact: microphoneDeviceId } } : true
	});
};

export const stopPreviewStream = (stream: MediaStream | null): void => {
	stream?.getTracks().forEach((track) => track.stop());
};

export const watchMicrophoneLevel = (
	stream: MediaStream,
	onLevel: (level: number) => void
): (() => void) => {
	const AudioContextClass = typeof window !== 'undefined' ? window.AudioContext : null;
	if (!AudioContextClass) {
		return () => {};
	}

	const context = new AudioContextClass();
	const analyser = context.createAnalyser();
	analyser.fftSize = 2048;

	const source = context.createMediaStreamSource(stream);
	source.connect(analyser);

	const data = new Uint8Array(analyser.fftSize);
	let frameId = 0;

	const update = () => {
		analyser.getByteTimeDomainData(data);
		let sum = 0;
		for (const value of data) {
			const normalized = value / 128 - 1;
			sum += normalized * normalized;
		}

		const rms = Math.sqrt(sum / data.length);
		onLevel(Math.min(100, Math.round(rms * 220)));
		frameId = requestAnimationFrame(update);
	};

	update();

	return () => {
		cancelAnimationFrame(frameId);
		source.disconnect();
		analyser.disconnect();
		void context.close();
	};
};
