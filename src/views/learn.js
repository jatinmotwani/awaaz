import { html, jsonScript } from '../lib/html.js';
import { relations } from '../content/prompts.js';
import { wordGroups } from '../content/words.js';
import { icon } from './icons.js';
import { layout, whatsappButton } from './layout.js';
import { recordTooCta } from './elder.js';

export function learnPage(ctx, { elder, wordClips }) {
  const { config } = ctx;
  const pronoun = relations[elder.relation].pronoun;
  const recorded = wordGroups.flatMap((g) => g.words).filter((w) => wordClips.has(`lafz-${w.id}`));
  const learnUrl = `${config.publicUrl}/e/${elder.slug}/learn`;

  const data = {
    name: elder.display_name,
    words: recorded.map((w) => ({
      id: w.id,
      emoji: w.emoji,
      roman: w.roman,
      deva: w.deva,
      en: w.en,
      src: `/a/${wordClips.get(`lafz-${w.id}`).public_id}`,
    })),
  };

  const body = html`
<section class="container learn-hero">
  <a class="back-link" href="/e/${elder.slug}">← ${elder.display_name}’s page</a>
  <h1>Learn Sindhi with ${elder.display_name}</h1>
  ${recorded.length
    ? html`<p class="lead">Tap a card to hear ${elder.display_name} say it. ${recorded.length} of 50 words so far.</p>
      <div class="mode-switch" role="tablist" aria-label="Learning mode">
        <button type="button" role="tab" aria-selected="true" data-mode="cards">Cards</button>
        <button type="button" role="tab" aria-selected="false" data-mode="quiz" ${recorded.length < 3 ? 'disabled title="Record at least 3 words for the quiz"' : ''}>Quiz</button>
      </div>`
    : html`<div class="card empty-card">
        <p class="lead">${elder.display_name} hasn’t recorded any words yet.</p>
        <p>Open ${pronoun} page, unlock it with the family PIN and record the <strong>50 Lafz</strong> section — each word takes a few seconds.</p>
        <a class="btn" href="/e/${elder.slug}#s-lafz">${icon('mic')} Record the words</a>
      </div>`}
</section>

${recorded.length
  ? html`<section class="container" data-panel="cards">
      ${wordGroups.map((group) => {
        const words = group.words.filter((w) => wordClips.has(`lafz-${w.id}`));
        if (!words.length) return '';
        return html`<h2 class="word-group">${group.title}</h2>
          <div class="learn-grid">${words.map(
            (w) => html`<button type="button" class="learn-card" data-src="/a/${wordClips.get(`lafz-${w.id}`).public_id}"
                aria-label="Hear ${w.roman}, ${w.en}">
              <span class="learn-emoji" aria-hidden="true">${w.emoji}</span>
              <span class="learn-roman">${w.roman}</span>
              <span class="learn-deva" lang="sd-Deva">${w.deva}</span>
              <span class="learn-en">${w.en}</span>
            </button>`,
          )}</div>`;
      })}
    </section>

    <section class="container" data-panel="quiz" hidden>
      <div class="card quiz">
        <p class="quiz-score">Stars: <strong data-score>0</strong></p>
        <button type="button" class="quiz-listen" data-listen>${icon('play', { size: 28 })}<span>Listen</span></button>
        <p class="quiz-question">Which one did ${elder.display_name} say?</p>
        <div class="quiz-options" data-options></div>
        <p class="quiz-feedback" aria-live="polite" data-feedback></p>
        <button type="button" class="btn" data-next hidden>Next word ${icon('arrow', { size: 18 })}</button>
      </div>
    </section>

    <section class="container section center">
      ${whatsappButton(`🧒 Learn Sindhi with ${elder.display_name}! Tap a word and hear ${pronoun} say it: ${learnUrl}`, 'Send to the grandkids')}
    </section>`
  : ''}

${recordTooCta(elder)}
<script type="application/json" id="learn-data">${jsonScript(data)}</script>`;

  return layout(ctx, {
    title: `Learn Sindhi with ${elder.display_name}`,
    description: `50 everyday Sindhi words in ${elder.display_name}’s own voice.`,
    path: `/e/${elder.slug}/learn`,
    noindex: true,
    body,
    scripts: ['learn.js'],
    bodyClass: 'page-learn',
  });
}
