import { register } from 'node:module';

register(new URL('./loader-hooks.js', import.meta.url));
