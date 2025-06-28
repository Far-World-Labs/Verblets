import {
  contentIsDetails,
  contentListCriteria,
  contentListItemCriteria,
  contentListToOmit,
  onlyJSONStringArray,
} from './constants.js';
import { asXML } from './wrap-variable.js';

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
    return `${asXML(value, { tag: 'reference-material', name: key })}
`;
  });

  return `${onlyJSONStringArray}
${contentListCriteria} ${asXML(description, { tag: 'criteria' })}

${attachmentsJoined}

${contentListToOmit} ${asXML(existingJoined, { tag: 'omitted' })}

${instruction}
You must return least ${targetNewItemsCount} unless the items are thoroughly exhausted.

${contentListItemCriteria}
- Meet the description criteria
- Not already in the list
- Not a duplicate or a variant of an existing item

${contentIsDetails} ${asXML(fixes, { tag: 'fixes' })}

${onlyJSONStringArray}`;
};
