const templateCache = new Map();
const preloadedImages = new Set();

export function getCacheKey(type) {
  return `group_${type}`;
}

export function getCache(type) {
  return templateCache.get(getCacheKey(type)) || null;
}

export function setCache(type, data) {
  templateCache.set(getCacheKey(type), data);
}

export function clearTemplateCache() {
  templateCache.clear();
}

export function preloadImage(src) {
  if (!src || preloadedImages.has(src)) return;
  preloadedImages.add(src);
  const img = new Image();
  img.src = src;
}
