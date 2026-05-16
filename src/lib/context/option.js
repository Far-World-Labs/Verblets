import {
  nameStep,
  getOption,
  getOptionDetail,
  getOptions as resolveOptions,
  withPolicy,
} from '../option/index.js';
import createProgressEmitter from '../progress/index.js';
import { OpEvent } from '../progress/constants.js';

export { nameStep, getOption, getOptionDetail, withPolicy };

export async function getOptions(config, spec) {
  const optionNames = Object.keys(spec);
  const emitter = createProgressEmitter('options', config.onProgress, config);
  emitter.progress({ event: OpEvent.start, totalItems: optionNames.length });
  const result = await resolveOptions(config, spec);
  emitter.progress({
    event: OpEvent.complete,
    totalItems: optionNames.length,
    processedItems: optionNames.length,
  });
  return result;
}
