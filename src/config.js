require('dotenv').config();

module.exports = {
  groupName: process.env.GROUP_NAME || 'Study Group',
  timezone: process.env.TIMEZONE || 'Asia/Kuala_Lumpur',

  // Cron: every Sunday at 10:00am
  reminderCron: '0 10 * * 0',

  // Cron: every Sunday at 9:00pm — nudge those who haven't replied yet
  nudgeCron: '0 21 * * 0',

  groqApiKey: process.env.GROQ_API_KEY,
};
