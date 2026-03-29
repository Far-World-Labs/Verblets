// Browser stub for image-utils — Sharp is not available
export { setImageProcessingEnabled } from './state.js';

const notAvailable = (name) => () => {
  throw new Error(`${name} is not available in browser environment`);
};

export { mapImageShrink } from './shrink.js';

export const resizeImage = notAvailable('resizeImage');
export const tileImages = notAvailable('tileImages');
export const imageToBase64 = notAvailable('imageToBase64');
