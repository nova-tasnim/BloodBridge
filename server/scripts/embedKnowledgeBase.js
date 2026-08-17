require('dotenv').config();

const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const knowledgeBase = require('../data/knowledgeBase');
const KnowledgeChunk = require('../models/KnowledgeChunk');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function embedAndStore() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Current Gemini embedding model
  const embeddingModel = genAI.getGenerativeModel({
    model: 'gemini-embedding-2'
  });

  // Remove old embeddings before rebuilding the knowledge base.
  await KnowledgeChunk.deleteMany({});

  for (const chunk of knowledgeBase) {
    console.log(`Embedding: ${chunk.topic}`);

    const result = await embeddingModel.embedContent({
      content: {
        parts: [
          {
            text: chunk.content
          }
        ]
      },
      outputDimensionality: 768
    });

    const embedding = result.embedding.values;

    console.log(`  Dimensions: ${embedding.length}`);

    await KnowledgeChunk.create({
      topic: chunk.topic,
      content: chunk.content,
      embedding
    });

    console.log(`  Stored: ${chunk.topic}`);
  }

  console.log('');
  console.log('All knowledge chunks embedded and stored.');

  await mongoose.disconnect();
  process.exit(0);
}

embedAndStore().catch(async (err) => {
  console.error('Error:', err);

  try {
    await mongoose.disconnect();
  } catch (_) {}

  process.exit(1);
});