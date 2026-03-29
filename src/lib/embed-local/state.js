let enabled = false;
let extractorPromise;

export function isEmbedEnabled() {
  return enabled;
}

export function setEmbedEnabled(value) {
  enabled = value;
  if (!value) extractorPromise = undefined;
}

export function getExtractorPromise() {
  return extractorPromise;
}

export function setExtractorPromise(value) {
  extractorPromise = value;
}
