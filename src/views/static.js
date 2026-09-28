import { html } from '../lib/html.js';
import { icon } from './icons.js';
import { layout } from './layout.js';

export function privacyPage(ctx) {
  const { config } = ctx;
  const body = html`
<section class="container prose">
  <p class="kicker">Privacy &amp; promises</p>
  <h1>Your family’s voices stay your family’s</h1>
  <p class="lead">${config.appName} exists because Sindhi families trust each other with these recordings. Here is exactly what we do and don’t do.</p>

  <h2>What we promise</h2>
  <ul>
    <li><strong>We never sell, license or share voices</strong> — not to advertisers, researchers, or AI companies. We will never train anything on them.</li>
    <li><strong>No ads.</strong> Families never pay. The site runs on optional dedications on town pages and one heritage sponsor line.</li>
    <li><strong>You can download everything</strong> at any time as a .zip, from the bottom of the page.</li>
    <li><strong>You can delete everything</strong> at any time from Family settings. Deleted recordings are removed from storage straight away.</li>
  </ul>

  <h2>Who can see a page</h2>
  <p>Each page lives at a long, random link. Anyone who has the link can listen; nobody can find it otherwise. Pages are
    marked “noindex” so search engines never list them, and the community map shows only a town and a count of families
    — never a name, a page or a recording. Treat the link like a family photo album: share it with family, not in public.</p>
  <p>Recording, uploading, editing and deleting need the family PIN (or a phone that already entered it).</p>

  <h2>What we store</h2>
  <ul>
    <li>The page details you type in: the name, relation, town and (optionally) year of birth.</li>
    <li>The recordings, on Cloudflare R2 storage.</li>
    <li>A scrambled copy of the family PIN (we can’t read it back).</li>
    <li>A random, anonymous cookie so we can count how many phones opened a page. It isn’t linked to your name or number
      and isn’t used anywhere else.</li>
  </ul>
  <p>We don’t use analytics trackers, advertising cookies or social-media pixels. Fonts load from Google Fonts. Dedication
    payments are handled by Razorpay; we never see card or UPI details.</p>
  <p>Family dates (barsi, birthdays) are stored with the page. If you add them to Google Calendar, Google fetches the
    page’s calendar link to keep your reminders up to date — the same link as the page, so share it just as carefully.</p>
  <p>Recordings made without signal wait on your phone (in the browser’s storage) until they upload, then are removed
    from the phone.</p>

  <h2>People who run the site</h2>
  <p>The person who runs ${config.appName} can technically access stored data to keep the service working — for example
    to reset a forgotten PIN when a family asks. They will not browse or share recordings.${config.contactEmail
      ? html` Questions or requests: <a href="mailto:${config.contactEmail}">${config.contactEmail}</a>.`
      : ''}</p>
</section>`;

  return layout(ctx, {
    title: 'Privacy & promises',
    description: `How ${config.appName} keeps Sindhi family recordings private: unlisted pages, no ads, never sold, download or delete any time.`,
    path: '/privacy',
    body,
  });
}

export function offlinePage(ctx) {
  return layout(ctx, {
    title: 'Offline',
    description: 'You are offline.',
    path: '/offline',
    noindex: true,
    body: html`<section class="container center prose">
      <h1>You’re offline</h1>
      <p class="lead">Recordings need an internet connection. Pages you opened before may still be available — try going back.</p>
      <a class="btn" href="">Try again</a>
    </section>`,
  });
}

export function notFoundPage(ctx, { message } = {}) {
  return layout(ctx, {
    title: 'Not found',
    description: 'This page does not exist.',
    noindex: true,
    body: html`<section class="container center prose">
      <h1>We couldn’t find that page</h1>
      <p class="lead">${message || 'The link may be incomplete — check that the whole link was copied from WhatsApp, or ask the family to send it again.'}</p>
      <a class="btn" href="/">${icon('arrow')} Go to the home page</a>
    </section>`,
  });
}

export function errorPage(ctx) {
  return layout(ctx, {
    title: 'Something went wrong',
    description: 'Something went wrong.',
    noindex: true,
    body: html`<section class="container center prose">
      <h1>Something went wrong</h1>
      <p class="lead">Sorry — please try again in a moment. Your recordings are safe.</p>
      <a class="btn" href="/">Go to the home page</a>
    </section>`,
  });
}
