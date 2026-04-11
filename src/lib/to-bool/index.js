import stripResponse from '../strip-response/index.js';

const BOOL_MAP = {
  1: true,
  0: false,
  yes: true,
  no: false,
  true: true,
  false: false,
};

export default (val) => {
  const valLower = stripResponse(val.toLowerCase());
  return BOOL_MAP[valLower];
};
