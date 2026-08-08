# Substate — deployment guide

This is a real Node.js + Express + MongoDB backend for the Substate marketplace.
Signups, logins (with timestamps), and every listing a seller posts (price,
location, etc.) are saved permanently in a real database — not the browser's
localStorage, and not a demo storage that resets.

Total cost to run this for real: **$0/month**, using free tiers of MongoDB
Atlas (database) and Render (hosting).

---

## What's in this folder

```
substate-app/
├── server.js           # Express app entry point
├── seed.js              # loads the 14 sample listings on first run
├── models/               # User, Login, Listing (MongoDB schemas)
├── routes/                # /api/auth, /api/listings, /api/admin
├── middleware/auth.js    # JWT login-check middleware
├── public/index.html    # the whole frontend (one file)
├── test/                  # automated tests — run with `npm test`
├── .env.example           # copy to .env for local dev
└── package.json
```

---

## Part 1 — Create a free database (MongoDB Atlas)

1. Go to **https://www.mongodb.com/cloud/atlas/register** and make a free account.
2. When asked, create a **free "M0" cluster** (this tier is free forever, no
   credit card needed for the free tier itself).
3. **Create a database user**: Database Access → Add New Database User.
   Pick a username and password — write the password down, you'll need it
   in a minute. Give it "Read and write to any database" permission.
4. **Allow network access**: Network Access → Add IP Address → choose
   "Allow access from anywhere" (`0.0.0.0/0`). This is fine for this project
   since the database itself is still protected by the username/password.
5. **Get your connection string**: go to Database → Connect → "Drivers".
   Copy the string, it looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<username>` and `<password>` with the ones from step 3, and add
   a database name right after `.net/`, e.g.:
   ```
   mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/substate?retryWrites=true&w=majority
   ```
   Save this whole string somewhere — it's your `MONGODB_URI`.

---

## Part 2 — Test it locally first (optional but recommended)

1. Install [Node.js](https://nodejs.org) if you don't have it (v18 or newer).
2. In this folder, run:
   ```
   npm install
   cp .env.example .env
   ```
3. Open `.env` and fill in:
   ```
   MONGODB_URI=<the connection string from Part 1>
   JWT_SECRET=<any long random string>
   ```
   To generate a good `JWT_SECRET`, run:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. Start the server:
   ```
   npm start
   ```
5. Open **http://localhost:3000** in your browser. Try signing up, logging
   in, and posting a listing. Check `/api/health` returns `{"ok":true}`.
6. You can also run `npm test` any time to re-run the automated checks.

---

## Part 3 — Put the code on GitHub

1. Create a new (private or public) repo on GitHub.
2. From this folder:
   ```
   git init
   git add .
   git commit -m "Substate marketplace"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
   (`.env` is already excluded via `.gitignore` — never commit your real
   database password to GitHub.)

---

## Part 4 — Deploy on Render (free)

1. Go to **https://render.com** and sign up (you can sign in with GitHub).
2. Click **New +** → **Web Service**.
3. Connect your GitHub account and pick the repo you just pushed.
4. Fill in:
   - **Name**: whatever you want (e.g. `substate`)
   - **Region**: closest to you
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**
5. Scroll to **Environment Variables** and add:
   - `MONGODB_URI` = your connection string from Part 1
   - `JWT_SECRET` = your random secret from Part 2
   - `ADMIN_KEY` = any password you choose — this protects the "Database
     (demo)" page in the app, so only people who know this key can view
     signups and login history
   (Don't set `PORT` — Render sets it automatically.)
6. Click **Create Web Service**. Render will build and deploy it — takes
   a few minutes the first time.
7. Once it's live, Render gives you a public URL like
   `https://substate.onrender.com` — that's your real, public website.

---

## Things worth knowing

- **Free Render services sleep after inactivity** and take ~30–50 seconds
  to wake up on the next visit. This is normal on the free tier. If that's
  annoying, Render's cheapest paid tier ($7/mo) keeps it always-on.
- **Passwords are hashed** (bcrypt) before being saved — even you can't see
  a user's real password by looking at the database.
- **The "Database (demo)" page** (in the ⋯ menu) now requires the `ADMIN_KEY`
  you set above — it'll prompt you for it the first time, then remember it
  for that browser tab. This is a simple shared-password gate, not a full
  admin role system — good enough to keep random visitors out, but if you
  want proper multi-admin accounts later, `middleware/adminAuth.js` is
  where you'd swap in something more robust.
- **Favorites/saved listings** still live in the browser (`localStorage`),
  not the database — only signups, logins, and listings are server-side
  right now. Say the word if you want favorites tied to accounts too.
- To add more admins/features later, everything is plain Express routes —
  nothing exotic, so any Node.js tutorial's patterns will apply directly.
