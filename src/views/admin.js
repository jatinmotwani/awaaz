import { html } from '../lib/html.js';
import { formatDuration, formatRupees } from '../lib/text.js';
import { townBySlug } from '../content/towns.js';
import { layout } from './layout.js';

export function adminLoginPage(ctx, { error } = {}) {
  return layout(ctx, {
    title: 'Admin',
    description: 'Admin',
    noindex: true,
    body: html`<section class="container narrow">
      <div class="card">
        <h1>Admin</h1>
        <form method="post" action="/admin/login" class="form">
          <label class="field"><span class="label">Admin token</span><input type="password" name="token" autocomplete="current-password" required></label>
          ${error ? html`<p class="form-error">${error}</p>` : ''}
          <button class="btn" type="submit">Sign in</button>
        </form>
      </div>
    </section>`,
  });
}

const date = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function adminPage(ctx, { totals, pages, dedications, flash }) {
  const mb = (Number(totals.bytes) / 1024 / 1024).toFixed(1);
  const body = html`
<section class="container admin">
  <div class="row between"><h1>Admin</h1>
    <form method="post" action="/admin/logout"><button class="btn btn-ghost btn-small" type="submit">Sign out</button></form></div>
  ${flash ? html`<p class="notice">${flash}</p>` : ''}

  <div class="stat-grid">
    <div class="stat"><strong>${totals.elders}</strong><span>elder pages</span></div>
    <div class="stat"><strong>${totals.families}</strong><span>families</span></div>
    <div class="stat"><strong>${totals.devices}</strong><span>devices opened a page</span></div>
    <div class="stat"><strong>${totals.referred}</strong><span>pages from “Record your Nani too”</span></div>
    <div class="stat"><strong>${totals.clips}</strong><span>clips · ${formatDuration(Number(totals.duration_ms))} · ${mb} MB</span></div>
    <div class="stat"><strong>${totals.family_dates}</strong><span>family dates (barsi, birthdays)</span></div>
    <div class="stat"><strong>${formatRupees(Number(totals.dedication_paise))}</strong><span>dedications</span></div>
  </div>

  <h2>Pages</h2>
  <p class="hint">The week-one test: if “devices” grows well past the people you sent a link to, relatives are forwarding it
    without being asked. “Referrals” counts new pages started from that page’s “Record your Nani too” button.</p>
  <div class="table-wrap"><table>
    <thead><tr><th>Page</th><th>Town</th><th>Created</th><th>Clips</th><th>Length</th><th>Devices</th><th>Referrals</th></tr></thead>
    <tbody>${pages.map(
      (p) => html`<tr>
        <td><a href="/e/${p.slug}">${p.display_name}</a></td>
        <td>${townBySlug.get(p.town_slug)?.name || p.town_other || '—'}${p.on_map ? ' 📍' : ''}</td>
        <td>${date(p.created_at)}</td>
        <td>${p.clips}</td>
        <td>${formatDuration(p.duration_ms)}</td>
        <td>${p.devices}</td>
        <td>${p.referrals}</td>
      </tr>`,
    )}</tbody>
  </table></div>

  <h2>Dedications</h2>
  <div class="table-wrap"><table>
    <thead><tr><th>In memory of</th><th>Town</th><th>Tier</th><th>Paid</th><th>Runs until</th><th></th></tr></thead>
    <tbody>${dedications.map(
      (d) => html`<tr class="${d.status === 'hidden' ? 'is-muted' : ''}">
        <td>${d.in_memory_of}${d.from_line ? html`<br><small>${d.from_line}</small>` : ''}</td>
        <td>${townBySlug.get(d.town_slug)?.name || d.town_slug}</td>
        <td>${d.tier}</td>
        <td>${formatRupees(d.amount_paise)}</td>
        <td>${d.ends_at ? date(d.ends_at) : '—'}</td>
        <td><form method="post" action="/admin/dedications/${d.id}/${d.status === 'hidden' ? 'show' : 'hide'}">
          <button class="btn btn-ghost btn-small" type="submit">${d.status === 'hidden' ? 'Show' : 'Hide'}</button></form></td>
      </tr>`,
    )}</tbody>
  </table></div>

  <h2>Reset a family PIN</h2>
  <form method="post" action="/admin/reset-pin" class="form inline-form">
    <input name="slug" placeholder="Page link or slug" required>
    <input name="pin" inputmode="numeric" placeholder="New PIN" required>
    <button class="btn" type="submit">Reset PIN</button>
  </form>
</section>`;

  return layout(ctx, { title: 'Admin', description: 'Admin', noindex: true, body, bodyClass: 'page-admin' });
}
