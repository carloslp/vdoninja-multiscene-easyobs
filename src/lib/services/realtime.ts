import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '$lib/supabaseClient';

const SCENES_CHANNEL = 'escenas';
const CHANGE_SCENE_EVENT = 'change-scene';

let directorChannelPromise: Promise<RealtimeChannel> | null = null;

const createSubscribedChannel = () =>
	new Promise<RealtimeChannel>((resolve, reject) => {
		const channel = supabase.channel(SCENES_CHANNEL, {
			config: { broadcast: { self: false } }
		});

		channel.subscribe((status) => {
			if (status === 'SUBSCRIBED') {
				resolve(channel);
			}

			if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
				reject(new Error(`Realtime channel "${SCENES_CHANNEL}" status: ${status}`));
			}
		});
	});

const getDirectorChannel = () => {
	if (!directorChannelPromise) {
		directorChannelPromise = createSubscribedChannel();
	}

	return directorChannelPromise;
};

export const sendChangeScene = async (cameraId: string) => {
	const channel = await getDirectorChannel();

	return channel.send({
		type: 'broadcast',
		event: CHANGE_SCENE_EVENT,
		payload: { cameraId }
	});
};

export const onChangeScene = (callback: (cameraId: string) => void) => {
	const channel = supabase.channel(SCENES_CHANNEL, {
		config: { broadcast: { self: false } }
	});

	channel
		.on('broadcast', { event: CHANGE_SCENE_EVENT }, ({ payload }) => {
			const cameraId = payload?.cameraId;
			if (typeof cameraId === 'string' && cameraId.length > 0) {
				callback(cameraId);
			}
		})
		.subscribe();

	return () => {
		void channel.unsubscribe();
	};
};
