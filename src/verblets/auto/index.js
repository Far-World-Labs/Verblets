import chatGPT from '../../lib/chatgpt/index.js';
import toObject from '../../verblets/to-object/index.js';

export default async (text, puckApi) => {
  // console.log(puckApi)
  // const functionFound = await chatGPT(text, { functions: puckApi.schemas });

  // console.log(functionFound);
  // const functionArgs = await toObject(functionFound.arguments);

  // console.log(functionArgs);
  // const functionArgsAsArray = Array.isArray(functionArgs) ? functionArgs : [functionArgs];

  // return await puckApi[functionFound.name](...functionArgsAsArray);
};
