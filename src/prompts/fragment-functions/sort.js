import wrapVariable from "./wrap-variable.js";
import { onlyJSONStringArray } from "../fragment-texts/index.js";

export const defaultSortDescription = "alphabetical order";
export const defaultDelimiterWidth = 12;
export const defaultFixes = "none";
export const defaultSortOrder = "descending";

export default (
  {
    delimiterWidth = defaultDelimiterWidth,
    description = defaultSortDescription,
    fixes = defaultFixes,
    sortOrder = defaultSortOrder,
  },
  list
) => {
  const listLines = JSON.stringify(list, undefined, 2);

  return `
Sort the following items by: ${wrapVariable(description, { delimiterWidth })}

The items to sort: ${wrapVariable(listLines, { delimiterWidth })}

Details:
 - ${sortOrder} order

Fixes: ${wrapVariable(fixes, { delimiterWidth })}

${onlyJSONStringArray}
`;
};
