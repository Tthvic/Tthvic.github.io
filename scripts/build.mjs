import { readFile, writeFile, mkdir, cp, access } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const outputRoot = resolve(projectRoot, 'dist');
const assetRoot = resolve(projectRoot, 'assets');

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

function externalUrl(value) {
  const parsed = new URL(value);
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error(`Unsupported link: ${value}`);
  return escapeHtml(value);
}

function localAsset(value) {
  if (!value || value.includes('\\')) throw new Error(`Invalid asset path: ${value}`);
  const path = resolve(assetRoot, value);
  if (!path.startsWith(assetRoot + sep)) throw new Error(`Asset outside assets/: ${value}`);
  return path;
}

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

export async function build({ requireImages = false } = {}) {
  const [profile, publications, template] = await Promise.all([
    readFile(resolve(projectRoot, 'content/profile.json'), 'utf8').then(JSON.parse),
    readFile(resolve(projectRoot, 'content/publications.json'), 'utf8').then(JSON.parse),
    readFile(resolve(projectRoot, 'src/page.html'), 'utf8')
  ]);
  if (!profile.name || !profile.email || !Array.isArray(profile.bio)) throw new Error('Incomplete profile.');
  const seen = new Set();
  for (const paper of publications) {
    if (!paper.id || seen.has(paper.id)) throw new Error(`Missing or duplicate publication id: ${paper.id}`);
    seen.add(paper.id);
    if (!paper.title || !Number.isInteger(paper.year) || !paper.authors?.length) throw new Error(`Incomplete publication: ${paper.id}`);
    if (!paper.authors.some(author => profile.authorNames.includes(author.name))) throw new Error(`Your name is missing from ${paper.id}.`);
    externalUrl(paper.paper);
    if (paper.code) externalUrl(paper.code);
    paper.hasImage = paper.image ? await exists(localAsset(paper.image)) : false;
    if (requireImages && !paper.hasImage) throw new Error(`Missing publication image: ${paper.id}`);
  }
  publications.sort((a, b) => b.year - a.year || (a.order ?? 999) - (b.order ?? 999) || a.title.localeCompare(b.title));
  const updatedDates = [profile.updatedAt, ...publications.map(paper => paper.updatedAt)].filter(Boolean);
  for (const date of updatedDates) if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new Error(`Invalid updatedAt: ${date}`);
  const updated = updatedDates.sort().at(-1);
  if (!updated) throw new Error('Add an updatedAt date to the profile.');
  const updatedLabel = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(updated + 'T00:00:00Z'));
  const icons = {
    paper: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 20"/>',
    scholar: '<path d="m2 9 10-5 10 5-10 5zM6 11v6c4 3 8 3 12 0v-6M22 9v7"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'
  };
  const icon = name => `<svg class="jl-icon jl-icon-${name}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icons[name]}</svg>`;
  const outLink = (url, label, symbol) => `<a href="${externalUrl(url)}" target="_blank" rel="noopener noreferrer">${symbol ? icon(symbol) : ''}${escapeHtml(label)}</a>`;
  const authorMarkup = author => {
    const marks = `${author.equal ? '<sup>*</sup>' : ''}${author.corresponding ? '<sup>†</sup>' : ''}`;
    return profile.authorNames.includes(author.name)
      ? `<strong class="jl-me">${escapeHtml(author.name)}${marks}</strong>`
      : escapeHtml(author.name) + marks;
  };
  function paperMarkup(paper, base) {
    const picture = paper.hasImage ? `<a class="jl-picture-link" href="${externalUrl(paper.paper)}" target="_blank" rel="noopener noreferrer" aria-label="Read ${escapeHtml(paper.title)}"><img src="${base}assets/${escapeHtml(paper.image)}" alt="${escapeHtml(paper.imageAlt || paper.title)}" width="624" height="416" loading="lazy" decoding="async"></a>` : '';
    return `<article class="jl-work${paper.hasImage ? '' : ' no-figure'}" id="${escapeHtml(paper.id)}">
      ${picture}<div class="jl-work-text">
        <p class="jl-venue"><span class="jl-venue-name">${escapeHtml(paper.venue)}</span></p>
        <h3>${outLink(paper.paper, paper.title)}</h3>
        <p class="jl-authors">${paper.authors.map(authorMarkup).join(', ')}</p>
        ${paper.summary ? `<p class="jl-summary">${escapeHtml(paper.summary)}</p>` : ''}
        <div class="jl-links">${outLink(paper.paper, 'Paper', 'paper')}${paper.code ? outLink(paper.code, 'Code', 'code') : ''}</div>
      </div></article>`;
  }
  const legend = '<p class="jl-legend">* Equal contribution &nbsp; † Corresponding author</p>';
  function publicationSection(base, archive = false) {
    const papers = archive ? publications : publications.filter(paper => paper.selected);
    let entries = '';
    let year;
    for (const paper of papers) {
      if (archive && year !== paper.year) {
        year = paper.year;
        entries += `<h2 class="jl-year-heading">${year}</h2>`;
      }
      entries += paperMarkup(paper, base);
    }
    return `<section class="jl-publications" aria-labelledby="publications-heading"><div class="jl-section-head">
      ${archive ? '<h1 id="publications-heading">Publications</h1>' : '<h2 id="publications-heading">Publications</h2><a class="jl-view-all" href="publications/">View all publications →</a>'}
      </div>${entries}${legend}</section>`;
  }
  const profileMarkup = `<section class="jl-profile" aria-label="About ${escapeHtml(profile.name)}">
    <div class="jl-identity"><p class="jl-greeting">Hello, I'm</p>
      <h1>${escapeHtml(profile.name)}<span class="jl-name-dot" aria-hidden="true">.</span></h1>
      <p class="jl-role">${escapeHtml(profile.role)}</p>
      <p class="jl-affiliation">${escapeHtml(profile.affiliation)}</p>
    </div><div class="jl-about-copy"><h2 class="jl-about-label">A little about me</h2>
      ${profile.bio.map(paragraph => `<p class="jl-bio">${escapeHtml(paragraph)}</p>`).join('')}
      <div class="jl-contact">${outLink(profile.scholar, 'Google Scholar', 'scholar')}<a href="mailto:${escapeHtml(profile.email)}">${icon('mail')}Email</a></div>
    </div></section>`;
  const favicon = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="13" fill="#206c65"/><text x="32" y="45" text-anchor="middle" font-family="Georgia,serif" font-size="38" fill="#ffffff">JL</text></svg>');
  function renderPage(archive = false) {
    const base = archive ? '../' : '';
    const values = {
      TITLE: escapeHtml(archive ? `Publications | ${profile.name}` : `${profile.name} | Academic Homepage`),
      DESCRIPTION: escapeHtml(profile.description), NAME: escapeHtml(profile.name), EMAIL: escapeHtml(profile.email),
      VIEW: archive ? 'publications' : 'home', BASE: base, HOME: base || './', PUBLICATIONS: archive ? './' : 'publications/',
      HOME_CURRENT: archive ? '' : 'aria-current="page"', PUB_CURRENT: archive ? 'aria-current="page"' : '',
      FAVICON: escapeHtml(favicon), UPDATED_ISO: updated, UPDATED_LABEL: updatedLabel,
      BODY: archive ? publicationSection(base, true) : profileMarkup + publicationSection(base)
    };
    return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
      if (!(key in values)) throw new Error(`Unknown template slot: ${key}`);
      return values[key];
    });
  }
  await mkdir(resolve(outputRoot, 'assets'), { recursive: true });
  await mkdir(resolve(outputRoot, 'publications'), { recursive: true });
  await mkdir(resolve(assetRoot, 'papers'), { recursive: true });
  await cp(assetRoot, resolve(outputRoot, 'assets'), { recursive: true });
  await Promise.all([
    writeFile(resolve(outputRoot, 'index.html'), renderPage()),
    writeFile(resolve(outputRoot, 'publications/index.html'), renderPage(true)),
    cp(resolve(projectRoot, 'src/styles.css'), resolve(outputRoot, 'assets/styles.css')),
    writeFile(resolve(outputRoot, '.nojekyll'), '')
  ]);
  return { publications: publications.length, images: publications.filter(paper => paper.hasImage).length, updated };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await build({ requireImages: process.argv.includes('--require-images') });
  console.log(`Built homepage and publications: ${result.publications} papers, ${result.images} images. Last updated ${result.updated}.`);
}
