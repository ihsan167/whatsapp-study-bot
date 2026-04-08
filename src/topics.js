// Weekly rotating topics. The topic is chosen by week number % topics.length
const TOPICS = [
  {
    name: 'JavaScript & TypeScript',
    description: 'JS fundamentals, TypeScript types, async/await, modern ES features',
    resources: 'javascript.info, TypeScript docs, You Don\'t Know JS (free online)',
  },
  {
    name: 'Frontend Development',
    description: 'React, Next.js, Vue, UI/UX principles, CSS, component design',
    resources: 'React docs, Next.js docs, Tailwind CSS',
  },
  {
    name: 'Backend Development',
    description: 'Node.js, Express, REST APIs, authentication, middleware',
    resources: 'Node.js docs, Express docs, roadmap.sh/backend',
  },
  {
    name: 'Python & Scripting',
    description: 'Python basics to advanced, FastAPI, scripting, automation',
    resources: 'python.org, FastAPI docs, Automate the Boring Stuff (free online)',
  },
  {
    name: 'AI Agents & LLMs',
    description: 'Prompt engineering, Claude/GPT APIs, building AI agents, RAG systems',
    resources: 'Anthropic docs, LangChain docs, DeepLearning.AI short courses',
  },
  {
    name: 'Mobile App Development',
    description: 'React Native, Flutter, mobile UI patterns, publishing to stores',
    resources: 'React Native docs, Flutter docs, Expo',
  },
  {
    name: 'Databases & System Design',
    description: 'SQL, NoSQL, database design, caching, scalability concepts',
    resources: 'PostgreSQL docs, MongoDB docs, system-design-primer (GitHub)',
  },
  {
    name: 'DevOps & Cloud',
    description: 'Docker, CI/CD, GitHub Actions, basic cloud (AWS/GCP/Azure), deployment',
    resources: 'Docker docs, GitHub Actions docs, freeCodeCamp DevOps tutorials',
  },
  {
    name: 'Full Stack Projects',
    description: 'Building complete apps end-to-end, connecting frontend + backend + DB',
    resources: 'The Odin Project, Full Stack Open (free), build something real!',
  },
  {
    name: 'Open Week — Your Choice',
    description: 'Explore anything tech-related that caught your interest this week',
    resources: 'Whatever you find interesting — share it with the group!',
  },
];

/**
 * Returns the topic for the current week using ISO week number.
 */
function getCurrentTopic() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return TOPICS[weekNumber % TOPICS.length];
}

module.exports = { TOPICS, getCurrentTopic };
