import crypto from 'node:crypto';
import * as R from 'ramda';

import { cacheTTL } from '../../constants/models.js';

const variableKeys = ['created', 'id', 'max_tokens', 'usage'];

const sortKeys = (data) => {
  const sortedData = R.sortBy(R.identity, R.keys(data)).reduce((acc, key) => {
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

export const toKey = (data) => {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(sortKeys(data)))
    .digest('hex')
    .toString();
};

export const get = async (redis, inputData) => {
  const resultFromRedis = await redis.get(toKey(R.omit(variableKeys, inputData)));

  const foundInRedis = !!resultFromRedis;

  let result;
  if (foundInRedis) {
    result = JSON.parse(resultFromRedis);
  }

  return { created: !foundInRedis, result };
};

export const set = async (redis, inputData, outputData) => {
  await redis.set(toKey(R.omit(variableKeys, inputData)), JSON.stringify(outputData), {
    EX: cacheTTL,
  });
};
