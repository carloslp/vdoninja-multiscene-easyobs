import { browser } from '$app/environment';
import { readable } from 'svelte/store';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '$lib/supabaseClient';

type AuthState = {
user: User | null;
session: Session | null;
loading: boolean;
};

const initialState: AuthState = {
user: null,
session: null,
loading: true
};

export const auth = readable<AuthState>(initialState, (set) => {
if (!browser) {
set({ ...initialState, loading: false });
return;
}

let active = true;

const updateState = (session: Session | null) => {
if (!active) {
return;
}

set({
session,
user: session?.user ?? null,
loading: false
});
};

supabase.auth
.getSession()
.then(({ data: { session } }) => {
updateState(session);
})
.catch(() => {
updateState(null);
});

const {
data: { subscription }
} = supabase.auth.onAuthStateChange((_event, session) => {
updateState(session);
});

return () => {
active = false;
subscription.unsubscribe();
};
});
