// Default Redis service - exports Node.js implementation
// Browser builds should alias this to index.browser.js

export { getClient, setClient } from './index.node.js';
