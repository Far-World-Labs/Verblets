// Browser stub for transcribe
export default function transcribe() {
  console.warn('transcribe is not available in browser environment');
  return Promise.resolve('');
}

export { transcribe };
