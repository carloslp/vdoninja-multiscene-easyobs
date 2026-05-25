import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '$lib/supabaseClient';

const CHANGE_SCENE_EVENT = 'change-scene';
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

export const sendChangeScene = async (cameraId: string) => {
	const channel = await getDirectorChannel();

	return channel.send({
		type: 'broadcast',
		event: CHANGE_SCENE_EVENT,
		payload: { cameraId }
	});
};

export const onChangeScene = (userId: string, callback: (cameraId: string) => void) => {
	const channel = supabase.channel(scenesChannel(userId), {
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
