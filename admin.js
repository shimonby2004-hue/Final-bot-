const { Markup } = require('telegraf');
const {
  getSettings,
  updateMode,
  updateAiKey,
  addTarget,
  removeTarget,
  getActiveTargets,
  addCustomContent,
  getStats,
  logAction,
} = require('./db');
const { SPEEDS, config } = require('./config');
const { processAllTargets } = require('./publisher');

const waitingState = new Map();

function isAdmin(ctx) {
  const id = ctx.from?.id;
  return id && config.adminIds.includes(id);
}

function mainMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🎯 ניהול יעדים', 'admin:targets')],
    [Markup.button.callback('⚙️ שינוי מצב', 'admin:speed')],
    [Markup.button.callback('🔑 מפתח AI', 'admin:aikey')],
    [Markup.button.callback('➕ הוספת תוכן למאגר', 'admin:addcontent')],
    [Markup.button.callback('📊 סטטיסטיקה', 'admin:stats')],
    [Markup.button.callback('⚡ פרסם עכשיו', 'admin:publish_now')],
  ]);
}

function speedKeyboard(current) {
  const rows = Object.values(SPEEDS).map((s) => {
    const prefix = s.key === current ? '✅ ' : '';
    return [Markup.button.callback(`${prefix}${s.label}`, `admin:setmode:${s.key}`)];
  });
  rows.push([Markup.button.callback('⬅️ חזרה', 'admin:menu')]);
  return Markup.inlineKeyboard(rows);
}

async function showMainMenu(ctx) {
  const settings = await getSettings();
  const modeLabel = SPEEDS[settings.mode]?.label || settings.mode;
  const text =
    `🎛️ *פאנל ניהול – Cyber Marketing Bot*\n\n` +
    `מצב נוכחי: ${modeLabel}\n` +
    `בחר פעולה:`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...mainMenuKeyboard(),
    });
  } else {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...mainMenuKeyboard(),
    });
  }
}

function registerAdminHandlers(bot) {
  bot.start(async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('🤖 בוט זה מיועד לניהול בלבד.\nלשירותים: ' + config.botUsername);
    }
    waitingState.delete(ctx.from.id);
    return showMainMenu(ctx);
  });

  bot.command('admin', async (ctx) => {
    if (!isAdmin(ctx)) return;
    waitingState.delete(ctx.from.id);
    return showMainMenu(ctx);
  });

  bot.action('admin:menu', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('אין הרשאה');
    await ctx.answerCbQuery();
    waitingState.delete(ctx.from.id);
    return showMainMenu(ctx);
  });

  bot.action('admin:targets', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('אין הרשאה');
    await ctx.answerCbQuery();
    const targets = await getActiveTargets();
    let text = '🎯 *ניהול יעדים*\n\n';
    if (targets.length === 0) {
      text += 'אין יעדים פעילים כרגע.\n\n';
    } else {
      text += targets
        .map((t, i) => `${i + 1}. \`${t.chatId}\` – ${t.title || 'ללא שם'} (${t.type || '?'})`)
        .join('\n');
      text += '\n\n';
    }
    text +=
      '➕ *להוספה:* העבר הודעה מהערוץ/קבוצה לכאן (Forward).\n' +
      '➖ *להסרה:* שלח `/remove_target CHAT_ID`\n\n' +
      'או לחץ חזרה לתפריט.';

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ חזרה', 'admin:menu')]]),
    });
  });

  bot.action('admin:speed', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('אין הרשאה');
    await ctx.answerCbQuery();
    const settings = await getSettings();
    await ctx.editMessageText('⚙️ *בחר מצב פרסום:*', {
      parse_mode: 'Markdown',
      ...speedKeyboard(settings.mode),
    });
  });

  bot.action(/admin:setmode:(.+)/, async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('אין הרשאה');
    const mode = ctx.match[1];
    if (!SPEEDS[mode]) return ctx.answerCbQuery('מצב לא תקין');
    await updateMode(mode);
    await logAction('mode_change', mode);
    await ctx.answerCbQuery(`עודכן ל-${SPEEDS[mode].label}`);
    return showMainMenu(ctx);
  });

  bot.action('admin:aikey', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('אין הרשאה');
    await ctx.answerCbQuery();
    waitingState.set(ctx.from.id, 'awaiting_ai_key');
    await ctx.editMessageText(
      '🔑 *עדכון מפתח AI*\n\nשלח עכשיו את מפתח ה-OpenAI החדש (מתחיל ב-sk-...).\nלביטול שלח /cancel',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ חזרה', 'admin:menu')]]),
      }
    );
  });

  bot.action('admin:addcontent', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('אין הרשאה');
    await ctx.answerCbQuery();
    waitingState.set(ctx.from.id, 'awaiting_custom_content');
    await ctx.editMessageText(
      '➕ *הוספת תוכן למאגר*\n\nשלח עכשיו את הטקסט / ההצעה / התבנית שתרצה לשמור.\nהבוט ישכתב אותה עם AI בפרסומים עתידיים.\nלביטול: /cancel',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ חזרה', 'admin:menu')]]),
      }
    );
  });

  bot.action('admin:stats', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('אין הרשאה');
    await ctx.answerCbQuery();
    const stats = await getStats();
    const modeLabel = SPEEDS[stats.mode]?.label || stats.mode;
    const text =
      `📊 *סטטיסטיקה*\n\n` +
      `• מצב נוכחי: ${modeLabel}\n` +
      `• יעדים פעילים: ${stats.activeTargets}\n` +
      `• תכנים מותאמים במאגר: ${stats.customContentCount}\n` +
      `• סה״כ פוסטים שנשלחו: ${stats.totalPosts}\n` +
      `• מפתח AI מוגדר: ${stats.aiConfigured ? '✅ כן' : '❌ לא'}\n` +
      `• סטטוס מערכת: 🟢 פעיל`;

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ חזרה', 'admin:menu')]]),
    });
  });

  bot.action('admin:publish_now', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('אין הרשאה');
    await ctx.answerCbQuery('מפרסם עכשיו...');
    await ctx.editMessageText('⚡ מפרסם פוסט חדש לכל היעדים... אנא המתן.');

    const result = await processAllTargets(bot);
    const text =
      `✅ *פרסום ידני הושלם*\n\n` +
      `פורסם ל-${result.published} יעדים\n` +
      `שגיאות: ${result.errors || 0}\n` +
      (result.message ? `\n${result.message}` : '');

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ חזרה', 'admin:menu')]]),
    });
  });

  bot.on('message', async (ctx, next) => {
    if (!isAdmin(ctx)) return next();

    const state = waitingState.get(ctx.from.id);

    if (ctx.message.forward_from_chat) {
      const chat = ctx.message.forward_from_chat;
      const chatId = String(chat.id);
      const title = chat.title || chat.username || null;
      const type = chat.type || null;

      try {
        await addTarget({ chatId, title, type });
        await logAction('target_added', chatId);
        waitingState.delete(ctx.from.id);
        await ctx.reply(
          `✅ יעד נוסף בהצלחה!\n\nChat ID: \`${chatId}\`\nשם: ${title || '—'}\nסוג: ${type || '—'}`,
          { parse_mode: 'Markdown', ...mainMenuKeyboard() }
        );
      } catch (err) {
        await ctx.reply(`❌ שגיאה בהוספת יעד: ${err.message}`);
      }
      return;
    }

    if (state === 'awaiting_ai_key') {
      const key = (ctx.message.text || '').trim();
      if (!key.startsWith('sk-')) {
        return ctx.reply('המפתח חייב להתחיל ב-sk-. נסה שוב או /cancel');
      }
      await updateAiKey(key);
      waitingState.delete(ctx.from.id);
      await logAction('ai_key_updated', 'key updated via admin');
      return ctx.reply('✅ מפתח AI עודכן בהצלחה ונשמר במסד הנתונים.', mainMenuKeyboard());
    }

    if (state === 'awaiting_custom_content') {
      const text = (ctx.message.text || ctx.message.caption || '').trim();
      if (!text || text.length < 10) {
        return ctx.reply('התוכן קצר מדי. שלח טקסט משמעותי או /cancel');
      }
      await addCustomContent(text);
      waitingState.delete(ctx.from.id);
      await logAction('custom_content_added', text.slice(0, 100));
      return ctx.reply('✅ התוכן נשמר במאגר הדינמי. הוא ייכנס לסיבוב הפרסומים.', mainMenuKeyboard());
    }

    return next();
  });

  bot.command('cancel', async (ctx) => {
    if (!isAdmin(ctx)) return;
    waitingState.delete(ctx.from.id);
    await ctx.reply('בוטל.', mainMenuKeyboard());
  });

  bot.command('remove_target', async (ctx) => {
    if (!isAdmin(ctx)) return;
    const parts = (ctx.message.text || '').split(/\s+/);
    const chatId = parts[1];
    if (!chatId) {
      return ctx.reply('שימוש: /remove_target CHAT_ID');
    }
    await removeTarget(chatId);
    await logAction('target_removed', chatId);
    await ctx.reply(`✅ היעד ${chatId} הוסר (סומן כלא פעיל).`, mainMenuKeyboard());
  });
}

module.exports = {
  registerAdminHandlers,
  isAdmin,
  showMainMenu,
};
