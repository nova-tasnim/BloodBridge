const mongoose = require('mongoose');

const knowledgeChunkSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    content: { type: String, required: true },
    embedding: { type: [Number], required: true }
  },
  { collection: 'knowledgechunks' }
);

module.exports = mongoose.model('KnowledgeChunk', knowledgeChunkSchema);