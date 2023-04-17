import { encoding_for_model as encodingForModel } from '@dqbd/tiktoken';

import {
  defaultModel,
} from '../../constants/openai.js';

export default (item) => {
  const enc = encodingForModel(defaultModel.name);
  return enc.encode(item);
};
