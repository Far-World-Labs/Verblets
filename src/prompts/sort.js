import { asXML } from './wrap-variable.js';
import {
  contentIsDetails,
  contentIsFixes,
  contentIsMain,
  contentIsSortCriteria,
  onlyJSONStringArray,
} from './constants.js';

export const defaultSortDescription = 'alphabetical order';
export const defaultFixes = 'Ignore duplicates in the list';
export const defaultSortOrder = 'descending';

export default (
  { description = defaultSortDescription, fixes = defaultFixes, sortOrder = defaultSortOrder },
  list
) => {
  const listLines = JSON.stringify(list, undefined, 2);

  return `${contentIsSortCriteria} ${asXML(description, {
    tag: 'criteria',
  })}

${contentIsMain} ${asXML(listLines, { tag: 'main-content' })}

${contentIsDetails} ${sortOrder} order

${contentIsFixes} ${asXML(fixes, { tag: 'fixes' })}

${onlyJSONStringArray}`;
};
