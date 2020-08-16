export default function generateKeyFromName(name) {
  return name.trim().toLowerCase().replace(/\s/g, '_');
}
