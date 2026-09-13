const OpenAI = require('openai');
const { config, CATALOG } = require('./config');
const { getSettings, getActiveCustomContents } = require('./db');

const SYSTEM_PROMPT = `You are an elite cybersecurity consultant and underground technical marketer.
Persona: cynical, smart, bold, sharp, highly persuasive, slightly rebellious, zero corporate fluff.
You write in Hebrew (modern Israeli Hebrew, street-smart but professional).
Your goal: high-converting, viral-style posts for Telegram channels about cybersecurity services, pen-testing, awareness, and promotions.
Rules:
- Write in Hebrew only.
- Be engaging, direct, and persuasive. Use short punchy sentences.
- Structure with: bold text (use *bold* for Telegram MarkdownV2 or HTML), strategic emojis, quote-style blocks when useful.
- Never sound like generic marketing spam.
- Always end with a soft but clear call-to-action toward talking to the agent / joining the channel / group.
- Keep length optimal for Telegram (not too long, not too short – 4-8 short paragraphs max).
- Rotate tone: sometimes educational, sometimes FOMO, sometimes pure authority, sometimes special offer energy.`;

async function getOpenAIClient() {
  const settings = await getSettings();
  const apiKey = settings.aiApiKey || config.openaiApiKey;
  if (!apiKey) {
    throw new Error('No OpenAI API key configured');
  }
  return new OpenAI({ apiKey });
}

async function pickSource() {
  const customs = await getActiveCustomContents();
  const useCustom = customs.length > 0 && Math.random() < 0.45;

  if (useCustom) {
    const item = customs[Math.floor(Math.random() * customs.length)];
    return { type: 'custom', text: item.text, id: item.id };
  }

  const item = CATALOG[Math.floor(Math.random() * CATALOG.length)];
  return {
    type: 'catalog',
    text: `${item.title}\n\n${item.body}`,
    id: item.id,
  };
}

async function generatePost() {
  const source = await pickSource();
  const settings = await getSettings();
  const model = settings.aiModel || config.openaiModel;

  const client = await getOpenAIClient();

  const userPrompt = `Rewrite the following offer/content into a high-converting, viral Telegram post.
Make it feel fresh, bold, and written by a real underground cyber expert.
Use HTML formatting for Telegram (<b>bold</b>, <i>italic</i>, <code>code</code>, <blockquote>quote</blockquote>).
Include strategic emojis.
Do NOT include any links or buttons in the text – buttons are added separately.
Source content:
---
${source.text}
---

Write the final post only. No explanations.`;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.85,
    max_tokens: 900,
  });

  const raw = completion.choices[0]?.message?.content?.trim() || source.text;

  let text = raw
    .replace(/^```html\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  return {
    text,
    sourceType: source.type,
    sourceId: source.id,
  };
}

function buildInlineKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: '✨ Talk To Agent ✨',
          url: `https://t.me/${config.botUsername.replace('@', '')}`,
        },
      ],
      [
        { text: '📢 הערוץ הרשמי', url: config.channelUrl },
        { text: '👥 הקבוצה', url: config.groupUrl },
      ],
    ],
  };
}

module.exports = {
  generatePost,
  buildInlineKeyboard,
  pickSource,
};
