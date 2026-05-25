<script lang="ts">
import { onDestroy, onMount } from 'svelte';
import type { Camera } from '$lib/cameras';
import { deleteCamera, getCameras, insertCamera } from '$lib/services/db';
import { onChangeScene, sendChangeScene } from '$lib/services/realtime';
import { supabase } from '$lib/supabaseClient';

let cameras = $state<Camera[]>([]);
let liveCameraId = $state<string | null>(null);
let previewCameraId = $state<string | null>(null);
let sceneName = $state('');
let cameraUrl = $state('');
let mutedCameraIds = $state<Set<string>>(new Set());
let hiddenCameraIds = $state<Set<string>>(new Set());

const previewUrl = (url: string, muted: boolean) =>
`${url}${url.includes('?') ? '&' : '?'}clean&autoplay${muted ? '&muted' : ''}`;
let error = $state('');
let loadingCameras = $state(true);
let saving = $state(false);
let sending = $state(false);
let deletingCameraId = $state<string | null>(null);
let directorUserId = $state<string | null>(null);
let copiedCameraId = $state<string | null>(null);
let copiedTimeout: ReturnType<typeof setTimeout> | null = null;

const syncSceneState = () => {
if (!cameras.some((camera) => camera.id === previewCameraId)) {
previewCameraId = cameras[0]?.id ?? null;
}

if (!cameras.some((camera) => camera.id === liveCameraId)) {
liveCameraId = null;
}
};

const loadCameras = async () => {
loadingCameras = true;
error = '';

try {
cameras = await getCameras();
syncSceneState();
} catch {
error = 'No se pudo cargar la lista de cámaras.';
} finally {
loadingCameras = false;
}
};

const handleAddCamera = async (event: SubmitEvent) => {
event.preventDefault();

const name = sceneName.trim();
const url = cameraUrl.trim();

if (!name || !url) {
return;
}

error = '';
saving = true;

try {
const camera = await insertCamera(name, url);
cameras = [...cameras, camera];
sceneName = '';
cameraUrl = '';
syncSceneState();
} catch {
error = 'No se pudo añadir la cámara.';
} finally {
saving = false;
}
};

const handleDeleteCamera = async (cameraId: string) => {
deletingCameraId = cameraId;
error = '';

try {
await deleteCamera(cameraId);
cameras = cameras.filter((camera) => camera.id !== cameraId);
mutedCameraIds = new Set([...mutedCameraIds].filter((id) => id !== cameraId));
hiddenCameraIds = new Set([...hiddenCameraIds].filter((id) => id !== cameraId));
syncSceneState();
} catch {
error = 'No se pudo eliminar la cámara.';
} finally {
deletingCameraId = null;
}
};

const handleSendToAir = async (cameraId: string) => {
if (!cameras.some((camera) => camera.id === cameraId)) {
return;
}

error = '';
sending = true;

try {
const sendStatus = await sendChangeScene(cameraId);
if (sendStatus !== 'ok') {
error = 'No se pudo mandar la cámara al aire.';
return;
}

liveCameraId = cameraId;
previewCameraId = cameraId;
} catch {
error = 'No se pudo conectar al canal de transmisión en tiempo real.';
} finally {
sending = false;
}
};

const resetCopiedState = () => {
if (copiedTimeout) {
clearTimeout(copiedTimeout);
copiedTimeout = null;
}
copiedCameraId = null;
};

const handleCopyViewUrl = async (cameraId: string) => {
if (!directorUserId || typeof window === 'undefined' || !navigator.clipboard) {
error = 'No se pudo copiar el enlace de vista.';
return;
}

try {
const url = new URL(`/view/${directorUserId}`, window.location.origin).toString();
await navigator.clipboard.writeText(url);
error = '';
copiedCameraId = cameraId;
if (copiedTimeout) {
clearTimeout(copiedTimeout);
}
copiedTimeout = setTimeout(() => {
copiedCameraId = null;
copiedTimeout = null;
}, 1500);
} catch {
error = 'No se pudo copiar el enlace de vista.';
}
};

const handleSelectPreview = (cameraId: string) => {
if (!cameras.some((camera) => camera.id === cameraId)) {
return;
}

previewCameraId = cameraId;
};

const toggleMuted = (cameraId: string) => {
const nextMuted = new Set(mutedCameraIds);
if (nextMuted.has(cameraId)) {
nextMuted.delete(cameraId);
} else {
nextMuted.add(cameraId);
}
mutedCameraIds = nextMuted;
};

const toggleHidden = (cameraId: string) => {
const nextHidden = new Set(hiddenCameraIds);
if (nextHidden.has(cameraId)) {
nextHidden.delete(cameraId);
} else {
nextHidden.add(cameraId);
}
hiddenCameraIds = nextHidden;
};

const handleGridShortcut = (event: KeyboardEvent) => {
if ((event.target as HTMLElement)?.closest('input, textarea, select, button')) {
return;
}
if (!cameras.length || event.metaKey || event.ctrlKey || event.altKey) {
return;
}

const index = Number.parseInt(event.key, 10);
if (Number.isInteger(index) && index > 0 && index <= cameras.length) {
void handleSendToAir(cameras[index - 1].id);
return;
}

if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
return;
}

event.preventDefault();
const anchorId = liveCameraId ?? previewCameraId;
const currentIndex = cameras.findIndex((camera) => camera.id === anchorId);
const fallbackIndex = currentIndex === -1 ? 0 : currentIndex;
const nextIndex =
event.key === 'ArrowRight'
? (fallbackIndex + 1) % cameras.length
: (fallbackIndex - 1 + cameras.length) % cameras.length;
void handleSendToAir(cameras[nextIndex].id);
};

let unsubscribe: (() => void) | null = null;

onMount(async () => {
window.addEventListener('keydown', handleGridShortcut);
void loadCameras();
const {
data: { user }
} = await supabase.auth.getUser();
if (user) {
directorUserId = user.id;
unsubscribe = onChangeScene(user.id, (cameraId) => {
liveCameraId = cameraId;
});
}
});

onDestroy(() => {
if (typeof window !== 'undefined') {
window.removeEventListener('keydown', handleGridShortcut);
}
resetCopiedState();
unsubscribe?.();
});
</script>

<main class="director-panel">
<h1>Panel de Control del Director</h1>

<form class="camera-form" onsubmit={handleAddCamera}>
<label>
<span>Nombre de la Escena</span>
<input
type="text"
bind:value={sceneName}
placeholder="Ej. Cámara principal"
required
/>
</label>

<label>
<span>URL de VDO.Ninja</span>
<input
type="url"
bind:value={cameraUrl}
placeholder="https://vdo.ninja/?view=..."
required
/>
</label>

<button type="submit" disabled={saving}>{saving ? 'Añadiendo...' : 'Añadir'}</button>
</form>

{#if error}
<p class="error-message">{error}</p>
{/if}
<p class="shortcut-help">
Atajos: teclas <strong>1-9</strong> para mandar una escena al aire, y <strong>← / →</strong> para navegar.
</p>

<section class="camera-grid">
{#if loadingCameras}
<p class="status-message">Cargando cámaras...</p>
{:else if cameras.length === 0}
<p class="status-message">Todavía no hay cámaras registradas.</p>
{:else}
<p class="status-message">
Haz clic en una tarjeta para ponerla en vista previa y luego vuelve a pulsar su botón para
mandarla al aire.
</p>
{/if}

{#each cameras as camera (camera.id)}
<div
class="camera-card"
class:on-air={liveCameraId === camera.id}
class:in-preview={previewCameraId === camera.id}
onclick={() => handleSelectPreview(camera.id)}
onkeydown={(event) => {
if (event.key === 'Enter' || event.key === ' ') {
event.preventDefault();
handleSelectPreview(camera.id);
}
}}
role="button"
tabindex="0"
aria-pressed={previewCameraId === camera.id}
aria-label={`Seleccionar ${camera.name} para vista previa`}
>
<header class="camera-card-header">
<h2>{camera.name}</h2>
<div class="camera-state-badges">
{#if liveCameraId === camera.id}
<span class="state-badge on-air-badge">EN VIVO</span>
{/if}
{#if previewCameraId === camera.id}
<span class="state-badge preview-badge">VISTA PREVIA</span>
{/if}
</div>
<button
type="button"
class="copy-button"
aria-label="Copiar enlace de la escena"
title={copiedCameraId === camera.id ? '¡Copiado!' : 'Copiar URL para el invitado / OBS'}
onclick={(event) => {
event.stopPropagation();
void handleCopyViewUrl(camera.id);
}}
>
<span class="copy-icon" aria-hidden="true">
{#if copiedCameraId === camera.id}✅{:else}📋{/if}
</span>
</button>
<button
type="button"
class="delete-button"
aria-label={`Eliminar ${camera.name}`}
title="Eliminar"
disabled={deletingCameraId === camera.id}
onclick={(event) => {
event.stopPropagation();
handleDeleteCamera(camera.id);
}}
>
🗑️
</button>
</header>

<div class="video-tile">
{#if hiddenCameraIds.has(camera.id)}
<div class="hidden-state" aria-live="polite">Feed oculto</div>
{:else}
<iframe
title={`Previo de ${camera.name}`}
src={previewUrl(camera.url, mutedCameraIds.has(camera.id))}
loading="lazy"
allow="camera; microphone; autoplay; fullscreen; display-capture"
></iframe>
{/if}
<div class="camera-toolbar">
<button
type="button"
class="tool-button"
onclick={(event) => {
event.stopPropagation();
toggleMuted(camera.id);
}}
>
{mutedCameraIds.has(camera.id) ? '🔇 Muted' : '🔊 Audio'}
</button>
<button
type="button"
class="tool-button"
onclick={(event) => {
event.stopPropagation();
toggleHidden(camera.id);
}}
>
{hiddenCameraIds.has(camera.id) ? '👁️ Mostrar' : '🙈 Ocultar'}
</button>
<button
type="button"
class="tool-button primary-tool-button"
onclick={(event) => {
event.stopPropagation();
if (previewCameraId === camera.id) {
void handleSendToAir(camera.id);
return;
}

handleSelectPreview(camera.id);
}}
disabled={sending}
>
{#if liveCameraId === camera.id}
En vivo ahora
{:else if previewCameraId === camera.id}
Mandar al Aire
{:else}
Poner en Vista previa
{/if}
</button>
</div>
</div>
</div>
{/each}
</section>
</main>

<style>
.director-panel {
padding: 1.5rem;
}

h1 {
margin: 0 0 1rem;
}

.camera-form {
display: grid;
grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
gap: 0.75rem;
margin-bottom: 1rem;
align-items: end;
}

.camera-form label {
display: grid;
gap: 0.35rem;
font-size: 0.95rem;
font-weight: 600;
}

.camera-form input {
font: inherit;
padding: 0.65rem 0.75rem;
border-radius: 0.5rem;
border: 1px solid #cbd5e1;
}

.camera-grid {
display: grid;
grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
gap: 1rem;
width: 100%;
}

.camera-card {
border: 4px solid #d1d5db;
border-radius: 0.75rem;
padding: 1rem;
display: grid;
gap: 0.75rem;
background: #fff;
cursor: pointer;
transition:
border-color 0.2s ease,
box-shadow 0.2s ease,
transform 0.2s ease;
}

.camera-card.on-air {
border-color: #dc2626;
box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.2);
}

.camera-card.in-preview {
border-color: #facc15;
box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.25);
}

.camera-card.on-air.in-preview {
border-color: #dc2626;
box-shadow:
0 0 0 4px rgba(220, 38, 38, 0.2),
0 0 0 8px rgba(250, 204, 21, 0.18);
}

.camera-card:hover,
.camera-card:focus-visible {
transform: translateY(-1px);
}

.camera-card:focus-visible {
outline: none;
}

.camera-card-header {
display: flex;
align-items: start;
justify-content: space-between;
gap: 0.75rem;
}

h2 {
margin: 0;
font-size: 1.2rem;
}

.camera-state-badges {
display: flex;
flex-wrap: wrap;
justify-content: end;
gap: 0.35rem;
margin-left: auto;
}

.state-badge {
padding: 0.2rem 0.55rem;
border-radius: 999px;
font-size: 0.75rem;
font-weight: 700;
white-space: nowrap;
}

.on-air-badge {
background: #dc2626;
color: #fff;
}

.preview-badge {
background: #fef08a;
color: #854d0e;
}

.video-tile {
position: relative;
aspect-ratio: 16 / 9;
overflow: hidden;
border-radius: 0.6rem;
}

iframe,
.hidden-state {
width: 100%;
height: 100%;
border: 1px solid #cbd5e1;
border-radius: 0.5rem;
background: #0f172a;
}

.hidden-state {
display: grid;
place-items: center;
color: #e2e8f0;
font-weight: 700;
}

.camera-toolbar {
position: absolute;
left: 0.5rem;
right: 0.5rem;
bottom: 0.5rem;
display: flex;
gap: 0.45rem;
flex-wrap: wrap;
opacity: 0;
transform: translateY(0.35rem);
transition: opacity 0.15s ease, transform 0.15s ease;
pointer-events: none;
}

.video-tile:hover .camera-toolbar,
.video-tile:focus-within .camera-toolbar {
opacity: 1;
transform: translateY(0);
pointer-events: auto;
}

button {
font: inherit;
border-radius: 0.65rem;
cursor: pointer;
}

.tool-button {
font-size: 0.86rem;
font-weight: 700;
padding: 0.45rem 0.55rem;
border: 1px solid rgba(148, 163, 184, 0.9);
background: rgba(15, 23, 42, 0.85);
color: #fff;
backdrop-filter: blur(2px);
}

.primary-tool-button {
border-color: #0f172a;
background: #0f172a;
}

.delete-button {
display: inline-grid;
place-items: center;
width: 2rem;
height: 2rem;
padding: 0;
border: 1px solid #cbd5e1;
background: #fff;
font-size: 1rem;
}

.copy-button {
display: inline-grid;
place-items: center;
width: 2rem;
height: 2rem;
padding: 0;
border: 1px solid #cbd5e1;
background: #fff;
color: #64748b;
transition: background-color 0.15s ease;
}

.copy-button:hover,
.copy-button:focus-visible {
background: #e2e8f0;
}

.copy-button:focus-visible {
outline: 2px solid #0f172a;
outline-offset: 2px;
}

.copy-icon {
font-size: 1rem;
line-height: 1;
}

button:disabled {
opacity: 0.65;
cursor: not-allowed;
}

.error-message {
margin: 0 0 1rem;
color: #b91c1c;
}

.status-message {
margin: 0;
color: #475569;
}

.shortcut-help {
margin: 0 0 1rem;
font-size: 0.92rem;
color: #334155;
}

@media (max-width: 760px) {
.camera-toolbar {
position: static;
margin-top: 0.45rem;
opacity: 1;
transform: none;
pointer-events: auto;
}
}
</style>
