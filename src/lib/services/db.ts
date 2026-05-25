import { supabase } from '$lib/supabaseClient';
import type { Camera } from '$lib/cameras';

export const getCameras = async (): Promise<Camera[]> => {
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error('No hay un usuario autenticado.');
	}

	const { data, error } = await supabase
		.from('cameras')
		.select('id, name, url')
		.eq('user_id', user.id);

	if (error) {
		throw new Error(error.message);
	}

	return data ?? [];
};

export const insertCamera = async (name: string, url: string): Promise<Camera> => {
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error('No hay un usuario autenticado.');
	}

	const { data, error } = await supabase
		.from('cameras')
		.insert({ name, url, user_id: user.id })
		.select('id, name, url')
		.single();

	if (error) {
		throw new Error(error.message);
	}

	return data;
};

export const deleteCamera = async (id: string): Promise<void> => {
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error('No hay un usuario autenticado.');
	}

	const { error } = await supabase
		.from('cameras')
		.delete()
		.eq('id', id)
		.eq('user_id', user.id);

	if (error) {
		throw new Error(error.message);
	}
};
