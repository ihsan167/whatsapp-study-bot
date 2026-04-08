const Groq = require('groq-sdk');
const { recordResponse, hasResponded, getWeeklyResponses } = require('./store');
const { getCurrentTopic } = require('./topics');
const config = require('./config');

const groq = new Groq({ apiKey: config.groqApiKey });

// Injected at startup from index.js to avoid circular dependency with scheduler
let sendWeeklyReminder = null;
function setSendWeeklyReminder(fn) { sendWeeklyReminder = fn; }

// Track IDs of messages the bot itself sent — so we don't respond to our own replies
const botSentIds = new Set();
function trackBotMessage(msg) {
  if (!msg || !msg.id) return;
  const id = msg.id._serialized;
  botSentIds.add(id);
  // Clean up after 5 minutes to avoid memory leak
  setTimeout(() => botSentIds.delete(id), 5 * 60 * 1000);
}

// Track the ID of the last reminder message (for quote-reply detection)
let lastReminderMessageId = null;
function setLastReminderMessageId(id) { lastReminderMessageId = id; }

// ─── Commands ────────────────────────────────────────────────────────────────

const COMMANDS = {
  '!help':   handleHelp,
  '!topic':  handleTopic,
  '!status': handleStatus,
  '!update': handleUpdate,
  '!remind': handleRemind,
};

async function handleHelp(client, message) {
  const reply = await message.reply(
    `*Study Bot Commands*\n\n` +
    `!help — show this list\n` +
    `!topic — this week's study topic\n` +
    `!status — who has submitted an update this week\n` +
    `!update <your update> — submit your study update anytime\n` +
    `!remind — send the weekly reminder now (testing)\n\n` +
    `You can also just ask me anything tech-related and I'll answer! 💬`
  );
  trackBotMessage(reply);
}

async function handleTopic(client, message) {
  const topic = getCurrentTopic();
  const reply = await message.reply(
    `*This week's topic: ${topic.name}*\n\n` +
    `${topic.description}\n\n` +
    `Resources: ${topic.resources}`
  );
  trackBotMessage(reply);
}

async function handleStatus(client, message) {
  const responses = getWeeklyResponses();
  const names = Object.keys(responses);

  let replyText;
  if (names.length === 0) {
    replyText = 'No updates submitted this week yet. Be the first! Use *!update <your update>* to share.';
  } else {
    const list = names.map((name) => `✅ ${name} — ${responses[name].summary}`).join('\n');
    replyText = `*Weekly updates so far (${names.length}):*\n\n${list}`;
  }

  const reply = await message.reply(replyText);
  trackBotMessage(reply);
}

async function handleUpdate(client, message, senderName, updateText) {
  if (!updateText) {
    const reply = await message.reply(
      'Please include your update. Example:\n*!update* Belajar React hooks hari ni, buat todo app'
    );
    trackBotMessage(reply);
    return;
  }

  const alreadyResponded = hasResponded(senderName);
  const [acknowledgment, summary] = await Promise.all([
    analyzeAndAcknowledge(senderName, updateText),
    extractSummary(updateText),
  ]);

  recordResponse(senderName, summary);
  const reply = await message.reply(acknowledgment);
  trackBotMessage(reply);

  if (!alreadyResponded) await message.react('✅');

  console.log(`[${new Date().toLocaleString()}] Update from ${senderName}: ${summary}`);
}

async function handleRemind(client, message) {
  if (!sendWeeklyReminder) {
    const reply = await message.reply('Remind function not available yet.');
    trackBotMessage(reply);
    return;
  }
  const reply = await message.reply('Sending weekly reminder now...');
  trackBotMessage(reply);
  await sendWeeklyReminder(client);
}

// ─── General chatbot ─────────────────────────────────────────────────────────

async function handleGeneralChat(message, senderName, messageText) {
  const topic = getCurrentTopic();

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 400,
    messages: [
      {
        role: 'system',
        content: `You are a helpful study group bot in a WhatsApp group focused on programming, app development, full stack development, and AI/technology.

Your personality: friendly, concise, encouraging, knowledgeable about tech.

Guidelines:
- Keep answers SHORT and practical — this is WhatsApp, not a blog post
- Match the language the user wrote in (Bahasa Melayu OR English)
- If it's a tech question, give a clear direct answer with a quick example if needed
- If it's casual chat or a greeting, respond naturally and briefly
- If someone shares something they learned, acknowledge it warmly
- This week's group study topic is: ${topic.name}
- You do NOT need to mention the weekly topic unless it's directly relevant`,
      },
      {
        role: 'user',
        content: `${senderName} says: "${messageText}"`,
      },
    ],
  });

  return response.choices[0].message.content.trim();
}

// ─── Study update helpers ─────────────────────────────────────────────────────

function isStudyUpdate(message) {
  if (lastReminderMessageId && message.hasQuotedMsg) return true;
  const now = new Date();
  return now.getDay() === 0 && now.getHours() >= 10;
}

async function analyzeAndAcknowledge(senderName, messageText) {
  const topic = getCurrentTopic();

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 300,
    messages: [
      {
        role: 'system',
        content: `You are a friendly study group bot. A member shared their weekly study update.
Write a short acknowledgment (2-3 sentences):
1. Mention specifically what they studied
2. Add one encouraging tip or next step
Rules: SHORT, match their language (BM or English), genuine, use their name. This week's topic: ${topic.name}`,
      },
      {
        role: 'user',
        content: `Member: ${senderName}\nUpdate: "${messageText}"\n\nWrite acknowledgment:`,
      },
    ],
  });

  return response.choices[0].message.content.trim();
}

async function extractSummary(messageText) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 60,
    messages: [
      { role: 'system', content: 'Summarize in 1 sentence what this person studied or learned. Be concise.' },
      { role: 'user', content: messageText },
    ],
  });
  return response.choices[0].message.content.trim();
}

// ─── Skip trivial messages ────────────────────────────────────────────────────

const SKIP_PHRASES = new Set([
  'ok', 'okay', 'k', 'haha', 'hehe', 'lol', 'lmao',
  'noted', 'thanks', 'thank you', 'terima kasih', 'tq', 'ty',
  '👍', '👌', '😂', '🙏',
]);

function isTrivial(text) {
  return text.length < 3 || SKIP_PHRASES.has(text.toLowerCase());
}

// ─── Main handler ─────────────────────────────────────────────────────────────

async function handleMessage(client, message) {
  try {
    // Only handle group messages
    if (!message.from.endsWith('@g.us')) return;

    // Check it's our target group
    const chat = await message.getChat();
    if (chat.name !== config.groupName) return;

    // Skip messages the bot itself sent (prevents reply loops)
    if (botSentIds.has(message.id._serialized)) return;

    const contact = await message.getContact();
    const senderName = contact.pushname || contact.name || contact.number;
    const messageText = message.body.trim();

    if (!messageText) return;

    // ── Commands (work any day, any time) ──
    if (messageText.startsWith('!')) {
      const spaceIndex = messageText.indexOf(' ');
      const command = (spaceIndex === -1 ? messageText : messageText.slice(0, spaceIndex)).toLowerCase();
      const args = spaceIndex === -1 ? '' : messageText.slice(spaceIndex + 1).trim();

      if (COMMANDS[command]) {
        await COMMANDS[command](client, message, senderName, args);
        return;
      }
    }

    // Skip trivial messages for everything below
    if (isTrivial(messageText)) return;

    // ── On Sundays after 10am: also record as study update ──
    if (isStudyUpdate(message)) {
      const alreadyResponded = hasResponded(senderName);
      const [acknowledgment, summary] = await Promise.all([
        analyzeAndAcknowledge(senderName, messageText),
        extractSummary(messageText),
      ]);
      recordResponse(senderName, summary);
      const reply = await message.reply(acknowledgment);
      trackBotMessage(reply);
      if (!alreadyResponded) await message.react('✅');
      console.log(`[${new Date().toLocaleString()}] Study update from ${senderName}: ${summary}`);
      return;
    }

    // ── General chatbot: respond to any other message ──
    const response = await handleGeneralChat(message, senderName, messageText);
    const reply = await message.reply(response);
    trackBotMessage(reply);
    console.log(`[${new Date().toLocaleString()}] Replied to ${senderName}`);

  } catch (err) {
    console.error('Error handling message:', err.message);
  }
}

module.exports = { handleMessage, setLastReminderMessageId, setSendWeeklyReminder, trackBotMessage };
