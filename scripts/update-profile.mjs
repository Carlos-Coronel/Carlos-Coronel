import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
const date = value => new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
export function validateSnapshot(snapshot, config) {
  if (!snapshot?.user || !Array.isArray(snapshot.repos) || snapshot.user.login?.toLowerCase() !== config.username.toLowerCase()) throw new Error('El usuario de la API no coincide con el perfil.');
  for (const field of ['public_repos', 'followers']) if (!Number.isSafeInteger(snapshot.user[field]) || snapshot.user[field] < 0) throw new Error(`Dato público inválido: ${field}`);
  for (const repo of snapshot.repos) {
    if (!repo.name || !Number.isSafeInteger(repo.stargazers_count) || repo.stargazers_count < 0 || (repo.pushed_at && !Number.isFinite(Date.parse(repo.pushed_at)))) throw new Error('Repositorio con datos incompletos.');
  }
  if (!Number.isFinite(Date.parse(snapshot.updatedAt))) throw new Error('Fecha de actualización inválida.');
}
export function activityMarkup(snapshot, config) {
  validateSnapshot(snapshot, config);
  const stars = snapshot.repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const reposLabel = `${snapshot.user.public_repos} ${snapshot.user.public_repos === 1 ? 'repositorio público' : 'repositorios públicos'}`;
  const starsLabel = `${stars} ${stars === 1 ? 'estrella recibida' : 'estrellas recibidas'}`;
  const followersLabel = `${snapshot.user.followers} ${snapshot.user.followers === 1 ? 'seguidor' : 'seguidores'}`;
  const recent = snapshot.repos.filter(repo => !repo.fork && repo.name.toLowerCase() !== config.username.toLowerCase() && repo.pushed_at).sort((a, b) => b.pushed_at.localeCompare(a.pushed_at)).slice(0, 3);
  const rows = recent.map(repo => `<li><a href="https://github.com/${encodeURIComponent(config.username)}/${encodeURIComponent(repo.name)}"><strong>${escapeHtml(repo.name)}</strong></a> — ${date(repo.pushed_at)}</li>`).join('\n');
  return `<p><strong>${reposLabel} · ${starsLabel} · ${followersLabel}</strong></p>\n\n<details>\n<summary><strong>Últimos proyectos actualizados</strong></summary>\n${recent.length ? `<ul>\n${rows}\n</ul>` : '<p>Sin actualizaciones públicas.</p>'}\n<p>Fechas del último push público de cada repositorio.</p>\n</details>\n\nDatos consultados el **${date(snapshot.updatedAt)}** (UTC). Actualización automática cada 6 horas.\n`;
}
export function replaceActivity(markdown, snapshot, config) {
  const start = '<!-- PROFILE:START -->', end = '<!-- PROFILE:END -->';
  if (markdown.split(start).length !== 2 || markdown.split(end).length !== 2 || markdown.indexOf(end) < markdown.indexOf(start)) throw new Error('El README debe contener un único bloque PROFILE válido.');
  const first = markdown.indexOf(start) + start.length, last = markdown.indexOf(end);
  return markdown.slice(0, first) + '\n' + activityMarkup(snapshot, config) + markdown.slice(last);
}
export function accentSvg() {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="70" viewBox="0 0 900 70"><style>:root{--a:#0c6658;--b:#6241a5;--c:#cbd6e2}@media(prefers-color-scheme:dark){:root{--a:#7bdcc6;--b:#bdaaf6;--c:#344459}}.trail{stroke-dasharray:6 22;animation:move 12s linear infinite}@keyframes move{to{stroke-dashoffset:-168}}@media(prefers-reduced-motion:reduce){.trail{animation:none}}</style><defs><linearGradient id="g"><stop stop-color="var(--a)"/><stop offset="1" stop-color="var(--b)"/></linearGradient></defs><path d="M0 35H170L195 15H340L365 55H535L560 15H705L730 35H900" fill="none" stroke="var(--c)" stroke-width="2"/><path class="trail" d="M0 35H170L195 15H340L365 55H535L560 15H705L730 35H900" fill="none" stroke="url(#g)" stroke-width="3"/><g fill="var(--a)"><circle cx="170" cy="35" r="5"/><circle cx="365" cy="55" r="5"/><circle cx="560" cy="15" r="5"/><circle cx="730" cy="35" r="5"/></g></svg>\n';
}
export async function fetchSnapshot(username, token = process.env.GITHUB_TOKEN, request = fetch) {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'Carlos-Coronel-profile' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const get = async pathname => {
    const response = await request(`https://api.github.com${pathname}`, { headers, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`La API de GitHub respondió ${response.status}. Se conservan los datos anteriores.`);
    return response.json();
  };
  const user = await get(`/users/${encodeURIComponent(username)}`), repos = [];
  for (let page = 1; ; page++) {
    const batch = await get(`/users/${encodeURIComponent(username)}/repos?type=owner&sort=updated&per_page=100&page=${page}`);
    if (!Array.isArray(batch)) throw new Error('Respuesta de repositorios no válida.');
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return { user, repos, updatedAt: new Date().toISOString() };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const config = JSON.parse(await readFile(path.join(root, 'profile.config.json'), 'utf8'));
  const markdown = await readFile(path.join(root, 'README.md'), 'utf8');
  const updated = replaceActivity(markdown, await fetchSnapshot(config.username), config);
  await mkdir(path.join(root, 'assets'), { recursive: true });
  await writeFile(path.join(root, 'assets/accent.svg'), accentSvg());
  await writeFile(path.join(root, 'README.md'), updated);
  console.log('Perfil actualizado: texto nativo y un adorno sin texto.');
}
