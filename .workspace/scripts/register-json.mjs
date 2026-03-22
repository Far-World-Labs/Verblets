// Register the JSON loader hook before any imports
// Usage: node --import ./.notes/scripts/register-json.mjs your-script.js
import { register } from 'node:module';

register(new URL('./json-loader.mjs', import.meta.url).href);
