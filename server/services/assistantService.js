const { GoogleGenerativeAI } = require('@google/generative-ai');
const KnowledgeChunk = require('../models/KnowledgeChunk');
const Donor = require('../models/Donor');
const { checkEligibility } = require('./eligibilityService');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ELIGIBILITY_KEYWORDS = ['eligible', 'can i donate', 'when can i', 'my next donation'];

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
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await embeddingModel.embedContent(query);

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

async function getAssistantReply({ message, donorId, language = 'English' }) {
  const [liveDataContext, relevantChunks] = await Promise.all([
    getLiveDonorContext(message, donorId),
    retrieveRelevantChunks(message)
  ]);

  const knowledgeContext = relevantChunks
    .map((chunk) => `[${chunk.topic}]: ${chunk.content}`)
    .join('\n\n');

  const prompt = `You are BloodBridge's AI Health Assistant, helping users with blood donation questions.
Respond in ${language}.
Be warm, clear, and concise. Use only the information provided below — do not make up medical facts.

Relevant knowledge base information:
${knowledgeContext}
${liveDataContext}

User question: ${message}`;

  const chatModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await chatModel.generateContent(prompt);

  return {
    response: result.response.text(),
    sourcesUsed: relevantChunks.map((c) => c.topic)
  };
}

module.exports = { getAssistantReply };