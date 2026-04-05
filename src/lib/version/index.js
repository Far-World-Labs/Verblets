// Import package.json to get version
import packageJson from '../../../package.json' with { type: 'json' };

export default packageJson.version;
