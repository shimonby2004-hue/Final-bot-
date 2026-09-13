const { PrismaClient } = require('@prisma/client');
const { config, SPEEDS } = require('./config');

const prisma = new PrismaClient();

async function ensureSettings() {
  let settings = await prisma.setting.findUnique({ where: { id: 1 } });
  if (!settings) {
    settings = await prisma.setting.create({
      data: {
        id: 1,
        mode: config.defaultMode,
        aiApiKey: config.openaiApiKey || null,
        aiModel: config.openaiModel,
      },
    });
  }
  return settings;
}

async function getSettings() {
  return ensureSettings();
}

async function updateMode(mode) {
  if (!SPEEDS[mode]) throw new Error('Invalid mode');
  return prisma.setting.update({
    where: { id: 1 },
    data: { mode },
  });
}

async function updateAiKey(apiKey, model = null) {
  const data = { aiApiKey: apiKey };
  if (model) data.aiModel = model;
  return prisma.setting.update({
    where: { id: 1 },
    data,
  });
}

async function getActiveTargets() {
  return prisma.target.findMany({ where: { isActive: true } });
}

async function addTarget({ chatId, title, type }) {
  return prisma.target.upsert({
    where: { chatId: String(chatId) },
    update: { title, type, isActive: true },
    create: {
      chatId: String(chatId),
      title: title || null,
      type: type || null,
      isActive: true,
    },
  });
}

async function removeTarget(chatId) {
  return prisma.target.updateMany({
    where: { chatId: String(chatId) },
    data: { isActive: false },
  });
}

async function getTargetByChatId(chatId) {
  return prisma.target.findUnique({ where: { chatId: String(chatId) } });
}

async function addCustomContent(text) {
  return prisma.customContent.create({
    data: { text: text.trim(), isActive: true },
  });
}

async function getActiveCustomContents() {
  return prisma.customContent.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function countCustomContents() {
  return prisma.customContent.count({ where: { isActive: true } });
}

async function getPostsForTarget(targetId, limit = 10) {
  return prisma.post.findMany({
    where: { targetId },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
}

async function createPost({ targetId, messageId, content, sourceType }) {
  return prisma.post.create({
    data: {
      targetId,
      messageId,
      content: content || null,
      sourceType: sourceType || null,
    },
  });
}

async function deletePostRecord(id) {
  return prisma.post.delete({ where: { id } });
}

async function getStats() {
  const [settings, targets, customCount, totalPosts, recentLogs] = await Promise.all([
    getSettings(),
    prisma.target.count({ where: { isActive: true } }),
    countCustomContents(),
    prisma.post.count(),
    prisma.postLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return {
    mode: settings.mode,
    aiConfigured: Boolean(settings.aiApiKey),
    activeTargets: targets,
    customContentCount: customCount,
    totalPosts,
    recentLogs,
  };
}

async function logAction(action, details = null) {
  return prisma.postLog.create({
    data: { action, details: details ? String(details).slice(0, 2000) : null },
  });
}

module.exports = {
  prisma,
  ensureSettings,
  getSettings,
  updateMode,
  updateAiKey,
  getActiveTargets,
  addTarget,
  removeTarget,
  getTargetByChatId,
  addCustomContent,
  getActiveCustomContents,
  countCustomContents,
  getPostsForTarget,
  createPost,
  deletePostRecord,
  getStats,
  logAction,
};
