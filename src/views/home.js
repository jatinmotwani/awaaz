import { html } from '../lib/html.js';
import { sections, relations } from '../content/prompts.js';
import { towns } from '../content/towns.js';
import { icon } from './icons.js';
import { dedicationList, layout } from './layout.js';

const sectionCounts = sections.map((s) => ({ ...s, count: s.prompts.length }));

export function homePage(ctx, { totals, featured, prefillTown, refCode, townName }) {
  const { config } = ctx;
  const minutes = Math.round(Number(totals.duration_ms) / 60000);
  const showTotals = totals.elders >= 5;

  const body = html`
<section class="hero container">
  <div class="hero-copy">
    <p class="kicker">For Sindhi families · free forever</p>
    <h1>Keep Dadi’s voice.<br><span class="accent">Teach the kids Sindhi in it.</span></h1>
    <p class="lead">A private page for each Dada, Dadi, Nana or Nani. Sit with them, tap record, and keep
      their stories — their town in Sindh, the 1947 journey, lullabies, recipes and 50 everyday Sindhi words —
      in their own voice.</p>
    <div class="hero-actions">
      <a class="btn btn-big" href="#start">${icon('mic')} Start a page — 2 minutes</a>
      <a class="btn btn-ghost" href="/sindh">${icon('pin')} See the Sindh map</a>
    </div>
    <ul class="pill-row" aria-label="Promises">
      <li>No app</li><li>No login</li><li>No ads</li><li>Unlisted pages</li>
    </ul>
  </div>
  <div class="hero-demo" aria-hidden="true">
    <div class="demo-card">
      <p class="demo-who"><span class="avatar avatar-small">K</span> Dadi Kamla · Shikarpur</p>
      <p class="roman">Tavhaanjo janamu kithe thiyo?</p>
      <p class="deva" lang="sd-Deva">तव्हांजो जनमु किथे थियो?</p>
      <p class="en">Where were you born?</p>
      <div class="demo-player"><span class="demo-play">${icon('play', { size: 16 })}</span><span class="demo-wave">${Array.from({ length: 28 }, (_, i) => html`<i style="--h:${[30, 55, 80, 45, 90, 60, 35, 70][i % 8]}%"></i>`)}</span><span class="demo-time">0:52</span></div>
    </div>
    <div class="demo-card demo-card-back">
      <p class="demo-word"><span>💧</span> Paani · <span lang="sd-Deva">पाणी</span></p>
    </div>
  </div>
</section>

<section class="container section">
  <h2>What you’ll record</h2>
  <p class="section-lead">Every prompt is written in Roman Sindhi and Devanagari, so the elder can read it and just talk.
    Each clip is up to a minute long.</p>
  <div class="tiles">
    ${sectionCounts.map(
      (s) => html`<div class="tile tile-${s.id}">
        <p class="tile-title">${s.title} <span class="deva" lang="sd-Deva">${s.deva}</span></p>
        <p class="tile-en">${s.en}</p>
        <p class="tile-count">${s.count} ${s.words ? 'words' : 'prompts'}</p>
      </div>`,
    )}
  </div>
</section>

<section class="container section">
  <h2>How it works</h2>
  <ol class="steps">
    <li><strong>Make a page.</strong> Pick who you’re recording and a family PIN. No app, no sign-up.</li>
    <li><strong>Sit with them and tap record.</strong> Show them the prompt; they talk for up to a minute.
      Already have WhatsApp voice notes? Upload those instead.</li>
    <li><strong>Share it with the family.</strong> One tap sends the page to the family WhatsApp group. The kids open
      “Learn Sindhi” and hear 50 words in their grandparent’s voice.</li>
  </ol>
</section>

<section class="container section promises">
  <h2>Our promises</h2>
  <ul class="promise-list">
    <li>${icon('heart')}<span><strong>Free for families, forever.</strong> Speech is tiny — an hour of a voice is about 14 MB — so it costs almost nothing to keep.</span></li>
    <li>${icon('lock')}<span><strong>Unlisted.</strong> Only people with the link can listen. Pages never appear in search or on the map.</span></li>
    <li>${icon('download')}<span><strong>Yours to keep.</strong> Download every recording as a .zip whenever you like. Delete the page any time.</span></li>
    <li>${icon('check')}<span><strong>Never sold.</strong> We will never sell, license or train anything on your family’s voices.</span></li>
  </ul>
</section>

${showTotals || featured.length
  ? html`<section class="container section community">
      ${showTotals
        ? html`<p class="big-stat"><strong>${totals.elders}</strong> Sindhi elders recorded · <strong>${minutes}</strong> minutes of voices kept</p>`
        : ''}
      ${featured.length ? html`<h3>Remembered this week</h3>${dedicationList(featured, { showTown: true, townName })}` : ''}
      <p><a class="link-arrow" href="/sindh">Where families come from ${icon('arrow', { size: 16 })}</a></p>
    </section>`
  : ''}

<section id="start" class="container section">
  <div class="card start-card">
    <h2>Start a page</h2>
    <p class="section-lead">Takes two minutes. You can change everything later.</p>
    <form id="create-form" class="form" novalidate>
      <fieldset class="field">
        <legend>Who are you recording?</legend>
        <div class="choice-row">
          ${Object.entries(relations).map(
            ([id, r], i) => html`<label class="choice"><input type="radio" name="relation" value="${id}" ${i === 1 ? 'checked' : ''}>
              <span>${id === 'other' ? 'Another elder' : r.label}${id !== 'other' ? html` <span class="deva" lang="sd-Deva">${r.deva}</span>` : ''}</span></label>`,
          )}
        </div>
      </fieldset>
      <label class="field"><span class="label">Name on the page</span>
        <input name="displayName" required maxlength="60" placeholder="e.g. Dadi Kamla Motwani" autocomplete="off"></label>
      <label class="field"><span class="label">Ancestral town in Sindh</span>
        <select name="townSlug">
          <option value="">Choose a town…</option>
          ${towns.map((t) => html`<option value="${t.slug}" ${t.slug === prefillTown ? 'selected' : ''}>${t.name}</option>`)}
          <option value="other">Other town or village…</option>
        </select></label>
      <label class="field" data-town-other hidden><span class="label">Town or village</span>
        <input name="townOther" maxlength="60" placeholder="e.g. Tando Soomro"></label>
      <label class="field field-short"><span class="label">Year of birth <em>(optional)</em></span>
        <input name="birthYear" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="1938"></label>
      <label class="field field-short"><span class="label">Family PIN</span>
        <input name="pin" inputmode="numeric" maxlength="8" pattern="[0-9]{4,8}" required autocomplete="off" placeholder="4–8 digits"></label>
      <p class="hint">Anyone with the link can listen. Only people with the PIN can record or delete — share it with the
        family members who’ll record.</p>
      <label class="check"><input type="checkbox" name="onMap">
        <span>Add our town to the community Sindh map. <small>Only the town and a count of families — never names or recordings.</small></span></label>
      <label class="check"><input type="checkbox" name="consent" required>
        <span>They know about this page and are happy to be recorded.</span></label>
      <input type="hidden" name="ref" value="${refCode || ''}">
      <p class="form-error" role="alert" hidden></p>
      <button class="btn btn-big" type="submit">${icon('mic')} Create the page</button>
    </form>
    <div id="created" class="created" hidden></div>
  </div>
</section>

<section class="container section faq">
  <h2>Questions families ask</h2>
  <details><summary>Is it really free?</summary>
    <p>Yes. Voices are small and storage is cheap, so families never pay and there are no ads. The site is kept running by
      optional “in loving memory” dedications on town pages and one heritage sponsor.</p></details>
  <details><summary>Who can hear the recordings?</summary>
    <p>Only people who have the page link. Share it in the family WhatsApp group, the way you’d share a family photo album —
      not on public social media.</p></details>
  <details><summary>Dadi speaks Lari, Thareli, Kutchi… does that matter?</summary>
    <p>That’s the whole point. Let them talk however they talk — the prompts are only a nudge. Hindi, English and Sindhi mixed
      together is perfect too.</p></details>
  <details><summary>What if we forget the PIN?</summary>
    <p>Any phone that has already entered the PIN stays unlocked and can set a new one in Family settings.${config.contactEmail
      ? html` Otherwise write to <a href="mailto:${config.contactEmail}">${config.contactEmail}</a> from the family and we’ll help.`
      : ''}</p></details>
  <details><summary>Can we download or delete everything?</summary>
    <p>Yes, any time. “Download all” gives you a .zip of every recording with a list of what each one is. “Delete page” removes
      the page and every recording permanently.</p></details>
</section>`;

  return layout(ctx, {
    description:
      'A free, private voice archive for Sindhi elders. Record your Dada or Nani’s town in Sindh, the Partition journey, lullabies, recipes and 50 Sindhi words — so the kids learn Sindhi in their own grandparent’s voice.',
    body,
    scripts: ['create.js'],
    bodyClass: 'page-home',
  });
}
