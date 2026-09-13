# Cyber Marketing Telegram Bot

Full-stack automated marketing Telegram bot for cybersecurity awareness, pen-testing services, and promotions.

## Features

- **Webhook-based** (Render.com free-tier friendly)
- **Three publishing speeds**: Slow (3h), Normal (1h), Boost (13min)
- **Rolling 3-post auto-cleanup** per target channel/group
- **Hebrew admin panel** with inline keyboards
- **AI copywriter** (OpenAI) – cynical, bold, high-converting cyber persona
- **Dynamic targets** via message forward
- **Custom content pool** + catalog rotation
- **Inline buttons** on every post: Talk to Agent + Channel + Group
- **PostgreSQL** via Prisma

## Quick Start (Local)

1. Copy `.env.example` → `.env` and fill values
2. Create a PostgreSQL database
3. Install & push schema:

```bash
npm install
npx prisma db push
```

4. Run:

```bash
npm start
```

## Render.com Deployment

1. Create a new **Web Service**
2. Set environment variables from `.env.example`
3. Build command: `npm install && npx prisma generate && npx prisma db push`
4. Start command: `npm start`
5. Add PostgreSQL (or use Supabase / Neon) and set `DATABASE_URL`

### External Cron

- URL: `https://YOUR-APP.onrender.com/api/cron/process-posts`
- Method: `POST`
- Header: `x-cron-secret: YOUR_CRON_SECRET`
- Schedule: every 5–10 minutes

### Keep-Alive

`GET https://YOUR-APP.onrender.com/api/healthcheck`

## Admin Commands

- `/start` or `/admin` – open control panel
- Forward any message from a channel/group → adds it as target
- `/remove_target CHAT_ID` – deactivate a target
- `/cancel` – cancel current input state

## Required Bot Permissions

In every target channel/group the bot must be admin with:
- Post messages
- Delete messages
