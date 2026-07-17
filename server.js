const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Simple shared-passcode gate so a public URL can't be used by strangers
// to send mail through YOUR smtp account. Set APP_PASSWORD when you deploy.
const APP_PASSWORD = process.env.APP_PASSWORD || "";

function requirePasscode(req, res, next) {
  if (!APP_PASSWORD) return next(); // no passcode configured, skip
  const supplied = req.header("x-app-password") || "";
  if (supplied !== APP_PASSWORD) {
    return res.status(401).json({ error: "Wrong passcode." });
  }
  next();
}

// Basic per-recipient personalization: replace {{name}} / {{email}}
function fillTemplate(str, data) {
  return str.replace(/{{\s*(\w+)\s*}}/g, (_, key) => (data[key] ?? ""));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

app.post("/api/send", requirePasscode, async (req, res) => {
  const {
    smtpHost,
    smtpPort,
    smtpSecure, // true for 465, false for 587/25
    smtpUser,
    smtpPass,
    fromEmail,
    fromName,
    replyTo,
    subject,
    bodyHtml,
    recipients, // [{ email, name }]
  } = req.body || {};

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    return res.status(400).json({ error: "Missing SMTP settings." });
  }
  if (!fromEmail || !subject || !bodyHtml) {
    return res.status(400).json({ error: "Missing from email, subject, or body." });
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: "No recipients." });
  }
  if (recipients.length > 200) {
    return res.status(400).json({ error: "Limit is 200 recipients per send." });
  }

  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: !!smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transporter.verify();
  } catch (err) {
    return res.status(400).json({ error: "SMTP login failed: " + err.message });
  }

  // Stream results back as newline-delimited JSON so the UI can show
  // live progress instead of waiting for all ~50 sends to finish.
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Transfer-Encoding", "chunked");

  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    const to = (r.email || "").trim();
    if (!to) continue;
    const personalized = { email: to, name: r.name || "" };

    try {
      await transporter.sendMail({
        from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
        to,
        replyTo: replyTo || fromEmail,
        subject: fillTemplate(subject, personalized),
        html: fillTemplate(bodyHtml, personalized),
      });
      sent++;
      res.write(JSON.stringify({ to, status: "sent", sent, failed, total: recipients.length }) + "\n");
    } catch (err) {
      failed++;
      res.write(JSON.stringify({ to, status: "failed", error: err.message, sent, failed, total: recipients.length }) + "\n");
    }

    // Small delay between sends to stay well under most providers' rate limits.
    await sleep(600);
  }

  res.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mail sender running on port ${PORT}`);
  if (!APP_PASSWORD) {
    console.log("WARNING: no APP_PASSWORD set — anyone with the URL can send mail through your SMTP account.");
  }
});
