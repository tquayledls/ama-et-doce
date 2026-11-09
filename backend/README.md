# Comments backend

Cloudflare Worker + D1. Visitors request access (name + email), the owner approves from an email link,
approved users sign in with a one-time email link, and can then highlight text or join a per-day thread.
Anyone can read comments.

## One-time deploy

You need a free Cloudflare account and a free [Resend](https://resend.com) account.

```bash
cd backend
npm install
npx wrangler login
npx wrangler d1 create ama-et-doce-comments      # copy the database_id it prints into wrangler.toml
npm run migrate:remote
npx wrangler secret put RESEND_API_KEY           # paste your Resend API key
npx wrangler deploy                              # prints https://ama-et-doce-comments.<you>.workers.dev
```

Then put that Worker URL in `saints/tools/comments_api.txt`, run `python3 saints/tools/build_site.py`,
and push to `daily`. Pages built without that file have no comments.

## Email sender

`FROM_EMAIL` in `wrangler.toml` defaults to Resend's `onboarding@resend.dev`, which only delivers to the
Resend account owner. That is enough for approval emails to you, but sign-in links to other people need a
verified sending domain in Resend; set `FROM_EMAIL` to an address on it, then redeploy.

## Local testing

Create `backend/.dev.vars`:

```
OWNER_EMAIL=you@example.com
SITE_URL=http://localhost:8000/
SITE_ORIGIN=http://localhost:8000
ALLOW_LOCAL=1
```

Run `npm run migrate:local && npm run dev`, build with `COMMENTS_API=http://localhost:8787 python3 saints/tools/build_site.py`,
and serve `saints/site` on port 8000. Without `RESEND_API_KEY` the emails (with their links) are printed in the Worker log.
Rebuild without `COMMENTS_API` afterwards so localhost doesn't get committed.

## Moderation

The owner email (`OWNER_EMAIL`) is auto-approved and can delete any comment. Users can delete their own.
