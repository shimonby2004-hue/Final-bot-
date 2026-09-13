const { getActiveTargets, getPostsForTarget, createPost, deletePostRecord, logAction } = require('./db');
const { generatePost, buildInlineKeyboard } = require('./ai');

async function publishToTarget(bot, target, generated) {
  const keyboard = buildInlineKeyboard();

  try {
    const sent = await bot.telegram.sendMessage(target.chatId, generated.text, {
      parse_mode: 'HTML',
      disable_web_page_preview: false,
      reply_markup: keyboard,
    });

    await createPost({
      targetId: target.id,
      messageId: sent.message_id,
      content: generated.text.slice(0, 500),
      sourceType: generated.sourceType,
    });

    // Rolling 3-post cleanup
    const posts = await getPostsForTarget(target.id, 20);
    if (posts.length > 3) {
      const toDelete = posts.slice(0, posts.length - 3);
      for (const old of toDelete) {
        try {
          await bot.telegram.deleteMessage(target.chatId, old.messageId);
          await deletePostRecord(old.id);
          await logAction('deleted', `target=${target.chatId} msg=${old.messageId}`);
        } catch (err) {
          await deletePostRecord(old.id);
          await logAction('error', `delete failed ${target.chatId}: ${err.message}`);
        }
      }
    }

    await logAction('published', `target=${target.chatId} type=${generated.sourceType}`);
    return { success: true, messageId: sent.message_id };
  } catch (err) {
    await logAction('error', `publish ${target.chatId}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function processAllTargets(bot) {
  const targets = await getActiveTargets();
  if (targets.length === 0) {
    await logAction('error', 'No active targets');
    return { published: 0, errors: 0, message: 'No active targets' };
  }

  let generated;
  try {
    generated = await generatePost();
  } catch (err) {
    await logAction('error', `AI generation failed: ${err.message}`);
    return { published: 0, errors: 1, message: `AI error: ${err.message}` };
  }

  let published = 0;
  let errors = 0;

  for (const target of targets) {
    const result = await publishToTarget(bot, target, generated);
    if (result.success) published += 1;
    else errors += 1;
    await new Promise((r) => setTimeout(r, 400));
  }

  return { published, errors, totalTargets: targets.length };
}

module.exports = {
  publishToTarget,
  processAllTargets,
};
