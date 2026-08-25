const OPTIMIZABLE_IMAGE_HOSTS = new Set([
  "cdnx.jumpseller.com",
  "images.jumpseller.com",
  "www.growbaratochile.cl",
  "piranha.cl",
]);

export function shouldOptimizeImage(source: string) {
  try {
    const url = new URL(source);
    return url.protocol === "https:" && OPTIMIZABLE_IMAGE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
