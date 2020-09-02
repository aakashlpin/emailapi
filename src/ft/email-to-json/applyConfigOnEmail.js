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

  return config.fields
    .filter((field) => field)
    .map((field) => {
      const { selector: clickedSelector, fieldKey } = field;
      const selectorElement = browserDocument.querySelector(clickedSelector);
      if (!selectorElement) {
        return null;
      }
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
