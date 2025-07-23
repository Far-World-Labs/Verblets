import natural from 'natural';
const { TfIdf } = natural;
import { v4 as uuidv4 } from 'uuid';

export class TextSimilarity {
  constructor() {
    this.tfidf = new TfIdf();
    this.chunks = new Map();
    this.documentIds = [];
  }

  addChunk(text, id = null) {
    const chunkId = id || uuidv4();

    if (this.chunks.has(chunkId)) {
      throw new Error(`Chunk with id '${chunkId}' already exists`);
    }

    this.tfidf.addDocument(text);
    const documentIndex = this.documentIds.length;
    this.documentIds.push(chunkId);

    this.chunks.set(chunkId, {
      id: chunkId,
      text,
      documentIndex,
    });

    return chunkId;
  }

  deleteChunk(id) {
    if (!this.chunks.has(id)) {
      throw new Error(`Chunk with id '${id}' not found`);
    }

    const chunk = this.chunks.get(id);
    const documentIndex = chunk.documentIndex;

    this.tfidf.removeDocument(documentIndex);
    this.chunks.delete(id);

    this.documentIds = this.documentIds.filter((docId) => docId !== id);

    for (const [, chunkData] of this.chunks.entries()) {
      if (chunkData.documentIndex > documentIndex) {
        chunkData.documentIndex--;
      }
    }

    return true;
  }

  findNearest(query, options = {}) {
    const { limit = 10, threshold = 0.0, includeScores = true } = options;

    if (this.chunks.size === 0) {
      return [];
    }

    const queryTfIdf = new TfIdf();
    queryTfIdf.addDocument(query);

    const similarities = [];

    for (const [chunkId, chunkData] of this.chunks.entries()) {
      const similarity = this._cosineSimilarity(queryTfIdf, chunkData.documentIndex);

      if (similarity >= threshold) {
        similarities.push({
          id: chunkId,
          text: chunkData.text,
          score: similarity,
        });
      }
    }

    similarities.sort((a, b) => b.score - a.score);

    const results = similarities.slice(0, limit);

    if (!includeScores) {
      return results.map(({ id, text }) => ({ id, text }));
    }

    return results;
  }

  findMatches(query, options = {}) {
    const { threshold = 0.1, includeScores = true } = options;

    return this.findNearest(query, {
      limit: this.chunks.size,
      threshold,
      includeScores,
    });
  }

  clusterChunks(options = {}) {
    const { numClusters = 3, threshold = 0.3 } = options;

    if (this.chunks.size === 0) {
      return [];
    }

    const chunkIds = Array.from(this.chunks.keys());
    const similarities = this._computeSimilarityMatrix(chunkIds);

    return this._performClustering(chunkIds, similarities, numClusters, threshold);
  }

  getChunk(id) {
    const chunk = this.chunks.get(id);
    if (!chunk) {
      return null;
    }

    return {
      id: chunk.id,
      text: chunk.text,
    };
  }

  getAllChunks() {
    return Array.from(this.chunks.values()).map((chunk) => ({
      id: chunk.id,
      text: chunk.text,
    }));
  }

  getStats() {
    return {
      totalChunks: this.chunks.size,
      vocabularySize: this._getVocabularySize(),
    };
  }

  _cosineSimilarity(queryTfIdf, documentIndex) {
    const queryVector = this._getDocumentVector(queryTfIdf, 0);
    const docVector = this._getDocumentVector(this.tfidf, documentIndex);

    const dotProduct = this._dotProduct(queryVector, docVector);
    const queryMagnitude = this._magnitude(queryVector);
    const docMagnitude = this._magnitude(docVector);

    if (queryMagnitude === 0 || docMagnitude === 0) {
      return 0;
    }

    return dotProduct / (queryMagnitude * docMagnitude);
  }

  _getDocumentVector(tfidf, documentIndex) {
    const vector = new Map();
    const terms = tfidf.listTerms(documentIndex);

    terms.forEach((term) => {
      vector.set(term.term, term.tfidf);
    });

    return vector;
  }

  _dotProduct(vector1, vector2) {
    let sum = 0;

    for (const [term, value1] of vector1.entries()) {
      const value2 = vector2.get(term) || 0;
      sum += value1 * value2;
    }

    return sum;
  }

  _magnitude(vector) {
    let sumSquares = 0;

    for (const value of vector.values()) {
      sumSquares += value * value;
    }

    return Math.sqrt(sumSquares);
  }

  _computeSimilarityMatrix(chunkIds) {
    const matrix = new Map();

    for (let i = 0; i < chunkIds.length; i++) {
      matrix.set(chunkIds[i], new Map());

      for (let j = 0; j < chunkIds.length; j++) {
        if (i === j) {
          matrix.get(chunkIds[i]).set(chunkIds[j], 1.0);
        } else {
          const chunk1 = this.chunks.get(chunkIds[i]);
          const chunk2 = this.chunks.get(chunkIds[j]);

          const queryTfIdf = new TfIdf();
          queryTfIdf.addDocument(chunk1.text);

          const similarity = this._cosineSimilarity(queryTfIdf, chunk2.documentIndex);
          matrix.get(chunkIds[i]).set(chunkIds[j], similarity);
        }
      }
    }

    return matrix;
  }

  _performClustering(chunkIds, similarities, numClusters, threshold) {
    const clusters = [];
    const assigned = new Set();

    for (const chunkId of chunkIds) {
      if (assigned.has(chunkId)) continue;

      const cluster = [chunkId];
      assigned.add(chunkId);

      for (const otherChunkId of chunkIds) {
        if (assigned.has(otherChunkId) || chunkId === otherChunkId) continue;

        const similarity = similarities.get(chunkId).get(otherChunkId);
        if (similarity >= threshold) {
          cluster.push(otherChunkId);
          assigned.add(otherChunkId);
        }
      }

      clusters.push({
        id: clusters.length,
        chunks: cluster.map((id) => ({
          id,
          text: this.chunks.get(id).text,
        })),
        size: cluster.length,
      });

      if (clusters.length >= numClusters) break;
    }

    return clusters;
  }

  _getVocabularySize() {
    const vocabulary = new Set();

    for (let i = 0; i < this.documentIds.length; i++) {
      const terms = this.tfidf.listTerms(i);
      terms.forEach((term) => vocabulary.add(term.term));
    }

    return vocabulary.size;
  }
}

export default TextSimilarity;
