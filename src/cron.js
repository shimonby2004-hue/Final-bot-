const { getSettings, logAction } = require('./db');
const { SPEEDS } = require('./config');
const { processAllTargets } = require('./publisher');

let lastRunAt = 0;

function getIntervalMs(mode) {
  const speed = SPEEDS[mode] || SPEEDS.normal;
  return speed.intervalMinutes * 60 * 1000;
}

async function shouldRun() {
  const settings = await getSettings();
  const interval = getIntervalMs(settings.mode);
  const now = Date.now();
  return now - lastRunAt >= interval;
}

async function handleCron(bot) {
  const settings = await getSettings();
  const interval = getIntervalMs(settings.mode);

  const now = Date.now();
  if (now - lastRunAt < interval - 5000) {
    return {
      ran: false,
      reason: 'too_soon',
      mode: settings.mode,
      nextInMs: interval - (now - lastRunAt),
    };
  }

  lastRunAt = now;
  await logAction('cron_triggered', `mode=${settings.mode}`);

  const result = await processAllTargets(bot);

  return {
    ran: true,
    mode: settings.mode,
    ...result,
  };
}

async function forceRun(bot) {
  lastRunAt = Date.now();
  return processAllTargets(bot);
}

module.exports = {
  handleCron,
  forceRun,
  shouldRun,
  getIntervalMs,
};
