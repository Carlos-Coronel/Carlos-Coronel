import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { replaceActivity, fetchSnapshot, accentSvg } from './update-profile.mjs';
const config = { username: 'Carlos-Coronel' };
const snapshot = { user: { login: config.username, public_repos: 1, followers: 2 }, repos: [{ name: 'A<&"', stargazers_count: 3, fork: false, pushed_at: '2026-01-02T00:00:00Z' }], updatedAt: '2026-01-03T00:00:00Z' };
const template = 'Texto anterior\n<!-- PROFILE:START -->\nAnterior\n<!-- PROFILE:END -->\nTexto posterior';

test('actualiza solo el bloque de datos y escapa nombres externos', () => {
  const result = replaceActivity(template, snapshot, config);
  assert.ok(result.startsWith('Texto anterior\n<!-- PROFILE:START -->'));
  assert.ok(result.endsWith('<!-- PROFILE:END -->\nTexto posterior'));
  assert.match(result, /A&lt;&amp;&quot;/);
  assert.match(result, /3 estrellas recibidas/);
  assert.doesNotMatch(result, /<img|<script|<iframe/);
  assert.equal(replaceActivity(result, snapshot, config), result);
});
test('rechaza marcadores duplicados y datos incompletos antes de escribir', () => {
  assert.throws(() => replaceActivity(template + '<!-- PROFILE:START -->', snapshot, config), /único bloque/);
  assert.throws(() => replaceActivity(template, { ...snapshot, user: { ...snapshot.user, followers: undefined } }, config), /Dato público inválido/);
});
test('el contenido y las acciones son texto nativo; el único SVG es decorativo', async () => {
  const markdown = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  assert.equal((markdown.match(/<img/g) || []).length, 1);
  assert.match(markdown, /src="assets\/accent.svg"[^>]+alt=""/);
  assert.equal((markdown.match(/<details>/g) || []).length, 6);
  assert.doesNotMatch(markdown, /<button|<iframe|<script|<picture/);
  const svg = accentSvg();
  assert.doesNotMatch(svg, /<text|<foreignObject|<script|https:\/\//);
  assert.match(svg, /prefers-reduced-motion/);
});
test('recorre todas las páginas de repositorios públicos', async () => {
  const calls = [];
  const request = async url => { calls.push(url); return { ok: true, json: async () => !url.includes('/repos?') ? snapshot.user : url.endsWith('page=1') ? Array(100).fill(snapshot.repos[0]) : [snapshot.repos[0]] }; };
  const result = await fetchSnapshot(config.username, undefined, request);
  assert.equal(result.repos.length, 101);
  assert.match(calls[2], /type=owner.*page=2$/);
});
test('un error de red no reemplaza los datos por ceros', async () => {
  await assert.rejects(fetchSnapshot(config.username, undefined, async () => ({ ok: false, status: 403 })), /403/);
});
