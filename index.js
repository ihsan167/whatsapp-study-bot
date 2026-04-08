require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { setupScheduler, sendWeeklyReminder } = require('./src/scheduler');
const { handleMessage, setSendWeeklyReminder } = require('./src/handler');
const config = require('./src/config');

// Validate required config
if (!config.groqApiKey) {
  console.error('ERROR: GROQ_API_KEY is missing. Copy .env.example to .env and fill in your key.');
  process.exit(1);
}
if (!config.groupName || config.groupName === 'Study Group') {
  console.warn('WARNING: GROUP_NAME is not set. Update it in .env to match your WhatsApp group name exactly.');
}

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'study-bot' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  },
});

client.on('qr', (qr) => {
  console.log('\nScan this QR code with WhatsApp on your phone:');
  console.log('(Phone > Linked Devices > Link a Device)\n');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('Authenticated successfully.');
});

client.on('auth_failure', (msg) => {
  console.error('Authentication failed:', msg);
});

client.on('ready', async () => {
  console.log(`\nBot is ready! Listening for group: "${config.groupName}"`);
  console.log('Timezone:', config.timezone);

  setSendWeeklyReminder(sendWeeklyReminder);
  setupScheduler(client);
});

client.on('message', async (message) => {
  await handleMessage(client, message);
});

client.on('disconnected', (reason) => {
  console.warn('Client disconnected:', reason);
  console.log('Reinitializing...');
  client.initialize();
});

console.log('Starting WhatsApp Study Bot...');
client.initialize();
