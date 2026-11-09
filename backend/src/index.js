// Comments backend for the Ama et Doce site: Cloudflare Worker + D1.
//
// Flow: a visitor asks for access (name + email) -> the owner gets an email with a review link ->
// Approve/Deny -> an approved user gets a one-time sign-in link by email -> the site exchanges it
// for a session token (kept in the browser, sent as a Bearer header; no cookies).
// Everyone can read comments; only approved users can post.

const enc = new TextEncoder();
const now = () => Math.floor(Date.now() / 1000);
const HOUR = 3600, DAY = 86400;

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (s) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));   // 64 hex chars

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function htmlPage(title, inner, status = 200) {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{font:18px/1.55 Georgia,serif;max-width:34rem;margin:3rem auto;padding:0 1rem;color:#1B2232}
button{font:inherit;padding:.55rem 1.2rem;margin-right:.6rem;border:1px solid #27478F;border-radius:4px;background:#27478F;color:#fff;cursor:pointer}
button.deny{background:#fff;color:#27478F}dl{background:#F2F3F6;padding:1rem 1.25rem;border-radius:6px}dt{font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;color:#586074}dd{margin:0 0 .6rem}</style>
</head><body>${inner}</body></html>`;
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'",
    },
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = [env.SITE_ORIGIN];
  if (env.ALLOW_LOCAL === "1") allowed.push("http://localhost:8000", "http://127.0.0.1:8000");
  const h = { Vary: "Origin" };
  if (origin && allowed.includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    h["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}

// ---- helpers -------------------------------------------------------------------------------

async function limited(env, key, max, windowSec) {
  const t = now();
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM hits WHERE key = ? AND at > ?").bind(key, t - windowSec).first();
  if (row.n >= max) return true;
  await env.DB.prepare("INSERT INTO hits (key, at) VALUES (?, ?)").bind(key, t).run();
  if (Math.random() < 0.02) await env.DB.prepare("DELETE FROM hits WHERE at < ?").bind(t - 2 * DAY).run();
  return false;
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > 12000) throw new HttpError(413, "Request too large.");
  try { return JSON.parse(text || "{}"); } catch { throw new HttpError(400, "Invalid JSON."); }
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const isOwner = (env, user) => user && user.email.toLowerCase() === env.OWNER_EMAIL.toLowerCase();

async function authUser(request, env) {
  const m = (request.headers.get("Authorization") || "").match(/^Bearer ([a-f0-9]{64})$/);
  if (!m) return null;
  return await env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.status FROM tokens t JOIN users u ON u.id = t.user_id
     WHERE t.hash = ? AND t.purpose = 'session' AND t.expires_at > ? AND u.status = 'approved'`
  ).bind(await sha256(m[1]), now()).first();
}

async function newToken(env, userId, purpose, ttlSec) {
  const token = randomToken();
  await env.DB.prepare("INSERT INTO tokens (hash, user_id, purpose, expires_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256(token), userId, purpose, now() + ttlSec).run();
  return token;
}

async function sendEmail(env, to, subject, text) {
  if (!env.RESEND_API_KEY) {                       // local development: show the email instead of sending it
    console.log(`\n--- EMAIL to ${to} ---\nSubject: ${subject}\n\n${text}\n--- END EMAIL ---\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.FROM_EMAIL, to: [to], subject, text }),
  });
  if (!res.ok) console.error("Email send failed", res.status, await res.text());
}

// Until a sending domain is verified in Resend, mail can only reach the owner. In that mode (EMAIL_USERS
// not "1") sign-in links for everyone else are emailed to the owner, who forwards them by hand.
const mailable = (env, user) => env.EMAIL_USERS === "1" || isOwner(env, user);

async function sendLoginLink(env, user, ttlSec = 15 * 60) {
  const token = await newToken(env, user.id, "login", ttlSec);
  const link = `${env.SITE_URL}#login=${token}`;
  const mins = Math.round(ttlSec / 60), expires = mins >= 120 ? `${Math.round(mins / 60 / 24)} days` : `${mins} minutes`;
  if (mailable(env, user)) {
    await sendEmail(env, user.email, "Your sign-in link for Ama et Doce",
      `Hello ${user.name},

Use this link to sign in and comment. It works once and expires in ${expires}:

${link}

If you didn't ask for this, ignore this email.
`);
  } else {
    await sendEmail(env, env.OWNER_EMAIL, `Ama et Doce: sign-in link for ${user.name}`,
      `${user.name} <${user.email}> needs a sign-in link. Forward this to them. It works once and expires in ${expires}:

${link}
`);
  }
  return link;
}

const EMAIL_RE = /^[^\s@<>"',;]{1,64}@[^\s@<>"',;]{1,255}\.[^\s@<>"',;]{2,}$/;
const clientIp = (request) => request.headers.get("CF-Connecting-IP") || "local";

// ---- routes --------------------------------------------------------------------------------

async function requestAccess(request, env, url) {
  const { name, email } = await readJson(request);
  const n = String(name || "").replace(/\s+/g, " ").trim();
  const e = String(email || "").trim().toLowerCase();
  if (!n || n.length > 80) throw new HttpError(400, "Please enter your name (up to 80 characters).");
  if (e.length > 120 || !EMAIL_RE.test(e)) throw new HttpError(400, "Please enter a valid email address.");
  if (await limited(env, `req-ip:${clientIp(request)}`, 5, HOUR) || await limited(env, "req-all", 30, DAY))
    throw new HttpError(429, "Too many requests. Please try again later.");

  const reply = { ok: true, message: "Thanks. Your request has been sent for approval. You'll get an email when it's approved." };
  const existing = await env.DB.prepare("SELECT id, name, email, status FROM users WHERE email = ?").bind(e).first();
  if (existing) {
    if (existing.status === "approved") {
      await sendLoginLink(env, existing);
      return json({ ok: true, message: "You already have access. A sign-in link has been requested." + (env.EMAIL_USERS === "1" ? "" : " The site owner sends these personally, so it may take a little while.") });
    }
    return json(reply);                           // pending or denied: say nothing new, send nothing
  }

  const owner = e === env.OWNER_EMAIL.toLowerCase();
  const ins = await env.DB.prepare("INSERT INTO users (email, name, status, created_at) VALUES (?, ?, ?, ?)")
    .bind(e, n, owner ? "approved" : "pending", now()).run();
  const user = { id: ins.meta.last_row_id, name: n, email: e };
  if (owner) {
    await sendLoginLink(env, user);
    return json({ ok: true, message: "Welcome back. We've emailed you a sign-in link." });
  }
  const token = await newToken(env, user.id, "approve", 30 * DAY);
  await sendEmail(env, env.OWNER_EMAIL, "Ama et Doce: new comment access request",
    `${n} <${e}> asked to join the comments on Ama et Doce.\n\nReview (approve or deny):\n${url.origin}/admin/review?t=${token}\n`);
  return json(reply);
}

async function lookupApproval(env, token) {
  if (!/^[a-f0-9]{64}$/.test(token || "")) return null;
  return await env.DB.prepare(
    `SELECT t.hash, u.id, u.name, u.email, u.status FROM tokens t JOIN users u ON u.id = t.user_id
     WHERE t.hash = ? AND t.purpose = 'approve' AND t.used_at IS NULL AND t.expires_at > ?`
  ).bind(await sha256(token), now()).first();
}

async function adminReview(env, url) {
  const t = url.searchParams.get("t");
  const row = await lookupApproval(env, t);
  if (!row) return htmlPage("Link expired", "<h1>This link is no longer valid</h1><p>It may have been used already, or it has expired.</p>", 404);
  return htmlPage("Review request", `<h1>Comment access request</h1>
<dl><dt>Name</dt><dd>${esc(row.name)}</dd><dt>Email</dt><dd>${esc(row.email)}</dd></dl>
<form method="post" action="/admin/decide"><input type="hidden" name="t" value="${esc(t)}">
<button name="decision" value="approve">Approve</button><button class="deny" name="decision" value="deny">Deny</button></form>`);
}

async function adminDecide(request, env) {
  const form = await request.formData();
  const row = await lookupApproval(env, String(form.get("t") || ""));
  if (!row) return htmlPage("Link expired", "<h1>This link is no longer valid</h1>", 404);
  const approve = form.get("decision") === "approve";
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET status = ? WHERE id = ?").bind(approve ? "approved" : "denied", row.id),
    env.DB.prepare("UPDATE tokens SET used_at = ? WHERE hash = ?").bind(now(), row.hash),
  ]);
  let link = "";
  if (approve) link = await sendLoginLink(env, row, 7 * DAY);
  return htmlPage("Done", `<h1>${approve ? "Approved" : "Denied"}</h1><p>${esc(row.name)} (${esc(row.email)}) was ${approve ? "approved" : "denied; no email was sent"}.</p>${approve ? `<p>Send them this one-time sign-in link (valid 7 days). A copy was also emailed to you:</p><p style="overflow-wrap:anywhere"><a href="${esc(link)}">${esc(link)}</a></p>` : ""}`);
}

async function login(request, env) {
  const { email } = await readJson(request);
  const e = String(email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(e) || e.length > 120) throw new HttpError(400, "Please enter a valid email address.");
  if (await limited(env, `login-email:${e}`, 5, HOUR) || await limited(env, `login-ip:${clientIp(request)}`, 20, HOUR))
    throw new HttpError(429, "Too many attempts. Please try again later.");
  const user = await env.DB.prepare("SELECT id, name, email FROM users WHERE email = ? AND status = 'approved'").bind(e).first();
  if (user) await sendLoginLink(env, user);
  return json({ ok: true, message: "If that address has access, a sign-in link is on its way." + (env.EMAIL_USERS === "1" ? "" : " The site owner sends these personally, so it may take a little while.") });   // same answer either way
}

async function verify(request, env) {
  const { token } = await readJson(request);
  if (!/^[a-f0-9]{64}$/.test(token || "")) throw new HttpError(400, "Invalid link.");
  const hash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT u.id, u.name, u.email FROM tokens t JOIN users u ON u.id = t.user_id
     WHERE t.hash = ? AND t.purpose = 'login' AND t.used_at IS NULL AND t.expires_at > ? AND u.status = 'approved'`
  ).bind(hash, now()).first();
  if (!row) throw new HttpError(400, "That sign-in link has expired or was already used. Request a new one.");
  await env.DB.prepare("UPDATE tokens SET used_at = ? WHERE hash = ?").bind(now(), hash).run();
  const session = await newToken(env, row.id, "session", 30 * DAY);
  return json({ ok: true, session, user: { name: row.name, owner: isOwner(env, row) } });
}

async function logout(request, env) {
  const m = (request.headers.get("Authorization") || "").match(/^Bearer ([a-f0-9]{64})$/);
  if (m) await env.DB.prepare("DELETE FROM tokens WHERE hash = ? AND purpose = 'session'").bind(await sha256(m[1])).run();
  return json({ ok: true });
}

const DAY_RE = /^[a-z0-9-]{3,100}$/;
const PANELS = new Set(["", "saint", "fathers", "summa"]);

async function listComments(request, env, url) {
  const day = url.searchParams.get("day") || "";
  if (!DAY_RE.test(day)) throw new HttpError(400, "Bad day.");
  const me = await authUser(request, env);
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.panel, c.parent_id, c.body, c.quote, c.prefix, c.suffix, c.created_at, c.deleted, c.user_id, u.name
     FROM comments c JOIN users u ON u.id = c.user_id WHERE c.day = ? ORDER BY c.created_at, c.id`
  ).bind(day).all();
  const hasReplies = new Set(results.filter((c) => !c.deleted && c.parent_id).map((c) => c.parent_id));
  const out = results
    .filter((c) => !c.deleted || hasReplies.has(c.id))   // a deleted comment stays only as a stub if it has replies
    .map((c) => ({
      id: c.id, panel: c.panel, parent_id: c.parent_id, created_at: c.created_at,
      deleted: !!c.deleted,
      name: c.deleted ? "" : c.name, body: c.deleted ? "" : c.body,
      quote: c.quote, prefix: c.prefix, suffix: c.suffix,
      mine: !!me && c.user_id === me.id,
      can_delete: !c.deleted && !!me && (c.user_id === me.id || isOwner(env, me)),
    }));
  return json({ comments: out });
}

async function postComment(request, env) {
  const me = await authUser(request, env);
  if (!me) throw new HttpError(401, "Please sign in to comment.");
  const b = await readJson(request);
  const day = String(b.day || "");
  const panel = String(b.panel || "");
  const body = String(b.body || "").replace(/\r\n/g, "\n").trim();
  if (!DAY_RE.test(day) || !PANELS.has(panel)) throw new HttpError(400, "Bad request.");
  if (!body || body.length > 2000) throw new HttpError(400, "Comments must be 1 to 2000 characters.");
  if (await limited(env, `post:${me.id}`, 30, HOUR)) throw new HttpError(429, "You're posting quickly. Please wait a bit.");

  let parentId = null, quote = null, prefix = null, suffix = null;
  if (b.parent_id) {
    const p = await env.DB.prepare("SELECT id, parent_id, day, panel FROM comments WHERE id = ? AND deleted = 0").bind(Number(b.parent_id)).first();
    if (!p || p.day !== day) throw new HttpError(400, "The comment you're replying to no longer exists.");
    parentId = p.parent_id || p.id;                         // threads are one level deep
  } else if (b.quote) {
    if (!panel) throw new HttpError(400, "Bad request.");
    quote = String(b.quote).slice(0, 400);
    prefix = String(b.prefix || "").slice(-60);
    suffix = String(b.suffix || "").slice(0, 60);
  }
  const ins = await env.DB.prepare(
    "INSERT INTO comments (day, panel, parent_id, user_id, body, quote, prefix, suffix, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(day, parentId ? "" : panel, parentId, me.id, body, quote, prefix, suffix, now()).run();
  return json({ ok: true, id: ins.meta.last_row_id }, 201);
}

async function deleteComment(request, env, id) {
  const me = await authUser(request, env);
  if (!me) throw new HttpError(401, "Please sign in.");
  const c = await env.DB.prepare("SELECT id, user_id FROM comments WHERE id = ? AND deleted = 0").bind(id).first();
  if (!c) throw new HttpError(404, "Not found.");
  if (c.user_id !== me.id && !isOwner(env, me)) throw new HttpError(403, "You can only delete your own comments.");
  await env.DB.prepare("UPDATE comments SET deleted = 1, body = '' WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

async function route(request, env, url) {
  const { pathname: p } = url, m = request.method;
  if (p === "/admin/review" && m === "GET") return adminReview(env, url);
  if (p === "/admin/decide" && m === "POST") return adminDecide(request, env);
  if (p === "/api/request-access" && m === "POST") return requestAccess(request, env, url);
  if (p === "/api/login" && m === "POST") return login(request, env);
  if (p === "/api/verify" && m === "POST") return verify(request, env);
  if (p === "/api/logout" && m === "POST") return logout(request, env);
  if (p === "/api/me" && m === "GET") {
    const me = await authUser(request, env);
    return me ? json({ user: { name: me.name, owner: isOwner(env, me) } }) : json({ user: null });
  }
  if (p === "/api/comments" && m === "GET") return listComments(request, env, url);
  if (p === "/api/comments" && m === "POST") return postComment(request, env);
  const del = p.match(/^\/api\/comments\/(\d+)$/);
  if (del && m === "DELETE") return deleteComment(request, env, Number(del[1]));
  if (p === "/") return htmlPage("Ama et Doce comments", "<p>Comments service for Ama et Doce.</p>");
  return json({ error: "Not found." }, 404);
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      res = await route(request, env, new URL(request.url));
    } catch (err) {
      if (err instanceof HttpError) res = json({ error: err.message }, err.status);
      else { console.error(err); res = json({ error: "Something went wrong." }, 500); }
    }
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
};
