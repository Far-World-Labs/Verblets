import {
  contentIsDetails,
  contentListCriteria,
  contentListItemCriteria,
  contentListToOmit,
  onlyJSONArray,
} from './constants.js';
import wrapVariable from './wrap-variable.js';

const instruction = 'Please continue building the list.';

const targetNewItemsCountDefault = 10;

export default (
  description,
  {
    existing = [],
    attachments = {},
    fixes = '',
    targetNewItemsCount = targetNewItemsCountDefault,
  } = {}
) => {
  const existingJoined = JSON.stringify(existing, null, 2);

  const attachmentsJoined = Object.entries(attachments).map(([key, value]) => {
    return `${wrapVariable(value, { tag: 'reference-material', name: key })}
`;
  });

  return `${onlyJSONArray}
${contentListCriteria} ${wrapVariable(description, { tag: 'criteria' })}

${attachmentsJoined}

${contentListToOmit} ${wrapVariable(existingJoined, { tag: 'omitted' })}

${instruction}
You must return least ${targetNewItemsCount} unless the items are thoroughly exhausted.

${contentListItemCriteria}
- Meet the description criteria
- Not already in the list
- Not a duplicate or a variant of an existing item

${contentIsDetails} ${wrapVariable(fixes, { tag: 'fixes' })}

${onlyJSONArray}`;
};
