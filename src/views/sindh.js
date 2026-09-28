import { html, jsonScript } from '../lib/html.js';
import { sections } from '../content/prompts.js';
import { towns } from '../content/towns.js';
import { icon } from './icons.js';
import { dedicationList, layout, tierSummary, whatsappHref } from './layout.js';
import { sindhMap } from './map.js';

const families = (n) => `${n} ${n === 1 ? 'family' : 'families'}`;

const askPrompts = sections
  .filter((s) => s.id === 'vatan' || s.id === 'safar')
  .flatMap((s) => s.prompts.map((p) => p.en));

export function townShareText(config, town, count) {
  const url = `${config.publicUrl}/sindh/${town.slug}`;
  return count
    ? `🪔 ${families(count)} from ${town.name} are keeping their elders’ voices on ${config.appName}. Is your Dada or Nani from ${town.name} too? ${url}`
    : `🪔 Is your Dada or Nani from ${town.name}, Sindh? Keep their voice — their stories, lullabies and Sindhi words — free on ${config.appName}: ${url}`;
}

export function townPage(ctx, { town, count, counts, dedications, nearby, razorpayEnabled, dedicated }) {
  const { config } = ctx;
  const tiers = tierSummary(config.dedications.tiers);
  const shareText = townShareText(config, town, count);

  const body = html`
<section class="container town-hero">
  <a class="back-link" href="/sindh">← All of Sindh</a>
  <p class="kicker">${town.district} district · Sindh</p>
  <h1>${town.name}</h1>
  <p class="big-stat">${count
    ? html`<strong>${families(count)}</strong> keep their elders’ voices from ${town.name}`
    : html`Be the first family from ${town.name} to keep an elder’s voice here`}</p>
  <div class="hero-actions">
    <a class="btn btn-big" href="/?town=${town.slug}#start">${icon('mic')} Record your ${town.name} elder</a>
    <a class="btn btn-wa" href="${whatsappHref(shareText)}" target="_blank" rel="noopener">${icon('chat')} Share on WhatsApp</a>
    <button type="button" class="btn btn-ghost" data-share-card>${icon('share')} Share ${town.name}’s card</button>
  </div>
</section>

<section class="container town-grid">
  <div class="card map-card">${sindhMap({ counts, highlight: town.slug, compact: true })}</div>
  <div>
    ${dedicated ? html`<p class="notice">${icon('check')} Thank you. Your dedication is live on this page for ${config.dedications.days} days.</p>` : ''}
    ${dedications.length ? html`<h2>Remembered this week</h2>${dedicationList(dedications)}` : ''}
    <h2>Questions to ask your ${town.name} elders</h2>
    <ul class="ask-list">${askPrompts.map((q) => html`<li>${q}</li>`)}</ul>
    <p>Record their answers in their own voice — each one is a minute long, with the question shown in Roman Sindhi and Devanagari.</p>
  </div>
</section>

<section class="container section" id="dedicate">
  <div class="card dedicate-card">
    <h2>${icon('heart')} Dedicate this week in someone’s memory</h2>
    <p>Like sponsoring a bhandara, a dedication places one line — <em>“In loving memory of…”</em> — on the ${town.name} page for
      ${config.dedications.days} days. It keeps ${config.appName} free for every family.</p>
    ${razorpayEnabled
      ? html`<form id="dedicate-form" class="form" novalidate>
          <input type="hidden" name="townSlug" value="${town.slug}">
          <label class="field"><span class="label">In loving memory of</span>
            <input name="inMemoryOf" required maxlength="60" placeholder="e.g. Late Shri Mohandas Motwani" autocomplete="off"></label>
          <label class="field"><span class="label">From <em>(optional)</em></span>
            <input name="fromLine" maxlength="60" placeholder="e.g. The Motwani family, Pune" autocomplete="off"></label>
          <fieldset class="field">
            <legend>Where it appears</legend>
            ${tiers.map(
              (t, i) => html`<label class="tier"><input type="radio" name="tier" value="${t.id}" ${i === 0 ? 'checked' : ''}>
                <span><strong>${t.price}</strong> — ${t.label}<small>Shown ${t.placement}.</small></span></label>`,
            )}
          </fieldset>
          <div class="dedication-preview" aria-live="polite">
            <p class="kicker">Preview</p>
            <p class="dedication-line">In loving memory of <strong data-preview-name>…</strong></p>
            <p class="dedication-from" data-preview-from hidden></p>
          </div>
          <p class="hint">Pay with UPI, card or netbanking via Razorpay. The line goes live as soon as the payment succeeds.
            This pays for a dedication on the site; it is not a donation and not tax-deductible.
            Please keep it to names and places — no links or phone numbers.</p>
          <p class="form-error" role="alert" hidden></p>
          <button class="btn btn-big" type="submit">${icon('heart')} Pay &amp; dedicate</button>
        </form>`
      : html`<p class="hint">Dedications open soon.</p>`}
  </div>
</section>

<section class="container section">
  <h2>Towns near ${town.name}</h2>
  <ul class="town-chips">
    ${nearby.map((t) => html`<li><a href="/sindh/${t.slug}">${t.name}${counts.get(t.slug) ? html` <span>${counts.get(t.slug)}</span>` : ''}</a></li>`)}
  </ul>
</section>

<script type="application/json" id="town-data">${jsonScript({
    slug: town.slug,
    name: town.name,
    district: town.district,
    families: count,
    appName: config.appName,
    host: new URL(config.publicUrl).host,
    shareText,
  })}</script>`;

  return layout(ctx, {
    title: `${town.name}, Sindh — Sindhi families keeping their elders’ voices`,
    ogTitle: count ? `${families(count)} from ${town.name}, Sindh` : `${town.name}, Sindh`,
    description: `${count ? `${families(count)} from ${town.name} are` : `Families from ${town.name} can start`} keeping their Dada and Nani’s voices — memories of ${town.name}, the 1947 journey, lullabies, recipes and Sindhi words. Free, private, no app.`,
    path: `/sindh/${town.slug}`,
    body,
    scripts: ['town.js'],
    bodyClass: 'page-town',
  });
}

export function sindhIndexPage(ctx, { counts, featured, townName }) {
  const ranked = towns
    .filter((t) => counts.get(t.slug))
    .sort((a, b) => counts.get(b.slug) - counts.get(a.slug) || a.name.localeCompare(b.name));
  const total = [...counts.values()].reduce((a, b) => a + b, 0);

  const body = html`
<section class="container">
  <p class="kicker">The community map</p>
  <h1>Where our families come from</h1>
  <p class="lead">Every dot is a town in Sindh that a family here calls home. Families choose to be counted — we show
    only the town and a number, never names or voices.</p>
</section>

<section class="container map-layout">
  <div class="card map-card">${sindhMap({ counts })}</div>
  <div>
    ${ranked.length
      ? html`<h2>${families(total)} so far</h2>
        <ol class="rank-list">${ranked.slice(0, 12).map(
          (t) => html`<li><a href="/sindh/${t.slug}">${t.name}</a> <span>${families(counts.get(t.slug))}</span></li>`,
        )}</ol>`
      : html`<h2>The map is waiting for its first families</h2>
        <p>When you start a page, tick “Add our town to the community Sindh map” and your town lights up.</p>`}
    ${featured.length ? html`<h2>Remembered this week</h2>${dedicationList(featured, { showTown: true, townName })}` : ''}
    <a class="btn" href="/#start">${icon('mic')} Start a page for your elder</a>
  </div>
</section>

<section class="container section">
  <h2>Every town</h2>
  <ul class="town-index">
    ${towns.map((t) => html`<li><a href="/sindh/${t.slug}">${t.name}</a>${counts.get(t.slug) ? html` <span>${counts.get(t.slug)}</span>` : ''}</li>`)}
  </ul>
  <p class="hint">Don’t see your town or village? Choose “Other” when you start a page.</p>
</section>`;

  return layout(ctx, {
    title: 'Sindh map — where Sindhi families come from',
    description:
      'A community map of the towns in Sindh that Sindhi families trace their roots to — Shikarpur, Hyderabad, Karachi, Sukkur, Larkana and more — and the elders whose voices they keep.',
    path: '/sindh',
    body,
    bodyClass: 'page-sindh',
  });
}
