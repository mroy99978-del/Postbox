# Postbox — a personal SMTP bulk sender

A tiny web app: enter your SMTP login, sender name/email, reply-to, subject,
body, and up to 200 recipients, and it sends them one by one with live
progress. Open it in Safari on your iPhone like any website.

Raw SMTP can't run inside a phone browser, so this has two parts:
- `server.js` — a small Node backend that actually talks SMTP (via nodemailer)
- `public/index.html` — the page you open on your phone

You need to put the backend somewhere reachable by a URL. Free options below.

## 1. Deploy the backend (one-time, ~5 minutes)

**Render.com (recommended, free tier):**
1. Create a free account at render.com.
2. Push this folder to a GitHub repo (or use Render's "Deploy from folder" if offered).
3. New → Web Service → connect the repo.
4. Build command: `npm install`   Start command: `npm start`
5. Add an environment variable: `APP_PASSWORD` = a passcode you make up.
   This is required — without it, anyone who finds your URL could send mail
   through your SMTP account.
6. Deploy. Render gives you a URL like `https://postbox-yourname.onrender.com`.

Railway.app and Fly.io work the same way if you prefer those.

Note: Render's free tier sleeps after inactivity, so the first open after a
while takes ~30 seconds to wake up — normal, just wait.

## 2. Use it on your iPhone

1. Open the Render URL in Safari.
2. Enter the passcode you set as `APP_PASSWORD`.
3. Fill in SMTP host/port/username/password (see below for common providers).
4. Fill in sender name, sender email, reply-to.
5. Write your subject and message. Use `{{name}}` and `{{email}}` to
   personalize each email.
6. Paste recipients, one per line: `email, name` (name optional).
7. Tap **Send** and watch live progress.

Tip: tap Share → **Add to Home Screen** in Safari so it opens like an app.

Everything you type (except the SMTP password, which is sent only at send
time) is saved in the browser's local storage on your phone, not on the
server, so you don't have to retype it every time.

## Common SMTP settings

| Provider | Host | Port | Security |
|---|---|---|---|
| Gmail | smtp.gmail.com | 587 | STARTTLS |
| Outlook/Microsoft 365 | smtp.office365.com | 587 | STARTTLS |
| SendGrid | smtp.sendgrid.net | 587 | STARTTLS |
| Your own host | (from your provider) | 587 or 465 | as specified |

Gmail and Outlook require an **app password** (not your normal login
password) once 2-factor auth is on — generate one in your account's security
settings.

## Good to know

- The 600ms pause between sends is there to stay under typical provider
  rate limits (Gmail caps around 500/day on a normal account, more on
  Workspace). For bigger lists, a transactional provider like SendGrid,
  Postmark, or Mailgun handles volume and deliverability far better than
  raw SMTP.
- Only send to people who've actually agreed to hear from you, and make it
  obvious how to opt out — that's both good practice and required by
  CAN-SPAM/GDPR-style rules depending on where your recipients are.
- This tool doesn't store your recipient lists or message history anywhere;
  it sends and forgets.
