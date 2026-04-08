const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'weekly.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getWeekKey() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Mark a participant as having responded this week.
 * Returns true if this is their first response this week.
 */
function recordResponse(participantName, summary) {
  const data = loadData();
  const week = getWeekKey();

  if (!data[week]) data[week] = { responses: {} };

  const isFirst = !data[week].responses[participantName];
  data[week].responses[participantName] = {
    summary,
    timestamp: new Date().toISOString(),
  };

  saveData(data);
  return isFirst;
}

/**
 * Get list of participants who have NOT responded this week.
 * Pass in the full list of known group participants.
 */
function getMissingParticipants(allParticipants) {
  const data = loadData();
  const week = getWeekKey();
  const responded = Object.keys(data[week]?.responses || {});
  return allParticipants.filter((p) => !responded.includes(p));
}

/**
 * Get all responses for the current week.
 */
function getWeeklyResponses() {
  const data = loadData();
  const week = getWeekKey();
  return data[week]?.responses || {};
}

/**
 * Check if a participant already responded this week.
 */
function hasResponded(participantName) {
  const data = loadData();
  const week = getWeekKey();
  return !!data[week]?.responses?.[participantName];
}

module.exports = {
  recordResponse,
  getMissingParticipants,
  getWeeklyResponses,
  hasResponded,
  getWeekKey,
};
