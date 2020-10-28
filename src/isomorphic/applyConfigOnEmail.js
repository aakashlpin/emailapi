// const { log } = require('~/src/integrations/utils');

const extractNumbers = (string) => {
  const match = string.match(/[+-]?\d+(?:,\d+)?(?:\.\d+)?/g);

  if (!match) {
    return null;
  }
  return match
    .map((val) => {
      if (val.includes(',')) {
        return val.replace(/,/g, '');
      }
      return val;
    })
    .map(Number);
};

const cleanValue = (string) => string.trim().replace(/(\r\n|\n|\r|\t)/gm, '');

export default function applyConfigOnEmail(htmlString, config) {
  // log({ config, htmlString });
  let browserDocument;
  if (typeof window === 'undefined') {
    const jsdom = require('jsdom');
    const { JSDOM } = jsdom;
    const dom = new JSDOM(htmlString);
    browserDocument = dom.window.document;
  } else {
    const parser = new DOMParser();
    browserDocument = parser.parseFromString(htmlString, 'text/html');
  }

  const extractFieldData = (selector, field) => {
    const { fieldKey } = field;
    const selectorElement = browserDocument.querySelector(selector);
    const selectorValue =
      selectorElement.tagName === 'IMG'
        ? selectorElement.getAttribute('src')
        : selectorElement.textContent;

    const additionalSelectorValues = {};
    if (selectorElement.tagName === 'A') {
      additionalSelectorValues[
        `${fieldKey}_link`
      ] = selectorElement.getAttribute('href');
    }

    if (!selectorValue) {
      return { [fieldKey]: 'COULD_NOT_DETERMINE' };
    }
    const returnVal = {
      [fieldKey]: cleanValue(selectorValue),
      ...additionalSelectorValues,
    };
    switch (field.formatter) {
      case 'number': {
        const numbers = extractNumbers(selectorValue);
        if (Array.isArray(numbers) && numbers.length) {
          returnVal[`${fieldKey}_formatted`] =
            numbers.length === 1 ? numbers[0] : numbers;
        }
        break;
      }
      default:
    }

    return returnVal;
  };

  return config.fields
    .filter((field) => field)
    .map((field) => {
      const { selector: clickedSelector, groupByParent } = field;
      const selectorElement = browserDocument.querySelector(clickedSelector);
      if (!selectorElement) {
        return null;
      }

      if (groupByParent) {
        const selectorNodes = clickedSelector.split('>');
        const groupByParentIdx = selectorNodes.length - Number(groupByParent);
        const groupByParentSelector = selectorNodes
          .filter((_, idx) => idx < groupByParentIdx)
          .join('>')
          .trim();

        const childElementCount = browserDocument.querySelector(
          groupByParentSelector,
        )?.childElementCount;

        if (childElementCount > 1) {
          const groupBySiblingNode = selectorNodes
            .filter((_, idx) => idx <= groupByParentIdx)
            .map((item, idx, filteredArray) =>
              // assumes that `:` is followed by nth-child()
              // as that's what it iterates upon later
              idx === filteredArray.length - 1 ? item.split(':')[0] : item,
            )
            .join('>')
            .trim();

          const elementSelectorAtParentNode = selectorNodes
            .filter((_, idx) => idx > groupByParentIdx)
            .join('>')
            .trim();

          const similarNodes = [...new Array(childElementCount)]
            // as index of `nth-child` starts from 1
            .map((_, idx) => idx + 1)
            .map(
              (id) =>
                `${groupBySiblingNode}:nth-child(${id}) > ${elementSelectorAtParentNode}`,
            )
            .filter((sel) => browserDocument.querySelector(sel))
            .map((sel) => extractFieldData(sel, field));

          if (similarNodes.length) {
            return {
              [field.fieldKey]: similarNodes,
            };
          }
        }
      }

      return extractFieldData(clickedSelector, field);
    })
    .filter((i) => i)
    .reduce(
      (data, item) => ({
        ...data,
        ...item,
      }),
      {},
    );
}
