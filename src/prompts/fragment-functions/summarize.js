import wrapVariable from "./wrap-variable.js";

export default (text, fixes = "") => {
  return `You will be asked to summarize text. While doing so, please follow these rules: ${wrapVariable(
    fixes
  )}

Summarize this text: ${wrapVariable(text)}`;
};
