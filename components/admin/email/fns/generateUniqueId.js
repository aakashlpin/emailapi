/* eslint-disable no-bitwise */
function createUniqueID() {
  let dt = new Date().getTime();
  const uuid = 'xxyxxxxxxyxxxxxyxxxx'.replace(/[xy]/g, (c) => {
    const r = (dt + Math.random() * 16) % 16 | 0;
    dt = Math.floor(dt / 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
  return uuid;
}

function generateUniqueId(prefix = '') {
  if (prefix.length > 4)
    return new Error('prefix length cannot be more than 4');
  return `${prefix}${createUniqueID()}`;
}

module.exports = generateUniqueId;
