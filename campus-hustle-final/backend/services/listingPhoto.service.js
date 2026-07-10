'use strict';

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const { AppError } = require('../utils/errors');

const DATA_URL_PATTERN = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i;
const IMAGE_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
};
const MAX_BYTES = 5 * 1024 * 1024;

const normalizeRemoteUrl = (url) => {
  const raw = String(url || '').trim();
  if (!raw) return null;
  if (raw.startsWith('data:image/')) return raw;

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(withProtocol);

    if (parsed.hostname.includes('drive.google.com')) {
      const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      const id = parsed.searchParams.get('id') || fileMatch?.[1];
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }

    if (parsed.hostname.includes('dropbox.com')) {
      parsed.searchParams.set('raw', '1');
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    throw new AppError('Listing photo must be a valid image URL.', 400);
  }
};

const saveImageBuffer = async ({ buffer, mimeType, prefix }) => {
  const extension = IMAGE_TYPES[mimeType];
  if (!extension) throw new AppError('Listing photo must be PNG, JPG, or WebP.', 400);
  if (buffer.length > MAX_BYTES) throw new AppError('Listing photo must be smaller than 5MB.', 400);

  const filename = `${prefix}-${crypto.randomUUID()}.${extension}`;
  const relativeDir = path.join(env.storage.uploadDir, 'listing-photos');
  const absoluteDir = path.join(__dirname, '..', relativeDir);
  const absolutePath = path.join(absoluteDir, filename);

  await fs.mkdir(absoluteDir, { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  return `/uploads/listing-photos/${filename}`;
};

const saveDataUrl = async ({ dataUrl, sellerId }) => {
  const match = DATA_URL_PATTERN.exec(dataUrl || '');
  if (!match) throw new AppError('Listing photo must be PNG, JPG, or WebP.', 400);

  return saveImageBuffer({
    buffer: Buffer.from(match[2], 'base64'),
    mimeType: match[1].toLowerCase(),
    prefix: sellerId,
  });
};

const saveRemoteUrl = async ({ url, sellerId }) => {
  const normalizedUrl = normalizeRemoteUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8',
        'User-Agent': 'HustleGrad/1.0 image fetcher',
      },
    });

    if (!response.ok) {
      throw new AppError(`Could not read the listing photo URL. The image host returned ${response.status}.`, 400);
    }

    const contentType = response.headers.get('content-type')?.split(';')[0].toLowerCase();
    if (!IMAGE_TYPES[contentType]) {
      throw new AppError('That URL does not point directly to a PNG, JPG, or WebP image.', 400);
    }

    const arrayBuffer = await response.arrayBuffer();
    return saveImageBuffer({
      buffer: Buffer.from(arrayBuffer),
      mimeType: contentType,
      prefix: sellerId,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new AppError('The listing photo URL took too long to respond.', 400);
    }
    if (error.isOperational) throw error;
    throw new AppError('Could not read that listing photo URL. Try a direct image link or upload the file instead.', 400);
  } finally {
    clearTimeout(timeout);
  }
};

const saveListingPhoto = async ({ sellerId, photoUrl }) => {
  const normalizedUrl = normalizeRemoteUrl(photoUrl);
  if (!normalizedUrl) return null;

  if (normalizedUrl.startsWith('data:image/')) {
    return saveDataUrl({ dataUrl: normalizedUrl, sellerId });
  }

  return saveRemoteUrl({ url: normalizedUrl, sellerId });
};

module.exports = { normalizeRemoteUrl, saveListingPhoto };
