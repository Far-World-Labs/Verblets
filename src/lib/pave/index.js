/**
 * Pave a nested object structure or array based on a dot-separated path.
 * @param {Object|Array} obj - The object or array to modify.
 * @param {string} path - The dot-separated path indicating where to set the value.
 * @param {*} value - The value to set at the specified path.
 */
export default (obj, path, value) => {
  const pathRe = /^([^.]+(\.[^.]+)*)$/;

  if (!pathRe.test(path)) {
    throw new Error(`Invalid path: "${path}"`);
  }

  const keys = path.split('.');
  const objNew = JSON.parse(JSON.stringify(obj));
  let objMutating = objNew;

  const isNumeric = (str) => /^\d+$/.test(str);

  for (let i = 0; i < keys.length; i += 1) {
    const key = isNumeric(keys[i]) ? parseInt(keys[i], 10) : keys[i];

    if (i === keys.length - 1) {
      objMutating[key] = value;
    } else {
      if (!objMutating[key]) {
        objMutating[key] = isNumeric(keys[i + 1]) ? [] : {};
      }
      objMutating = objMutating[key];
    }
  }

  return objNew;
};
