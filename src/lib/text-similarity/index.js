import natural from 'natural';
const { TfIdf } = natural;
import { v4 as uuidv4 } from 'uuid';

export class TextSimilarity {
  constructor() {
    this.tfidf = new TfIdf();
    this.chunks = new Map();
  }

  addChunk(text, id) {
    const chunkId = id || uuidv4();

    if (this.chunks.has(chunkId)) {
      throw new Error(`Chunk with id '${chunkId}' already exists`);
    }

    const documentIndex = this.chunks.size;
    this.tfidf.addDocument(text);

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

    // Extract query vector once before the loop
    const queryTfIdf = new TfIdf();
    queryTfIdf.addDocument(query);
    const queryVector = this._getDocumentVector(queryTfIdf, 0);
    const queryMagnitude = this._magnitude(queryVector);

    if (queryMagnitude === 0) {
      return [];
    }

    const similarities = [];

    for (const [chunkId, chunkData] of this.chunks.entries()) {
      const docVector = this._getDocumentVector(this.tfidf, chunkData.documentIndex);
      const docMagnitude = this._magnitude(docVector);

      if (docMagnitude === 0) continue;

      const similarity = this._dotProduct(queryVector, docVector) / (queryMagnitude * docMagnitude);

      if (similarity >= threshold) {
        similarities.push({
          id: chunkId,
          text: chunkData.text,
          score: similarity,
        });
      }
    }

    const sorted = similarities.toSorted((a, b) => b.score - a.score);

    const results = sorted.slice(0, limit);

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
      return undefined;
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

  /**
   * Compute similarity matrix using the corpus TfIdf directly.
   * Exploits symmetry: similarity(i,j) === similarity(j,i).
   */
  _computeSimilarityMatrix(chunkIds) {
    const matrix = new Map();

    // Pre-extract all document vectors and magnitudes
    const vectors = chunkIds.map((id) => {
      const chunk = this.chunks.get(id);
      const vec = this._getDocumentVector(this.tfidf, chunk.documentIndex);
      return { vec, magnitude: this._magnitude(vec) };
    });

    for (let i = 0; i < chunkIds.length; i++) {
      matrix.set(chunkIds[i], new Map());
    }

    for (let i = 0; i < chunkIds.length; i++) {
      matrix.get(chunkIds[i]).set(chunkIds[i], 1.0);

      for (let j = i + 1; j < chunkIds.length; j++) {
        const { vec: vec1, magnitude: mag1 } = vectors[i];
        const { vec: vec2, magnitude: mag2 } = vectors[j];

        const similarity =
          mag1 === 0 || mag2 === 0 ? 0 : this._dotProduct(vec1, vec2) / (mag1 * mag2);

        matrix.get(chunkIds[i]).set(chunkIds[j], similarity);
        matrix.get(chunkIds[j]).set(chunkIds[i], similarity);
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
    const chunkCount = this.chunks.size;

    for (let i = 0; i < chunkCount; i++) {
      const terms = this.tfidf.listTerms(i);
      terms.forEach((term) => vocabulary.add(term.term));
    }

    return vocabulary.size;
  }
}

export default TextSimilarity;
