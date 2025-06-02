export const hook = (list, f, returnVal) => {
  list.push(f);
  return returnVal;
};

export const hookOnce = (list, f, returnVal) => {
  if (list.includes(f)) return returnVal;
  list.push(f);
  return returnVal;
};

export const hookFn = (list, returnVal) => (f) => hook(list, f, returnVal);

export const hookOnceFn = (list, returnVal) => (f) => hookOnce(list, f, returnVal);

export const unhook = (list, f, returnVal) => {
  const idx = list.indexOf(f);
  if (idx === -1) return returnVal;
  list.splice(idx, 1);
  return returnVal;
};

export const unhookFn = (list, returnVal) => (f) => unhook(list, f, returnVal);

export const unhookAll = (list, returnVal) => {
  list.splice(0);
  return returnVal;
};
