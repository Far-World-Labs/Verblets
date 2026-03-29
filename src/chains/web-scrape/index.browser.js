export { setBrowserEnabled } from './state.js';

const notAvailable = () => {
  throw new Error('webScrape is not available in browser environment');
};

export default notAvailable;
