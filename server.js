require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const { config } = require('./config');
const { ensureSettings, logAction } = require('./db');
const { registerAdminHandlers } = require('./admin');
const { handleCron } = require('./cron');

if (!config.botToken) {
  console.error('BOT_TOKEN is required');
  process.exit(1);
}

const bot = new Telegraf(config.botToken);
const app = express();

app.use(express.json());

app.get('/api/healthcheck', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'cyber-marketing-bot',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.status(200).send('Cyber Marketing Telegram Bot is running.');
});

app.post('/api/cron/process-posts', async (req, res) => {
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (!secret || secret !== config.cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await handleCron(bot);
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('Cron error:', err);
    await logAction('error', `cron: ${err.message}`);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post(config.webhookPath, async (req, res) => {
  try {
    const secretToken = req.headers['x-telegram-bot-api-secret-token'];
    if (config.webhookSecret && secretToken && secretToken !== config.webhookSecret) {
      return res.status(401).send('Unauthorized');
    }

    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Error');
  }
});

registerAdminHandlers(bot);

bot.catch(async (err, ctx) => {
  console.error('Bot error:', err);
  try {
    await logAction('error', `bot: ${err.message}`);
  } catch (_) {}
});

async function bootstrap() {
  await ensureSettings();

  if (config.webhookDomain) {
    const webhookUrl = `${config.webhookDomain.replace(/\/$/, '')}${config.webhookPath}`;
    try {
      await bot.telegram.setWebhook(webhookUrl, {
        secret_token: config.webhookSecret || undefined,
        drop_pending_updates: true,
      });
      console.log(`Webhook set to: ${webhookUrl}`);
    } catch (err) {
      console.error('Failed to set webhook:', err.message);
    }
  } else {
    console.warn('WEBHOOK_DOMAIN not set – running without automatic webhook registration');
  }

  app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
    console.log(`Health: GET /api/healthcheck`);
    console.log(`Cron:   POST /api/cron/process-posts`);
    console.log(`Webhook path: ${config.webhookPath}`);
  });
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
