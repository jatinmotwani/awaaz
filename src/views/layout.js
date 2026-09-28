import { html } from '../lib/html.js';
import { formatRupees } from '../lib/text.js';
import { icon, logo } from './icons.js';

export function layout(ctx, { title, description, path = '/', noindex = false, body, scripts = [], bodyClass = '', ogTitle }) {
  const { config, assetVersion } = ctx;
  const v = assetVersion;
  const fullTitle = title ? `${title} · ${config.appName}` : `${config.appName} — keep your Sindhi elders’ voices`;
  const url = `${config.publicUrl}${path}`;

  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${fullTitle}</title>
<meta name="description" content="${description}">
${noindex ? html`<meta name="robots" content="noindex, nofollow">` : html`<link rel="canonical" href="${url}">`}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${config.appName}">
<meta property="og:title" content="${ogTitle || fullTitle}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${config.publicUrl}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#a3212a">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600&display=swap">
<link rel="stylesheet" href="/css/app.css?v=${v}">
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
<div class="ajrak" aria-hidden="true"></div>
<header class="site-header">
  <a class="brand" href="/">${logo}<span>${config.appName}</span></a>
  <nav class="site-nav" aria-label="Main">
    <a href="/sindh">${icon('pin', { size: 16 })} Sindh map</a>
    <a class="btn btn-small" href="/#start">Start a page</a>
  </nav>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="ajrak ajrak-thin" aria-hidden="true"></div>
  <div class="footer-inner">
    <p class="footer-lead"><strong>${config.appName}</strong> is free for families, forever. No ads, no app, no login.
      We never sell or license anyone’s voice.</p>
    ${config.sponsor.text
      ? html`<p class="sponsor">Heritage sponsor: ${config.sponsor.url
        ? html`<a href="${config.sponsor.url}" rel="noopener sponsored" target="_blank">${config.sponsor.text}</a>`
        : config.sponsor.text}</p>`
      : ''}
    <p class="footer-links"><a href="/privacy">Privacy &amp; promises</a> · <a href="/sindh">Sindh map</a> · <a href="/#start">Start a page</a></p>
  </div>
</footer>
${scripts.map((s) => html`<script type="module" src="/js/${s}?v=${v}"></script>`)}
<script type="module" src="/js/sw-register.js?v=${v}"></script>
</body>
</html>`;
}

export function whatsappHref(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function whatsappButton(text, label = 'Share to family WhatsApp', extraClass = '') {
  return html`<a class="btn btn-wa ${extraClass}" href="${whatsappHref(text)}" target="_blank" rel="noopener">
    ${icon('chat')} ${label}</a>`;
}

export function dedicationList(dedications, { showTown = false, townName = (slug) => slug } = {}) {
  if (!dedications.length) return '';
  return html`<ul class="dedications">
    ${dedications.map(
      (d) => html`<li class="dedication${d.tier === 'featured' ? ' is-featured' : ''}">
        <span class="diya" aria-hidden="true">🪔</span>
        <div>
          <p class="dedication-line">In loving memory of <strong>${d.in_memory_of}</strong></p>
          ${d.from_line ? html`<p class="dedication-from">— ${d.from_line}</p>` : ''}
          ${showTown ? html`<p class="dedication-town"><a href="/sindh/${d.town_slug}">${townName(d.town_slug)}</a></p>` : ''}
        </div>
      </li>`,
    )}
  </ul>`;
}

export const tierSummary = (tiers) =>
  Object.entries(tiers).map(([id, tier]) => ({ id, ...tier, price: formatRupees(tier.amountPaise) }));
