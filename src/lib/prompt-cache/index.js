import { createHash } from '../crypto/index.js';
import { omit } from '../pure/index.js';
import { cacheTTL } from '../../constants/models.js';

const variableKeys = ['created', 'id', 'max_tokens', 'usage'];
const omitVariableKeys = omit(variableKeys);

const sortKeys = (data) => {
  const sortedData = Object.keys(data)
    .toSorted()
    .reduce((acc, key) => {
      if (key === 'messages') {
        // Preserve all messages and their roles
        acc[key] = data[key].map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
      } else {
        acc[key] = data[key];
      }
      return acc;
    }, {});

  return sortedData;
};

export const toKey = async (data) => {
  const hash = await createHash('sha256');
  return hash.update(JSON.stringify(sortKeys(data))).digest('hex');
};

export const get = async (redis, inputData) => {
  const key = await toKey(omitVariableKeys(inputData));
  const resultFromRedis = await redis.get(key);

  const foundInRedis = !!resultFromRedis;

  let result;
  if (foundInRedis) {
    result = JSON.parse(resultFromRedis);
  }

  return { created: !foundInRedis, result };
};

export const set = async (redis, inputData, outputData) => {
  const key = await toKey(omitVariableKeys(inputData));
  await redis.set(key, JSON.stringify(outputData), {
    EX: cacheTTL,
  });
};
