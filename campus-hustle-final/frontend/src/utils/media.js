import client from '../api/client';

const apiOrigin = (() => {
  try {
    return new URL(client.defaults.baseURL).origin;
  } catch {
    return '';
  }
})();

export const resolveMediaUrl = (url) => {
  if (!url) return '';
  const value = String(url).trim();

  if (/^(data:|blob:|https?:\/\/)/i.test(value)) return value;
  if (value.startsWith('/')) return `${apiOrigin}${value}`;

  return value;
};

export const normalizePhotoUrl = (url) => {
  const raw = String(url || '').trim();
  if (!raw) return '';

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(withProtocol);
    const googleImageUrl = parsed.searchParams.get('imgurl');

    if (googleImageUrl && parsed.hostname.includes('google.')) {
      return normalizePhotoUrl(googleImageUrl);
    }

    if (parsed.hostname.includes('drive.google.com')) {
      const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      const id = parsed.searchParams.get('id') || fileMatch?.[1];
      if (id) return `https://drive.google.com/uc?export=view&id=${id}`;
    }

    if (parsed.hostname.includes('dropbox.com')) {
      parsed.searchParams.set('raw', '1');
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return raw;
  }
};
