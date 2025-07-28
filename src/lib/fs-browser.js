// Browser shim for Node.js fs module
// Throws errors for all operations since file system is not available in browser

const notAvailable = (method) => {
  return () => {
    throw new Error(`fs.${method} is not available in browser environment`);
  };
};

export const readFileSync = notAvailable('readFileSync');
export const writeFileSync = notAvailable('writeFileSync');
export const existsSync = notAvailable('existsSync');
export const mkdirSync = notAvailable('mkdirSync');
export const readdirSync = notAvailable('readdirSync');
export const readFile = notAvailable('readFile');
export const writeFile = notAvailable('writeFile');
export const exists = notAvailable('exists');
export const mkdir = notAvailable('mkdir');
export const readdir = notAvailable('readdir');

export default {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFile,
  writeFile,
  exists,
  mkdir,
  readdir,
};
