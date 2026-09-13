require('dotenv').config();

const config = {
  botToken: process.env.BOT_TOKEN,
  adminIds: (process.env.ADMIN_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number),
  webhookDomain: process.env.WEBHOOK_DOMAIN || '',
  webhookPath: process.env.WEBHOOK_PATH || '/api/telegram/webhook',
  webhookSecret: process.env.WEBHOOK_SECRET || 'change-me-webhook-secret',
  cronSecret: process.env.CRON_SECRET || 'change-me-cron-secret',
  databaseUrl: process.env.DATABASE_URL,
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  defaultMode: process.env.DEFAULT_MODE || 'normal',
  port: parseInt(process.env.PORT || '3000', 10),
  channelUrl: 'https://t.me/Hack_service_4YOU',
  groupUrl: 'https://t.me/we_hack_4FUN',
  botUsername: '@hack_service_4YOU_bot',
};

const SPEEDS = {
  slow: {
    key: 'slow',
    label: '🐢 איטי (Slow)',
    intervalMinutes: 180,
  },
  normal: {
    key: 'normal',
    label: '⚡ רגיל (Normal)',
    intervalMinutes: 60,
  },
  boost: {
    key: 'boost',
    label: '🚀 בוסט (Boost)',
    intervalMinutes: 13,
  },
};

const CATALOG = [
  {
    id: 'master_hack',
    title: '👾 MASTER HACK',
    body: 'שירותי סייבר ואבטחת מידע מתקדמים – בדיקות חוסן, מבדקי חדירות (Penetration Testing), ופתרונות אבטחה מותאמים אישית. אנחנו לא מדברים – אנחנו פורצים (בצורה לגיטימית) ומראים לך איפה החורים.',
  },
  {
    id: 'promo_pack',
    title: '🐦 חבילת פרסום וקידום',
    body: 'הגדלת חשיפה וקהל בערוצים ובקבוצות. גיוס מנויים איכותיים, קידום אורגני + טקטי, ובניית נוכחות שמרגישה אמיתית ולא ספאם.',
  },
  {
    id: 'cyber_consult',
    title: '🛡️ יעוץ סייבר והגנה היקפית',
    body: 'פתרונות אבטחה, שחזור גישות, הגנה על פרטיות ברשת. ייעוץ מקצועי שמתחיל מ-300₪. כי מי שלא מגנים עליו – נפרץ.',
  },
  {
    id: 'special_offers',
    title: '🔥 מבצעים מיוחדים והנחות',
    body: 'מבצעים בלעדיים לחברי הערוץ והקבוצה בלבד. הנחות על חבילות, בונוסים, וגישה מוקדמת לשירותים חדשים. מי שבפנים – מרוויח.',
  },
];

module.exports = {
  config,
  SPEEDS,
  CATALOG,
};
