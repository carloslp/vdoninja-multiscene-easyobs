import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '$lib/supabaseClient';

const CHANGE_SCENE_EVENT = 'change-scene';
const SWITCH_CAMERA_EVENT = 'switch_camera';
const scenesChannel = (userId: string) => `escenas-${userId}`;

let directorChannelPromise: Promise<RealtimeChannel> | null = null;
let directorChannelUserId: string | null = null;

const createSubscribedChannel = (userId: string) =>
	new Promise<RealtimeChannel>((resolve, reject) => {
		const channelName = scenesChannel(userId);
		const channel = supabase.channel(channelName, {
			config: { broadcast: { self: false } }
		});

		channel.subscribe((status) => {
			if (status === 'SUBSCRIBED') {
				resolve(channel);
			}

			if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
				reject(new Error(`Realtime channel "${channelName}" status: ${status}`));
			}
		});
	});

const getDirectorChannel = async () => {
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error('No hay un usuario autenticado.');
	}

	if (!directorChannelPromise || directorChannelUserId !== user.id) {
		directorChannelUserId = user.id;
		directorChannelPromise = createSubscribedChannel(user.id);
	}

	return directorChannelPromise;
};

export type SceneSwitchPayload = {
	cameraId: string | null;
	url: string | null;
};

const normalizeSceneSwitchPayload = (payload: unknown): SceneSwitchPayload => {
	const scenePayload =
		typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : null;
	const cameraId =
		scenePayload && typeof scenePayload.cameraId === 'string'
			? scenePayload.cameraId
			: null;
	const url =
		scenePayload && typeof scenePayload.url === 'string'
			? scenePayload.url
			: null;

	return {
		cameraId: cameraId && cameraId.length > 0 ? cameraId : null,
		url: url && url.length > 0 ? url : null
	};
};

const subscribeToSceneEvent = (
	userId: string,
	event: string,
	callback: (payload: SceneSwitchPayload) => void
) => {
	const channel = supabase.channel(scenesChannel(userId), {
		config: { broadcast: { self: false } }
	});

	channel
		.on('broadcast', { event }, ({ payload }) => {
			const nextPayload = normalizeSceneSwitchPayload(payload);
			if (nextPayload.cameraId || nextPayload.url) {
				callback(nextPayload);
			}
		})
		.subscribe();

	return () => {
		void channel.unsubscribe();
	};
};

export const sendChangeScene = async (cameraId: string, url?: string) => {
	const channel = await getDirectorChannel();
	const payload = {
		cameraId,
		...(url ? { url } : {})
	};

	const [legacyStatus, switchCameraStatus] = await Promise.all([
		channel.send({
			type: 'broadcast',
			event: CHANGE_SCENE_EVENT,
			payload
		}),
		channel.send({
			type: 'broadcast',
			event: SWITCH_CAMERA_EVENT,
			payload
		})
	]);

	return legacyStatus === 'ok' && switchCameraStatus === 'ok' ? 'ok' : legacyStatus;
};

export const onChangeScene = (userId: string, callback: (cameraId: string) => void) => {
	return subscribeToSceneEvent(userId, CHANGE_SCENE_EVENT, ({ cameraId }) => {
		if (cameraId) {
			callback(cameraId);
		}
	});
};

export const onSwitchCamera = (
	userId: string,
	callback: (payload: SceneSwitchPayload) => void
) => subscribeToSceneEvent(userId, SWITCH_CAMERA_EVENT, callback);
