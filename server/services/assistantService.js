const { GoogleGenerativeAI } = require('@google/generative-ai');
const KnowledgeChunk = require('../models/KnowledgeChunk');
const Donor = require('../models/Donor');
const { checkEligibility } = require('./eligibilityService');
const {
  getCompatibleDonorGroups,
  getCompatibleRecipientGroups
} = require('./compatibilityService');
const { BLOOD_GROUPS } = require('../config/constants');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ELIGIBILITY_KEYWORDS = ['eligible', 'can i donate', 'when can i', 'my next donation'];

const GREETING_REGEX =
  /^\s*(hi+|hello+|hey+|hola|salam|assalamualaikum|good\s?(morning|afternoon|evening))[\s!.,]*$/i;

const COMPATIBILITY_REGEX =
  /(compat|can\s+(i|you|they)?\s*donate\s*to|donate\s*to\s*me|who\s*can\s*(donate|receive)|receive\s*(blood\s*)?from|universal\s*(donor|recipient))/i;

const DEFAULT_SUGGESTIONS = [
  'Am I eligible to donate right now?',
  'What should I eat before donating?',
  'Which blood types can I donate to?',
  'Is donating blood painful?'
];

function extractBloodGroup(message) {
  const match = message.toUpperCase().match(/\b(AB|A|B|O)[+-]\b/);
  return match ? match[0] : null;
}

function buildGreetingReply(language) {
  const greetings = {
    English:
      "Hi there! 👋 I'm your BloodBridge Health Assistant. I can help you check donation eligibility, explain blood type compatibility, or answer questions about the donation process. What would you like to know?",
    Bangla:
      'হ্যালো! 👋 আমি আপনার BloodBridge স্বাস্থ্য সহায়ক। আমি আপনাকে দানের যোগ্যতা যাচাই, রক্তের গ্রুপ সামঞ্জস্য বা দান প্রক্রিয়া সম্পর্কে সাহায্য করতে পারি। আপনি কী জানতে চান?'
  };

  return {
    response: greetings[language] || greetings.English,
    sourcesUsed: [],
    suggestedQuestions: DEFAULT_SUGGESTIONS
  };
}

function buildCompatibilityReply(message, userBloodGroup, language) {
  const mentioned = extractBloodGroup(message);
  const targetGroup = mentioned || userBloodGroup;

  if (!targetGroup || !BLOOD_GROUPS.includes(targetGroup)) {
    const askForType = {
      English:
        'Happy to help with blood type compatibility! Which blood type should I check — yours, or a specific one like A+ or O-?',
      Bangla:
        'রক্তের গ্রুপ সামঞ্জস্য নিয়ে সাহায্য করতে পেরে খুশি! আমি কোন গ্রুপ যাচাই করব — আপনারটি, নাকি A+ বা O- এর মতো নির্দিষ্ট কোনো গ্রুপ?'
    };
    return {
      response: askForType[language] || askForType.English,
      sourcesUsed: [],
      suggestedQuestions: BLOOD_GROUPS.map((g) => `What can ${g} donate to and receive from?`)
    };
  }

  const canDonateTo = getCompatibleRecipientGroups(targetGroup);
  const canReceiveFrom = getCompatibleDonorGroups(targetGroup);

  let noteEnglish = '';
  let noteBangla = '';
  if (targetGroup === 'O-') {
    noteEnglish = `\n\n${targetGroup} is the universal donor — compatible with every blood type.`;
    noteBangla = `\n\n${targetGroup} সার্বজনীন দাতা — সব রক্তের গ্রুপের সাথে সামঞ্জস্যপূর্ণ।`;
  } else if (targetGroup === 'AB+') {
    noteEnglish = `\n\n${targetGroup} is the universal recipient — can receive from every blood type.`;
    noteBangla = `\n\n${targetGroup} সার্বজনীন গ্রহীতা — সব রক্তের গ্রুপ থেকে গ্রহণ করতে পারে।`;
  }

  const responseEnglish =
    `Blood type ${targetGroup}:\n\n` +
    `• Can donate to: ${canDonateTo.join(', ')}\n` +
    `• Can receive from: ${canReceiveFrom.join(', ')}` +
    noteEnglish;

  const responseBangla =
    `রক্তের গ্রুপ ${targetGroup}:\n\n` +
    `• দান করতে পারে: ${canDonateTo.join(', ')}\n` +
    `• গ্রহণ করতে পারে: ${canReceiveFrom.join(', ')}` +
    noteBangla;

  return {
    response: language === 'Bangla' ? responseBangla : responseEnglish,
    sourcesUsed: ['Blood Type Compatibility Engine'],
    suggestedQuestions: [
      'Am I eligible to donate right now?',
      'How often can I donate blood?',
      'What should I expect during donation?'
    ]
  };
}

async function getLiveDonorContext(message, donorId) {
  const needsCheck = ELIGIBILITY_KEYWORDS.some((kw) => message.toLowerCase().includes(kw));
  if (!needsCheck || !donorId) return '';

  const donor = await Donor.findById(donorId);
  if (!donor) return '';

  const result = checkEligibility(donor);
  return `\n\nLive donor data (use this exact information, do not guess): ${JSON.stringify({
    bloodGroup: donor.bloodGroup,
    eligible: result.eligible,
    reasons: result.reasons,
    nextEligibleDate: result.nextEligibleDate
  })}`;
}

async function retrieveRelevantChunks(query) {
  const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-2' });

  const result = await embeddingModel.embedContent({
    content: { parts: [{ text: query }] },
    outputDimensionality: 768
  });

  return KnowledgeChunk.aggregate([
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'embedding',
        queryVector: result.embedding.values,
        numCandidates: 50,
        limit: 4
      }
    },
    { $project: { topic: 1, content: 1, score: { $meta: 'vectorSearchScore' } } }
  ]);
}

async function getAssistantReply({ message, donorId, bloodGroup, language = 'English' }) {
  const trimmed = message.trim();

  if (GREETING_REGEX.test(trimmed)) {
    return buildGreetingReply(language);
  }

  if (COMPATIBILITY_REGEX.test(trimmed)) {
    return buildCompatibilityReply(trimmed, bloodGroup, language);
  }

  const [liveDataContext, relevantChunks] = await Promise.all([
    getLiveDonorContext(trimmed, donorId),
    retrieveRelevantChunks(trimmed)
  ]);

  const knowledgeContext = relevantChunks
    .map((chunk) => `[${chunk.topic}]: ${chunk.content}`)
    .join('\n\n');

  const prompt = `You are BloodBridge's AI Health Assistant, helping users with blood donation questions.
Respond in ${language}.
Be warm, clear, and concise. Use only the information provided below — do not make up medical facts.
If nothing below is relevant to the question, say so honestly and suggest the user ask about eligibility, preparation, recovery, or blood type compatibility instead.

Relevant knowledge base information:
${knowledgeContext}
${liveDataContext}

User question: ${trimmed}`;

  const chatModel = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  const result = await chatModel.generateContent(prompt);

  return {
    response: result.response.text(),
    sourcesUsed: relevantChunks.map((c) => c.topic),
    suggestedQuestions: DEFAULT_SUGGESTIONS
  };
}

module.exports = { getAssistantReply };