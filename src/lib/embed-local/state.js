let enabled = false;
let globalService;

export function isEmbedEnabled() {
  return enabled;
}

export function setEmbedEnabled(value) {
  enabled = value;
  if (!value) globalService = undefined;
}

export function getGlobalService() {
  return globalService;
}

export function setGlobalService(value) {
  globalService = value;
}
