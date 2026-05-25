<script lang="ts">
import VDONinjaPlayer from '$lib/components/VDONinjaPlayer.svelte';

type DirectorFeed = {
id: string;
name: string;
url: string;
description: string;
};

let feeds = $state<DirectorFeed[]>([
{
id: 'cam-1',
name: 'Cámara Principal',
url: 'https://vdo.ninja/?view=demo-cam-1',
description: 'Plano general del estudio'
},
{
id: 'cam-2',
name: 'Invitado',
url: 'https://vdo.ninja/?view=demo-cam-2',
description: 'Primer plano del invitado'
},
{
id: 'cam-3',
name: 'Escritorio',
url: 'https://vdo.ninja/?view=demo-cam-3',
description: 'Captura secundaria para apoyo visual'
},
{
id: 'cam-4',
name: 'Backstage',
url: 'https://vdo.ninja/?view=demo-cam-4',
description: 'Vista técnica para coordinación interna'
}
]);
let programFeedId = $state(feeds[0]?.id ?? '');

const takeToProgram = (feedId: string) => {
programFeedId = feedId;
};
</script>

<main class="director-panel">
<header class="page-header">
<div>
<p class="eyebrow">/director</p>
<h1>Interfaz del Director</h1>
<p class="page-copy">
Multiviewer con feeds de prueba de VDO.Ninja para previsualizar todas las cámaras y
enviar una de ellas a Program.
</p>
</div>
<div class="program-summary" aria-live="polite">
<span class="summary-label">Program</span>
<strong>{feeds.find((feed) => feed.id === programFeedId)?.name}</strong>
</div>
</header>

<section class="camera-grid" aria-label="Cuadrícula del multiviewer">
{#each feeds as feed (feed.id)}
<article class="camera-card" class:on-air={programFeedId === feed.id}>
<div class="camera-card-header">
<div class="camera-copy">
<div class="camera-title-row">
<h2>{feed.name}</h2>
{#if programFeedId === feed.id}
<span class="state-badge on-air-badge">PROGRAM</span>
{/if}
</div>
<p>{feed.description}</p>
</div>

<button
type="button"
class="take-button"
aria-pressed={programFeedId === feed.id}
onclick={() => takeToProgram(feed.id)}
>
{programFeedId === feed.id ? 'En Program' : 'Take / Enviar a Salida'}
</button>
</div>

<VDONinjaPlayer title={`Feed de ${feed.name}`} url={feed.url} muted={true} />
</article>
{/each}
</section>
</main>

<style>
.director-panel {
padding: 1.5rem;
display: grid;
gap: 1.5rem;
}

.page-header {
display: flex;
flex-wrap: wrap;
justify-content: space-between;
gap: 1rem;
align-items: end;
}

.eyebrow {
margin: 0 0 0.35rem;
font-size: 0.85rem;
font-weight: 700;
letter-spacing: 0.08em;
text-transform: uppercase;
color: #dc2626;
}

h1,
h2,
.page-copy,
.camera-copy p,
.summary-label {
margin: 0;
}

h1 {
margin-bottom: 0.5rem;
}

.page-copy {
max-width: 55rem;
color: #475569;
}

.program-summary {
min-width: 12rem;
padding: 0.9rem 1rem;
border-radius: 0.85rem;
background: #111827;
color: #fff;
display: grid;
gap: 0.25rem;
}

.summary-label {
font-size: 0.75rem;
font-weight: 700;
letter-spacing: 0.08em;
text-transform: uppercase;
color: #fca5a5;
}

.camera-grid {
display: grid;
grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
gap: 1rem;
}

.camera-card {
display: grid;
gap: 0.9rem;
padding: 1rem;
border: 3px solid #cbd5e1;
border-radius: 1rem;
background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
box-shadow: 0 18px 35px -30px rgba(15, 23, 42, 0.6);
}

.camera-card.on-air {
border-color: #dc2626;
box-shadow:
0 0 0 4px rgba(220, 38, 38, 0.18),
0 18px 35px -30px rgba(15, 23, 42, 0.6);
}

.camera-card-header,
.camera-title-row {
display: flex;
align-items: start;
justify-content: space-between;
gap: 0.75rem;
}

.camera-copy {
display: grid;
gap: 0.35rem;
}

.camera-copy p {
color: #475569;
}

.state-badge {
padding: 0.25rem 0.6rem;
border-radius: 999px;
font-size: 0.75rem;
font-weight: 700;
white-space: nowrap;
}

.on-air-badge {
background: #dc2626;
color: #fff;
}

button {
font: inherit;
cursor: pointer;
}

.take-button {
border: 0;
border-radius: 0.75rem;
padding: 0.8rem 1rem;
font-weight: 700;
background: #111827;
color: #fff;
transition:
transform 0.15s ease,
background-color 0.15s ease;
}

.take-button:hover,
.take-button:focus-visible {
background: #dc2626;
transform: translateY(-1px);
}

.take-button[aria-pressed='true'] {
background: #dc2626;
}

.take-button:focus-visible {
outline: 3px solid rgba(220, 38, 38, 0.2);
outline-offset: 2px;
}

@media (max-width: 640px) {
.camera-card-header {
flex-direction: column;
}

.take-button {
width: 100%;
}
}
</style>
