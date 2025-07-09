# Text Similarity Library

A text similarity library that provides an abstract interface for text similarity operations using TF-IDF (Term Frequency-Inverse Document Frequency) and cosine similarity. This library is designed to be extensible for future embedding-based implementations.

## Features

- **Add/Delete Chunks**: Manage text chunks with unique identifiers
- **Find Nearest**: Get the most similar chunks to a query text
- **Find Matches**: Find all chunks above a similarity threshold
- **Clustering**: Group similar chunks together
- **Extensible Design**: Abstract interface that can be extended for embedding-based similarity

## Usage

```javascript
import TextSimilarity from './index.js';

const textSim = new TextSimilarity();

// Add text chunks
const id1 = textSim.addChunk("Machine learning is a subset of artificial intelligence");
const id2 = textSim.addChunk("Deep learning uses neural networks", "custom-id");
const id3 = textSim.addChunk("Natural language processing handles text");

// Find nearest chunks
const nearest = textSim.findNearest("artificial intelligence", {
  limit: 5,
  threshold: 0.1,
  includeScores: true
});

// Find all matches above threshold
const matches = textSim.findMatches("machine learning", {
  threshold: 0.2,
  includeScores: true
});

// Cluster chunks
const clusters = textSim.clusterChunks({
  numClusters: 2,
  threshold: 0.3
});

// Get chunk by ID
const chunk = textSim.getChunk(id1);

// Delete chunk
textSim.deleteChunk(id2);

// Get statistics
const stats = textSim.getStats();
```

## API Reference

### Constructor

```javascript
const textSim = new TextSimilarity();
```

### Methods

#### `addChunk(text, id = null)`
Adds a text chunk to the corpus.
- `text` (string): The text content to add
- `id` (string, optional): Custom ID for the chunk. If not provided, a UUID will be generated
- Returns: The chunk ID

#### `deleteChunk(id)`
Removes a chunk from the corpus.
- `id` (string): The ID of the chunk to remove
- Returns: `true` if successful
- Throws: Error if chunk not found

#### `findNearest(query, options = {})`
Finds the most similar chunks to a query.
- `query` (string): The query text
- `options` (object):
  - `limit` (number): Maximum number of results (default: 10)
  - `threshold` (number): Minimum similarity score (default: 0.0)
  - `includeScores` (boolean): Whether to include similarity scores (default: true)
- Returns: Array of chunks with similarity scores

#### `findMatches(query, options = {})`
Finds all chunks above a similarity threshold.
- `query` (string): The query text
- `options` (object):
  - `threshold` (number): Minimum similarity score (default: 0.1)
  - `includeScores` (boolean): Whether to include similarity scores (default: true)
- Returns: Array of matching chunks

#### `clusterChunks(options = {})`
Groups similar chunks into clusters.
- `options` (object):
  - `numClusters` (number): Maximum number of clusters (default: 3)
  - `threshold` (number): Minimum similarity for clustering (default: 0.3)
- Returns: Array of cluster objects

#### `getChunk(id)`
Retrieves a chunk by ID.
- `id` (string): The chunk ID
- Returns: Chunk object or `null` if not found

#### `getAllChunks()`
Retrieves all chunks.
- Returns: Array of all chunk objects

#### `getStats()`
Gets corpus statistics.
- Returns: Object with `totalChunks` and `vocabularySize`

## Implementation Details

This library uses:
- **TF-IDF**: Term Frequency-Inverse Document Frequency for text vectorization
- **Cosine Similarity**: For measuring similarity between text vectors
- **Simple Clustering**: Threshold-based clustering algorithm
- **Natural Library**: For TF-IDF calculations

## Future Extensions

The abstract interface is designed to support future embedding-based implementations:
- Vector embeddings (Word2Vec, GloVe, BERT, etc.)
- Semantic similarity measures
- Advanced clustering algorithms (K-means, hierarchical clustering)
- Dimensionality reduction techniques