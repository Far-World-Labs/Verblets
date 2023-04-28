import wrapVariable from './wrap-variable.js';
import {
  contentIsSortCriteria,
  contentIsMain,
  contentIsFixes,
  contentIsDetails,
  onlyJSONStringArray,
} from './constants.js';

export const defaultSortDescription = 'alphabetical order';
export const defaultFixes = 'none';
export const defaultSortOrder = 'descending';

export default (
  {
    description = defaultSortDescription,
    fixes = defaultFixes,
    sortOrder = defaultSortOrder,
  },
  list
) => {
  const listLines = JSON.stringify(list, undefined, 2);

  return `${contentIsSortCriteria} ${wrapVariable(description, {
    tag: 'criteria',
  })}

${contentIsMain} ${wrapVariable(listLines, { tag: 'main-content' })}

${contentIsDetails} ${sortOrder} order

${contentIsFixes} ${wrapVariable(fixes, { tag: 'fixes' })}

${onlyJSONStringArray}`;
};
