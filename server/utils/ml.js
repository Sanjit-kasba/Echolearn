const natural = require('natural');
const TfIdf = natural.TfIdf;
const tfidf = new TfIdf();

function vectorizeSkills(skills) {
  const joined = skills.join(' ').toLowerCase();
  tfidf.addDocument(joined);
  const vector = [];
  tfidf.listTerms(tfidf.documents.length - 1).forEach(term => {
    vector.push(term.tfidf);
  });
  return vector;
}

function cosineSimilarity(vecA, vecB) {
  const len = Math.min(vecA.length, vecB.length);
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] ** 2;
    normB += vecB[i] ** 2;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

module.exports = { vectorizeSkills, cosineSimilarity };
