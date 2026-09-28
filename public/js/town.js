import { $, api, readJson, showError, toast } from './common.js';

const town = readJson('town-data');

// ---- Shareable town card (drawn in the browser, shared as a PNG) -----------

function ajrakBand(ctx, y, width, height) {
  ctx.fillStyle = '#a3212a';
  ctx.fillRect(0, y, width, height);
  const step = height * 2.4;
  for (let x = step / 2; x < width + step; x += step) {
    ctx.fillStyle = '#26306b';
    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.1);
    ctx.lineTo(x + height * 0.4, y + height / 2);
    ctx.lineTo(x, y + height * 0.9);
    ctx.lineTo(x - height * 0.4, y + height / 2);
    ctx.fill();
    ctx.fillStyle = '#fbf6ee';
    ctx.beginPath();
    ctx.arc(x, y + height / 2, height * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b1530';
    ctx.beginPath();
    ctx.arc(x + step / 2, y + height / 2, height * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function fitText(ctx, text, maxWidth, size, font) {
  let s = size;
  do {
    ctx.font = `${font} ${s}px Georgia, "Iowan Old Style", serif`;
    s -= 4;
  } while (ctx.measureText(text).width > maxWidth && s > 24);
}

function drawCard() {
  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#fbf6ee';
  ctx.fillRect(0, 0, size, size);
  ajrakBand(ctx, 0, size, 56);
  ajrakBand(ctx, size - 56, size, 56);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#a3212a';
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillText(`${town.district.toUpperCase()} DISTRICT · SINDH`, size / 2, 210);

  ctx.fillStyle = '#231a2e';
  fitText(ctx, town.name, size - 160, 150, '700');
  ctx.fillText(town.name, size / 2, 380);

  ctx.font = '96px system-ui, sans-serif';
  ctx.fillText('🪔', size / 2, 540);

  ctx.fillStyle = '#231a2e';
  if (town.families) {
    ctx.font = '700 84px Georgia, serif';
    ctx.fillStyle = '#a3212a';
    ctx.fillText(`${town.families} ${town.families === 1 ? 'family' : 'families'}`, size / 2, 680);
    ctx.fillStyle = '#231a2e';
    ctx.font = '44px Georgia, serif';
    ctx.fillText('keep their elders’ voices from here', size / 2, 750);
  } else {
    ctx.font = '700 60px Georgia, serif';
    ctx.fillText(`Is your Dada or Nani`, size / 2, 670);
    ctx.fillText(`from ${town.name}?`, size / 2, 745);
  }

  ctx.fillStyle = '#6d6277';
  ctx.font = '36px system-ui, sans-serif';
  ctx.fillText('Stories · lullabies · recipes · Sindhi words', size / 2, 850);
  ctx.fillStyle = '#231a2e';
  ctx.font = '700 38px system-ui, sans-serif';
  ctx.fillText(`${town.appName} · ${town.host}/sindh/${town.slug}`, size / 2, 940);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

$('[data-share-card]')?.addEventListener('click', async () => {
  const blob = await drawCard();
  const file = new File([blob], `${town.slug}-sindh.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: town.shareText });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('Card saved — share it in your family WhatsApp group.');
});

// ---- Dedications -------------------------------------------------------------

const form = $('#dedicate-form');

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Couldn’t load the payment window. Check your connection and try again.'));
    document.head.append(script);
  });
}

if (form) {
  const error = $('.form-error', form);
  const previewName = $('[data-preview-name]', form);
  const previewFrom = $('[data-preview-from]', form);
  const button = $('button[type="submit"]', form);

  const updatePreview = () => {
    previewName.textContent = form.inMemoryOf.value.trim() || '…';
    const from = form.fromLine.value.trim();
    previewFrom.textContent = from ? `— ${from}` : '';
    previewFrom.hidden = !from;
  };
  form.addEventListener('input', updatePreview);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError(error, '');
    if (form.inMemoryOf.value.trim().length < 2) return showError(error, 'Please add the name you’re remembering.');
    button.disabled = true;
    try {
      const order = await api('/api/dedications', {
        method: 'POST',
        body: {
          townSlug: form.townSlug.value,
          tier: form.tier.value,
          inMemoryOf: form.inMemoryOf.value,
          fromLine: form.fromLine.value,
        },
      });
      await loadCheckout();
      const checkout = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amountPaise,
        currency: 'INR',
        name: order.name,
        description: order.description,
        theme: { color: '#a3212a' },
        handler: async (response) => {
          try {
            await api('/api/dedications/verify', {
              method: 'POST',
              body: {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              },
            });
            location.href = `/sindh/${town.slug}?dedicated=1#dedicate`;
          } catch (err) {
            showError(error, err.message);
            button.disabled = false;
          }
        },
        modal: { ondismiss: () => (button.disabled = false) },
      });
      checkout.on('payment.failed', (resp) => showError(error, resp.error?.description || 'The payment didn’t go through.'));
      checkout.open();
    } catch (err) {
      showError(error, err.message);
      button.disabled = false;
    }
    return undefined;
  });
}
