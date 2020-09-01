export default function fullPath(el, stopProps = {}) {
  const names = [];
  while (
    el.parentNode &&
    (stopProps.className
      ? !el.parentNode.classList.contains(stopProps.className)
      : true)
  ) {
    if (el.id) {
      names.unshift(`#${el.id}`);
      break;
    } else {
      // eslint-disable-next-line
          if (el == el.ownerDocument.documentElement)
        names.unshift(el.tagName.toLowerCase());
      else {
        for (
          // eslint-disable-next-line
          var c = 1, e = el;
          e.previousElementSibling;
          e = e.previousElementSibling, c++ // eslint-disable-line
        );
        names.unshift(`${el.tagName.toLowerCase()}:nth-child(${c})`); // eslint-disable-line
      }
      el = el.parentNode; // eslint-disable-line
    }
  }
  return names.join(' > ');
}
