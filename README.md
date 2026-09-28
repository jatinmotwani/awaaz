# Awaaz — a family voice archive for Sindhi elders

Each Dada, Dadi, Nana or Nani gets an unlisted page. The family sits with them and records 60-second clips from
guided prompts: their town in Sindh, the Partition journey, lullabies, recipes, and 50 everyday Sindhi words.
The kids then learn Sindhi in their own grandparent's voice.

Families never pay, and there are no ads. The site runs on optional "in loving memory" dedications and one heritage
sponsor. Voices are never sold or licensed.

## What's in the MVP

| | |
|---|---|
| **No install, no login** | A PWA. Each page has a long random share link (anyone with it can listen) and a family PIN (needed to record or delete). A phone that has entered the PIN stays unlocked. |
| **Guided prompts** | 72 prompts in **Roman Sindhi + Devanagari**, with an English line for the grandchild holding the phone: *Vatan* (town in Sindh), *1947 jo Safar* (Partition), *Loliyun* (lullabies and songs), *Rasoi* (recipes), *50 Lafz* (words) and *Aasees* (a blessing). |
| **Recorder** | One tap starts it; clips run up to 60 s (15 s per word). Opus at ~24 kbps, a level meter, and screen wake-lock. You can re-take, and **Save to phone** if the upload fails. |
| **WhatsApp voice notes** | Any prompt can take an uploaded voice note instead of a live recording. This is also how you hand-build pages in week one. |
| **Learn Sindhi** | Word cards that play the elder's voice, plus a listen-and-pick quiz for kids. |
| **Growth loop** | *Share to family WhatsApp* on every page, and every page ends with **"Record your Nani too"**. Each page's referral code tracks which pages bring in new ones. |
| **Community map** | Opt-in only. Shows families per ancestral town ("2 families from Shikarpur"), with an SEO page and a shareable PNG card for each of ~80 towns, a sitemap, and nearby-town links. Names and recordings are never shown. |
| **Dedications** | ₹1,101 puts a line on a town page for 7 days; ₹5,100 also shows it on the Sindh map and home page. Razorpay Checkout handles payment and the line **publishes automatically**, whether the confirmation comes from the browser callback or the webhook. |
| **Heritage sponsor** | One footer line, set with `SPONSOR_TEXT` / `SPONSOR_URL`. |
| **Trust** | *Download all* gives a .zip of every clip with an index of what each one is. *Delete page* removes everything. The privacy page states the promises in plain words. |
| **Admin** | `/admin` shows the week-one numbers (devices that opened each page, referrals), and can hide a dedication or reset a forgotten PIN. |

## Run it locally

You need Node 22+ and Postgres 14+. ffmpeg is optional but recommended (see [Audio](#audio)).

```sh
npm install
createdb awaaz                      # or: docker run -e POSTGRES_PASSWORD=awaaz -p 5432:5432 postgres:16
cp .env.example .env                # local-development defaults; adjust DATABASE_URL if needed
npm run dev                         # http://localhost:3000, migrations run on start
```

Recording needs a secure context: `localhost` works. To test on a phone, use an HTTPS tunnel such as `cloudflared` or `ngrok`.

```sh
createdb awaaz_test
npm test                            # unit + integration tests (TEST_DATABASE_URL overrides the default)
```

Run `npm run images` to regenerate the PWA icons and `og.png` after editing `public/icons/icon.svg` (it needs Playwright).

## Deploy

The app is a single Node process with Postgres and a bucket. Suggested free or cheap setup:

1. **Postgres:** Neon or Supabase free tier. Put the URL, including `?sslmode=require`, in `DATABASE_URL`.
2. **Audio:** Cloudflare R2.
   - Create a bucket and an API token with *Object Read & Write* on that bucket.
   - Set `STORAGE_DRIVER=r2` and the `R2_*` variables.
   - The bucket stays private, and needs no CORS: playback redirects to a 6-hour presigned URL.
   - The free 10 GB tier holds several hundred hours of voices.
3. **App:** build the `Dockerfile` (it includes ffmpeg) on Render, Railway, Fly.io or a small VPS.
   - Set `NODE_ENV=production`, `PUBLIC_URL`, `APP_SECRET` (`openssl rand -hex 32`) and `TRUST_PROXY=1`.
   - **Avoid hosts that sleep when idle.** A relative who taps a WhatsApp link and waits 40 seconds won't come back.
4. **Razorpay (optional until launch):** until the keys are set, town pages say "Dedications open soon". To turn them on:
   - Complete KYC in Razorpay.
   - Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
   - Add a webhook for `order.paid` pointing at `https://<your-domain>/api/razorpay/webhook`, and put its secret in `RAZORPAY_WEBHOOK_SECRET`.
   - The copy calls dedications a paid listing, not a donation. Keep it that way unless you register for 80G.
5. **Admin:** set `ADMIN_TOKEN` to a long random string, then sign in at `/admin`.

`.env.example` lists every setting.

## Week one: validate before you build further

The plan is to have 5–10 families send WhatsApp voice notes for five prompts, hand-build their pages, and continue
only if relatives forward the links without being asked. The app is already your hand-building tool:

1. Create a page for each family on `/`, using a PIN you'll give them.
2. On each prompt, tap **Upload voice note** and pick the `.opus` file they sent. It is converted automatically.
3. Send the family only the page link.
4. Watch `/admin`:
   - **Devices** counts distinct phones that opened each page. If it grows well past the number of people you sent the link to, it is being forwarded.
   - **Referrals** counts new pages started from that page's "Record your Nani too" button.
   - WhatsApp's own link-preview fetches are not counted.

## Content

- `src/content/prompts.js`: sections and prompts.
- `src/content/words.js`: the 50 words, with emoji for the kids' quiz.
- `src/content/towns.js`: towns, districts and approximate coordinates for the map.

Prompt, word and town ids are stored with recordings and in URLs. Reword freely, but **never rename an id**.

> **Please review the Sindhi before launch.** The Roman and Devanagari prompts are a careful first draft. Ideally a
> fluent elder, and someone who reads Sindhi Devanagari, should check them. The Devanagari uses the Sindhi implosive
> letters ॻ ॼ ॾ ॿ, which display correctly with the Noto Sans Devanagari web font the pages load from Google Fonts.

## How it works

- **Server:** Express 5 renders plain HTML with an escaping template tag (`src/lib/html.js`). There is no front-end build step. The browser code is a few small ES modules in `public/js`. The data layer is in `src/repo.js` and the schema in `src/migrations`.
- **Links and PINs:**
  - Page slugs carry 60 random bits and audio ids 100 bits.
  - PINs are hashed with scrypt, and five wrong PINs lock a page for 15 minutes, doubling after that. The lock lives in Postgres, so a restart doesn't reset it.
  - The edit token is an HMAC of the page's PIN hash. Changing the PIN signs every other phone out without a sessions table.
- **Privacy:**
  - `Referrer-Policy: same-origin` keeps page links from leaking to other sites.
  - Elder pages and audio are `noindex`, and the map only ever sees counts.
  - The strict CSP allows only the app, Google Fonts and Razorpay.
- **<a id="audio"></a>Audio:**
  - Uploads are identified by magic bytes, never by the declared type.
  - With ffmpeg installed (`TRANSCODE=auto`), every clip is also converted to mono AAC `.m4a` at 32 kbps (~14 MB an hour), which plays on every phone, including iPhones that won't play WebM or Ogg voice notes. The original file is kept alongside it.
  - Without ffmpeg, files are stored and played as recorded.
- **PWA:**
  - Manifest and icons.
  - The service worker caches the app shell and recently opened pages, and shows an offline page when there is no connection. Audio and API calls always go to the network.

## Not built yet

- **v2: barsi and birthday reminders** by Gregorian date or tithi, which bring families back every year.
- An offline queue for recordings made with no signal. Today it offers *Try again* and *Save to phone*.
- An Arabic-script Sindhi line on prompts, for families in Pakistan and the Gulf.
