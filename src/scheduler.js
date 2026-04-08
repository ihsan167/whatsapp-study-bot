const cron = require('node-cron');
const { getCurrentTopic } = require('./topics');
const { getWeeklyResponses } = require('./store');
const { setLastReminderMessageId, trackBotMessage } = require('./handler');
const config = require('./config');

/**
 * Find the target group chat by name.
 */
async function getTargetGroup(client) {
  const chats = await client.getChats();
  const group = chats.find((c) => c.isGroup && c.name === config.groupName);
  if (!group) {
    console.error(`Group "${config.groupName}" not found. Check your GROUP_NAME in .env`);
    return null;
  }
  return group;
}

/**
 * Send the weekly Sunday reminder.
 */
async function sendWeeklyReminder(client) {
  const group = await getTargetGroup(client);
  if (!group) return;

  const topic = getCurrentTopic();

  const message =
    `📚 *Weekly Study Check-in!*\n\n` +
    `This week's focus: *${topic.name}*\n` +
    `_${topic.description}_\n\n` +
    `Share your update for this week:\n` +
    `• What did you study or build?\n` +
    `• Any useful resources you found?\n` +
    `• Challenges you faced?\n\n` +
    `💡 *Resources to explore:*\n${topic.resources}\n\n` +
    `Reply to this message with your update. Let's grow together! 💪`;

  const sent = await group.sendMessage(message);
  trackBotMessage(sent);
  setLastReminderMessageId(sent.id._serialized);

  console.log(`[${new Date().toLocaleString()}] Weekly reminder sent to "${config.groupName}"`);
}

/**
 * Send an evening nudge to members who haven't responded yet.
 */
async function sendEveningNudge(client) {
  const group = await getTargetGroup(client);
  if (!group) return;

  const responses = getWeeklyResponses();
  const respondedCount = Object.keys(responses).length;

  if (respondedCount === 0) {
    const sent = await group.sendMessage(
      `⏰ *Reminder!* No updates yet today — don't forget to share what you've been learning this week! The group is waiting to hear from you. 😊`
    );
    trackBotMessage(sent);
  } else {
    const names = Object.keys(responses).join(', ');
    const sent = await group.sendMessage(
      `📊 *Check-in update:* ${respondedCount} member(s) have shared their updates today (${names}). If you haven't shared yet, there's still time! 🙌`
    );
    trackBotMessage(sent);
  }

  console.log(`[${new Date().toLocaleString()}] Evening nudge sent. ${respondedCount} responses so far.`);
}

/**
 * Set up all scheduled jobs.
 */
function setupScheduler(client) {
  const options = { timezone: config.timezone };

  // Sunday 10:00am — weekly reminder
  cron.schedule(config.reminderCron, () => sendWeeklyReminder(client), options);

  // Sunday 9:00pm — evening nudge
  cron.schedule(config.nudgeCron, () => sendEveningNudge(client), options);

  console.log(`Scheduler ready. Reminders every Sunday at 10am (${config.timezone})`);
}

// Export so we can trigger manually for testing
module.exports = { setupScheduler, sendWeeklyReminder, sendEveningNudge };
