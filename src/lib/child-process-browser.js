// Browser shim for Node.js child_process module
// Throws errors for all operations since child processes are not available in browser

const notAvailable = (method) => {
  return () => {
    throw new Error(`child_process.${method} is not available in browser environment`);
  };
};

export const exec = notAvailable('exec');
export const execSync = notAvailable('execSync');
export const spawn = notAvailable('spawn');
export const spawnSync = notAvailable('spawnSync');
export const fork = notAvailable('fork');
export const execFile = notAvailable('execFile');
export const execFileSync = notAvailable('execFileSync');

export default {
  exec,
  execSync,
  spawn,
  spawnSync,
  fork,
  execFile,
  execFileSync,
};
