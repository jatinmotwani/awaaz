import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { sniffAudio } from '../src/lib/audio.js';
import { html, jsonScript, raw } from '../src/lib/html.js';
import { isId, newClipId, newSlug } from '../src/lib/ids.js';
import { checkEditToken, editToken, hashPin, isValidPin, lockMinutes, verifyPin } from '../src/lib/pin.js';
import { createRazorpay } from '../src/lib/razorpay.js';
import { cleanLine, dedicationProblem, formatDuration, formatRupees, kebab } from '../src/lib/text.js';
import { createZipWriter } from '../src/lib/zip.js';
import { isBot, parseCookies } from '../src/lib/cookies.js';
import { RAZORPAY, signPayment, signWebhook } from './helpers.js';

describe('html', () => {
  it('escapes interpolated values but not nested fragments', () => {
    const name = '<script>alert("x")</script>';
    const out = String(html`<p title="${name}">${name} ${html`<b>${'&'}</b>`} ${raw('<i>ok</i>')}</p>`);
    assert.equal(
      out,
      '<p title="&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;">&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; <b>&amp;</b> <i>ok</i></p>',
    );
  });

  it('renders arrays and skips null/false', () => {
    assert.equal(String(html`${[1, 2].map((n) => html`<i>${n}</i>`)}${null}${false}${0}`), '<i>1</i><i>2</i>0');
  });

  it('keeps JSON from closing a script tag', () => {
    const out = String(jsonScript({ name: '</script><script>alert(1)</script>', sep: ' ' }));
    assert.ok(!out.includes('</script>'));
    assert.ok(!out.includes(' '));
    assert.deepEqual(JSON.parse(out), { name: '</script><script>alert(1)</script>', sep: ' ' });
  });
});

describe('ids', () => {
  it('makes unguessable ids from an unambiguous alphabet', () => {
    const slugs = new Set(Array.from({ length: 2000 }, newSlug));
    assert.equal(slugs.size, 2000);
    for (const s of slugs) assert.match(s, /^[a-km-z2-9]{12}$/);
    assert.equal(newClipId().length, 20);
    assert.ok(isId(newSlug()));
    assert.ok(!isId('../etc/passwd'));
    assert.ok(!isId('ABC'));
  });
});

describe('pin', () => {
  it('hashes and verifies', async () => {
    const hash = await hashPin('4321');
    assert.ok(await verifyPin('4321', hash));
    assert.ok(!(await verifyPin('1234', hash)));
    assert.ok(!(await verifyPin('4321', 'garbage')));
  });

  it('validates PIN shape', () => {
    assert.ok(isValidPin('1234'));
    assert.ok(isValidPin('12345678'));
    assert.ok(!isValidPin('123'));
    assert.ok(!isValidPin('123456789'));
    assert.ok(!isValidPin('12a4'));
    assert.ok(!isValidPin(1234));
  });

  it('derives edit tokens from the PIN hash, so a new PIN revokes old tokens', () => {
    const elder = { id: 7, pin_hash: 'scrypt$a$b' };
    const token = editToken('secret', elder);
    assert.ok(checkEditToken('secret', elder, token));
    assert.ok(!checkEditToken('secret', { ...elder, pin_hash: 'scrypt$c$d' }, token));
    assert.ok(!checkEditToken('other-secret', elder, token));
    assert.ok(!checkEditToken('secret', elder, undefined));
  });

  it('locks after every fifth failure, doubling up to a day', () => {
    assert.deepEqual([1, 4, 5, 6, 10, 15, 50, 100].map(lockMinutes), [0, 0, 15, 0, 30, 60, 1440, 1440]);
  });
});

describe('sniffAudio', () => {
  const pad = (head) => Buffer.concat([head, Buffer.alloc(32)]);
  it('recognises the formats phones produce', () => {
    assert.equal(sniffAudio(pad(Buffer.from('OggS')))?.mime, 'audio/ogg');
    assert.equal(sniffAudio(pad(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])))?.mime, 'audio/webm');
    assert.equal(sniffAudio(pad(Buffer.from('\0\0\0\x20ftypM4A ', 'latin1')))?.mime, 'audio/mp4');
    assert.equal(sniffAudio(pad(Buffer.from('ID3')))?.mime, 'audio/mpeg');
    assert.equal(sniffAudio(pad(Buffer.from([0xff, 0xfb, 0x90])))?.mime, 'audio/mpeg');
    assert.equal(sniffAudio(pad(Buffer.from([0xff, 0xf1, 0x50])))?.mime, 'audio/aac');
    assert.equal(sniffAudio(pad(Buffer.from('RIFF\0\0\0\0WAVE', 'latin1')))?.mime, 'audio/wav');
  });

  it('rejects anything else', () => {
    assert.equal(sniffAudio(pad(Buffer.from('<html><script>'))), null);
    assert.equal(sniffAudio(pad(Buffer.from('%PDF-1.4'))), null);
    assert.equal(sniffAudio(Buffer.from('OggS')), null);
  });
});

describe('text helpers', () => {
  it('cleans single lines', () => {
    assert.equal(cleanLine('  Late  Shri\n<b>Mohan</b>\u0000 ', 60), 'Late Shri bMohan/b');
    assert.equal(cleanLine('x'.repeat(100), 60).length, 60);
    assert.equal(cleanLine(undefined, 10), '');
  });

  it('keeps dedications to names and places', () => {
    assert.equal(dedicationProblem('Late Shri Mohandas Motwani'), null);
    assert.equal(dedicationProblem('स्वर्गीय श्री मोहनदास'), null);
    assert.ok(dedicationProblem('visit www.example.com'));
    assert.ok(dedicationProblem('buy at shop.in'));
    assert.ok(dedicationProblem('call 98200 12345'));
    assert.ok(dedicationProblem('mail me a@b.co'));
  });

  it('formats', () => {
    assert.equal(kebab('Tando Muhammad Khan'), 'tando-muhammad-khan');
    assert.equal(kebab('Pir jo Goth'), 'pir-jo-goth');
    assert.equal(formatDuration(59_600), '1:00');
    assert.equal(formatDuration(4_200), '0:04');
    assert.equal(formatRupees(110100), '₹1,101');
    assert.equal(formatRupees(510000), '₹5,100');
  });
});

describe('cookies', () => {
  it('parses and spots link-preview bots', () => {
    assert.deepEqual(parseCookies('a=1; awz_v=abc%20d; bad'), { a: '1', awz_v: 'abc d' });
    assert.ok(isBot('WhatsApp/2.23.20.0'));
    assert.ok(isBot('facebookexternalhit/1.1'));
    assert.ok(isBot(undefined));
    assert.ok(!isBot('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36'));
  });
});

describe('zip writer', () => {
  it('writes an archive that standard tools can read', async () => {
    const chunks = [];
    const zip = createZipWriter((buf) => chunks.push(buf));
    await zip.add('01-vatan-born.m4a', Buffer.from('fake audio bytes'));
    await zip.add('index.txt', Buffer.from('नमस्ते ॾाॾी\n', 'utf8'));
    await zip.finish();

    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'zip-')), 'out.zip');
    fs.writeFileSync(file, Buffer.concat(chunks));
    const check = `import zipfile,sys
z = zipfile.ZipFile(sys.argv[1])
assert z.testzip() is None
print(z.read('index.txt').decode('utf8'), end='')
print('|'.join(z.namelist()))`;
    const out = execFileSync('python3', ['-c', check, file], { encoding: 'utf8' });
    assert.equal(out, 'नमस्ते ॾाॾी\n01-vatan-born.m4a|index.txt\n');
  });
});

describe('razorpay signatures', () => {
  const rp = createRazorpay(RAZORPAY);
  it('verifies checkout signatures', () => {
    const signature = signPayment('order_1', 'pay_1');
    assert.ok(rp.verifyPayment({ orderId: 'order_1', paymentId: 'pay_1', signature }));
    assert.ok(!rp.verifyPayment({ orderId: 'order_2', paymentId: 'pay_1', signature }));
    assert.ok(!rp.verifyPayment({ orderId: 'order_1', paymentId: 'pay_1', signature: 'nothex' }));
    assert.ok(!rp.verifyPayment({ orderId: 'order_1', paymentId: 'pay_1' }));
  });

  it('verifies webhook signatures over the raw body', () => {
    const body = Buffer.from('{"event":"order.paid"}');
    assert.ok(rp.verifyWebhook(body, signWebhook(body)));
    assert.ok(!rp.verifyWebhook(Buffer.from('{"event":"order.paid" }'), signWebhook(body)));
    assert.ok(!createRazorpay({ ...RAZORPAY, webhookSecret: '' }).verifyWebhook(body, signWebhook(body)));
  });
});
