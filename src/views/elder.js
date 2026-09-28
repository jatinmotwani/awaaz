import { html, jsonScript } from '../lib/html.js';
import { formatDuration } from '../lib/text.js';
import { relations, sections, prompts } from '../content/prompts.js';
import { towns, townBySlug } from '../content/towns.js';
import { icon } from './icons.js';
import { layout, whatsappButton } from './layout.js';

export const townLabel = (elder) => townBySlug.get(elder.town_slug)?.name || elder.town_other || '';

export function shareText(config, elder) {
  const r = relations[elder.relation];
  const town = townLabel(elder);
  return `Budho! 🎙️ ${elder.display_name}’s voice${town ? ` from ${town}` : ''} — stories, the 1947 journey, lullabies, recipes and Sindhi words in ${r.pronoun} own voice. ${config.publicUrl}/e/${elder.slug}`;
}

export function recordTooCta(elder) {
  const who = elder.relation === 'nani' ? 'Dada' : 'Nani';
  return html`<section class="container section">
    <div class="card cta-card">
      <p class="kicker">Every Sindhi elder has a voice worth keeping</p>
      <h2>Record your ${who} too.</h2>
      <p>Free, private, and it takes two minutes to start. No app, no login.</p>
      <a class="btn btn-big" href="/?ref=${elder.ref_code}#start">${icon('mic')} Start a page</a>
    </div>
  </section>`;
}

export function clipItem(clip) {
  return html`<li class="clip" data-clip="${clip.public_id}">
    <audio controls preload="none" src="/a/${clip.public_id}"></audio>
    <span class="clip-meta">${formatDuration(clip.duration_ms)}${clip.source === 'uploaded' ? ' · voice note' : ''}</span>
    <button type="button" class="icon-btn editor-only" data-delete aria-label="Delete this recording">${icon('trash', { size: 18 })}</button>
  </li>`;
}

function promptCard(prompt, clips, elder) {
  return html`<article class="prompt${clips.length ? ' has-clips' : ''}" id="p-${prompt.id}" data-prompt="${prompt.id}">
    <div class="prompt-text">
      <p class="roman">${prompt.roman}</p>
      <p class="deva" lang="sd-Deva">${prompt.deva}</p>
      <p class="en">${prompt.en}</p>
    </div>
    <ul class="clip-list">${clips.map(clipItem)}</ul>
    <p class="empty visitor-only">Not recorded yet — ask ${elder.display_name} next time you’re together.</p>
    <div class="prompt-actions editor-only">
      <button type="button" class="btn btn-rec" data-record>${icon('mic')} Record</button>
      <label class="btn btn-ghost btn-small upload-btn">${icon('upload', { size: 18 })} Upload voice note
        <input type="file" accept="audio/*,.opus,.ogg,.m4a,.mp3,.aac,.wav" data-upload hidden></label>
    </div>
  </article>`;
}

function wordTile(prompt, clip) {
  return html`<article class="word${clip ? ' has-clips' : ''}" id="p-${prompt.id}" data-prompt="${prompt.id}" data-clip="${clip?.public_id || ''}">
    <button type="button" class="word-play" data-play aria-label="Hear ${prompt.roman} (${prompt.en})" ${clip ? '' : 'disabled'}>
      <span class="word-emoji" aria-hidden="true">${prompt.emoji}</span>
      <span class="word-roman">${prompt.roman}</span>
      <span class="word-deva" lang="sd-Deva">${prompt.deva}</span>
      <span class="word-en">${prompt.en}</span>
    </button>
    <div class="word-actions editor-only">
      <button type="button" class="icon-btn icon-btn-rec" data-record aria-label="Record ${prompt.roman}">${icon('mic', { size: 18 })}</button>
      <label class="icon-btn" aria-label="Upload a voice note for ${prompt.roman}">${icon('upload', { size: 18 })}
        <input type="file" accept="audio/*,.opus,.ogg,.m4a,.mp3,.aac,.wav" data-upload hidden></label>
      <button type="button" class="icon-btn" data-delete aria-label="Delete ${prompt.roman} recording" ${clip ? '' : 'hidden'}>${icon('trash', { size: 18 })}</button>
    </div>
  </article>`;
}

function sectionBlock(section, clipsByPrompt, elder) {
  const done = section.prompts.filter((p) => clipsByPrompt.get(p.id)?.length).length;
  const byId = new Map(section.prompts.map((p) => [p.id, p]));
  return html`<section id="s-${section.id}" class="container section prompt-section" data-section="${section.id}">
    <header class="section-head">
      <h2>${section.title} <span class="deva" lang="sd-Deva">${section.deva}</span></h2>
      <p>${section.en} · <span data-section-done="${section.id}">${done}</span>/${section.prompts.length}</p>
    </header>
    ${section.words
      ? html`<p class="hint editor-only">${section.hint} Up to ${section.maxSeconds} seconds each.</p>
        ${section.groups.map(
          (group) => html`<h3 class="word-group">${group.title}</h3>
            <div class="word-grid">${group.ids.map((id) => wordTile(byId.get(id), clipsByPrompt.get(id)?.at(-1)))}</div>`,
        )}`
      : html`<div class="prompt-list">${section.prompts.map((p) => promptCard(p, clipsByPrompt.get(p.id) || [], elder))}</div>`}
  </section>`;
}

function recorderDialog(elder) {
  return html`<dialog id="recorder" class="sheet" aria-labelledby="rec-title">
    <div class="sheet-inner">
      <button type="button" class="icon-btn sheet-close" data-close aria-label="Close">${icon('close')}</button>
      <p class="kicker" id="rec-title">Ask ${elder.display_name}</p>
      <div class="rec-prompt">
        <p class="rec-emoji" data-f="emoji"></p>
        <p class="roman big" data-f="roman"></p>
        <p class="deva big" lang="sd-Deva" data-f="deva"></p>
        <p class="en" data-f="en"></p>
      </div>
      <div class="rec-stage" data-state="ready">
        <div class="rec-view rec-ready">
          <button type="button" class="rec-button" data-start aria-label="Start recording">${icon('mic', { size: 40 })}</button>
          <p class="hint">Tap, then let them talk. Up to <span data-f="max">60</span> seconds.</p>
        </div>
        <div class="rec-view rec-live">
          <div class="ring" aria-hidden="true">
            <svg viewBox="0 0 120 120"><circle class="ring-track" cx="60" cy="60" r="54"/><circle class="ring-bar" cx="60" cy="60" r="54"/></svg>
            <span class="ring-time" data-f="left">60</span>
          </div>
          <p class="rec-status" aria-live="polite"><span class="rec-dot"></span> Recording…</p>
          <button type="button" class="btn btn-big btn-stop" data-stop>${icon('stop')} Stop</button>
        </div>
        <div class="rec-view rec-review">
          <audio controls data-preview></audio>
          <div class="row">
            <button type="button" class="btn btn-big" data-save>${icon('check')} Keep it</button>
            <button type="button" class="btn btn-ghost" data-again>${icon('redo')} Record again</button>
          </div>
        </div>
        <div class="rec-view rec-saving"><span class="spinner" aria-hidden="true"></span> <span data-f="saving">Saving…</span></div>
        <div class="rec-view rec-error">
          <p class="form-error" data-f="error"></p>
          <div class="row">
            <button type="button" class="btn" data-retry>${icon('redo')} Try again</button>
            <a class="btn btn-ghost" data-save-local download="recording">${icon('download')} Save to phone</a>
          </div>
        </div>
      </div>
    </div>
  </dialog>`;
}

function settingsDialog(elder) {
  return html`<dialog id="settings" class="sheet" aria-labelledby="settings-title">
    <div class="sheet-inner">
      <button type="button" class="icon-btn sheet-close" data-close aria-label="Close">${icon('close')}</button>
      <h2 id="settings-title">Family settings</h2>
      <form id="settings-form" class="form" novalidate>
        <label class="field"><span class="label">Name on the page</span>
          <input name="displayName" required maxlength="60" value="${elder.display_name}"></label>
        <label class="field"><span class="label">Who is this?</span>
          <select name="relation">${Object.entries(relations).map(
            ([id, r]) => html`<option value="${id}" ${id === elder.relation ? 'selected' : ''}>${id === 'other' ? 'Another elder' : r.label}</option>`,
          )}</select></label>
        <label class="field"><span class="label">Ancestral town</span>
          <select name="townSlug">
            <option value="">Not set</option>
            ${towns.map((t) => html`<option value="${t.slug}" ${t.slug === elder.town_slug ? 'selected' : ''}>${t.name}</option>`)}
            <option value="other" ${!elder.town_slug && elder.town_other ? 'selected' : ''}>Other town or village…</option>
          </select></label>
        <label class="field" data-town-other ${!elder.town_slug && elder.town_other ? '' : 'hidden'}><span class="label">Town or village</span>
          <input name="townOther" maxlength="60" value="${elder.town_other || ''}"></label>
        <label class="field field-short"><span class="label">Year of birth</span>
          <input name="birthYear" inputmode="numeric" maxlength="4" value="${elder.birth_year || ''}"></label>
        <label class="check"><input type="checkbox" name="onMap" ${elder.on_map ? 'checked' : ''}>
          <span>Show our town on the community Sindh map <small>(town and count only)</small></span></label>
        <p class="form-error" role="alert" hidden></p>
        <button class="btn" type="submit">Save changes</button>
      </form>

      <div class="settings-block">
        <h3>Change the family PIN</h3>
        <form id="pin-form" class="inline-form" novalidate>
          <input name="newPin" inputmode="numeric" maxlength="8" placeholder="New PIN (4–8 digits)" autocomplete="off" aria-label="New PIN">
          <button class="btn btn-ghost" type="submit">Change PIN</button>
        </form>
        <p class="hint">Other phones will need the new PIN to keep recording.</p>
      </div>

      <div class="settings-block">
        <h3>Private recorder link</h3>
        <p class="hint">Send this to a cousin or sibling who’ll record. Opening it unlocks recording on their phone.
          Don’t post it in the family group — it works like the PIN.</p>
        <button type="button" class="btn btn-ghost" data-copy-editor-link>${icon('copy', { size: 18 })} Copy recorder link</button>
      </div>

      <div class="settings-block danger-zone">
        <h3>Delete this page</h3>
        <p class="hint">Removes the page and every recording, permanently. Download everything first if you want to keep it.</p>
        <form id="delete-form" class="inline-form" novalidate>
          <input name="pin" inputmode="numeric" maxlength="8" placeholder="Family PIN" autocomplete="off" aria-label="Family PIN to confirm">
          <button class="btn btn-danger" type="submit">${icon('trash', { size: 18 })} Delete forever</button>
        </form>
      </div>
    </div>
  </dialog>`;
}

export function elderPage(ctx, { elder, clipsByPrompt }) {
  const { config } = ctx;
  const relation = relations[elder.relation];
  const town = townLabel(elder);
  const recorded = prompts.filter((p) => clipsByPrompt.get(p.id)?.length).length;
  const percent = Math.round((recorded / prompts.length) * 100);
  const initial = [...elder.display_name.replace(/^(dada|dadi|nana|nani|dado|nano)\s+/i, '')][0]?.toUpperCase() || '•';

  const pageData = {
    slug: elder.slug,
    name: elder.display_name,
    pronoun: relation.pronoun,
    totalPrompts: prompts.length,
    maxUploadBytes: config.audio.maxUploadBytes,
    prompts: Object.fromEntries(
      prompts.map((p) => [p.id, { roman: p.roman, deva: p.deva, en: p.en, emoji: p.emoji || '', maxSeconds: p.maxSeconds, section: p.sectionId }]),
    ),
  };

  const body = html`
<section class="container elder-hero">
  <div class="elder-id">
    <div class="avatar" aria-hidden="true">${initial}</div>
    <div>
      <p class="kicker">${relation.label}${elder.relation !== 'other' ? html` · <span lang="sd-Deva">${relation.deva}</span>` : ''}</p>
      <h1>${elder.display_name}</h1>
      <p class="muted">${town ? html`${icon('pin', { size: 16 })} ${town}, Sindh` : ''}${town && elder.birth_year ? ' · ' : ''}${elder.birth_year ? `born ${elder.birth_year}` : ''}</p>
    </div>
  </div>
  <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${prompts.length}" aria-valuenow="${recorded}" aria-label="Prompts recorded">
    <span style="width:${percent}%" data-progress-bar></span>
  </div>
  <p class="progress-label"><strong data-recorded>${recorded}</strong> of ${prompts.length} recorded</p>
  <div class="hero-actions">
    ${whatsappButton(shareText(config, elder))}
    <a class="btn btn-ghost" href="/e/${elder.slug}/learn">${icon('book')} Learn Sindhi with ${elder.display_name}</a>
  </div>
</section>

<section class="container editor-panel">
  <details class="visitor-only unlock card">
    <summary>${icon('lock', { size: 18 })} Family member recording? Enter the PIN</summary>
    <div class="unlock-body">
      <p>Anyone with this link can listen. To record or upload for ${elder.display_name}, enter the family PIN once on this phone.</p>
      <form id="unlock-form" class="inline-form" novalidate>
        <input name="pin" inputmode="numeric" maxlength="8" placeholder="Family PIN" autocomplete="off" aria-label="Family PIN">
        <button class="btn" type="submit">${icon('unlock', { size: 18 })} Unlock</button>
      </form>
      <p class="form-error" role="alert" hidden></p>
    </div>
  </details>
  <div class="editor-only editor-bar card">
    <p>${icon('unlock', { size: 18 })} <strong>Recording on this phone.</strong> <span class="muted" data-devices></span></p>
    <div class="row">
      <button type="button" class="btn btn-ghost btn-small" data-open-settings>${icon('settings', { size: 18 })} Family settings</button>
      <button type="button" class="btn btn-ghost btn-small" data-lock>${icon('lock', { size: 18 })} Lock</button>
    </div>
  </div>
</section>

<nav class="container section-nav" aria-label="Sections">
  ${sections.map((s) => html`<a href="#s-${s.id}">${s.title}</a>`)}
</nav>

${sections.map((s) => sectionBlock(s, clipsByPrompt, elder))}

${recordTooCta(elder)}

<section class="container page-tools">
  <a class="btn btn-ghost" href="/e/${elder.slug}/download.zip">${icon('download')} Download all recordings (.zip)</a>
</section>

${recorderDialog(elder)}
${settingsDialog(elder)}
<script type="application/json" id="page-data">${jsonScript(pageData)}</script>`;

  return layout(ctx, {
    title: elder.display_name,
    ogTitle: `${elder.display_name}’s voice${town ? ` · ${town}, Sindh` : ''}`,
    description: `Stories, lullabies, recipes and Sindhi words in ${elder.display_name}’s own voice. Tap to listen.`,
    path: `/e/${elder.slug}`,
    noindex: true,
    body,
    scripts: ['elder.js'],
    bodyClass: 'page-elder',
  });
}
