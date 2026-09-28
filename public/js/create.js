import { $, api, copyText, editTokenKey, FAMILY_KEY, showError, store, toast, whatsappUrl, wireTownSelect } from './common.js';

const PRONOUN = { dada: 'his', nana: 'his', dadi: 'her', nani: 'her', other: 'their' };
const form = $('#create-form');

if (form) {
  wireTownSelect(form);
  const error = $('.form-error', form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError(error, '');
    const pin = form.pin.value.trim();
    if (form.displayName.value.trim().length < 2) return showError(error, 'Please add a name for the page.');
    if (!/^\d{4,8}$/.test(pin)) return showError(error, 'The PIN should be 4 to 8 digits.');
    if (!form.consent.checked) return showError(error, 'Please confirm they’re happy to be recorded.');

    const button = $('button[type="submit"]', form);
    button.disabled = true;
    try {
      const result = await api('/api/elders', {
        method: 'POST',
        body: {
          relation: form.relation.value,
          displayName: form.displayName.value,
          townSlug: form.townSlug.value,
          townOther: form.townOther.value,
          birthYear: form.birthYear.value.trim(),
          pin,
          onMap: form.onMap.checked,
          consent: true,
          ref: form.ref.value || undefined,
          familyId: store.get(FAMILY_KEY) || undefined,
        },
      });
      store.set(editTokenKey(result.slug), result.editToken);
      store.set(FAMILY_KEY, result.familyId);
      showCreated(result, form.displayName.value.trim(), PRONOUN[form.relation.value], pin);
    } catch (err) {
      showError(error, err.message);
    } finally {
      button.disabled = false;
    }
    return undefined;
  });
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

function showCreated({ slug, url }, name, pronoun, pin) {
  const panel = $('#created');
  const share = `🎙️ I started a page to keep ${name}’s voice — ${pronoun} stories, lullabies, recipes and Sindhi words. Listen here: ${url}`;
  const linkInput = el('input', { readonly: '', value: url, 'aria-label': 'Page link' });
  const copy = el('button', { type: 'button', class: 'btn btn-ghost' }, 'Copy');
  copy.addEventListener('click', async () => toast((await copyText(url)) ? 'Link copied' : url));

  panel.replaceChildren(
    el('p', { class: 'kicker' }, 'Page ready'),
    el('h2', {}, `✓ ${name}’s page is ready`),
    el('p', {}, 'This is the link for the family. Anyone with it can listen.'),
    el('div', { class: 'share-link' }, linkInput, copy),
    el('p', { class: 'pin-note' }, '🔒 Family PIN: ', el('strong', {}, pin),
      ' — only people with the PIN can record. This phone is already unlocked. Write the PIN down somewhere safe.'),
    el('div', { class: 'row' },
      el('a', { class: 'btn btn-big', href: `/e/${slug}#s-vatan` }, '🎙️ Start recording now'),
      el('a', { class: 'btn btn-wa', href: whatsappUrl(share), target: '_blank', rel: 'noopener' }, 'Share to family WhatsApp')),
  );
  form.hidden = true;
  panel.hidden = false;
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
