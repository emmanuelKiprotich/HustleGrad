'use strict';

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const { AppError } = require('../utils/errors');

const DATA_URL_PATTERN = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i;
const EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
};

const saveProfilePicture = async ({ userId, dataUrl }) => {
  const match = DATA_URL_PATTERN.exec(dataUrl || '');
  if (!match) {
    throw new AppError('Upload a PNG, JPG, or WebP profile picture.', 400);
  }

  const mimeType = match[1].toLowerCase();
  const fileBuffer = Buffer.from(match[2], 'base64');
  const maxBytes = 2 * 1024 * 1024;

  if (fileBuffer.length > maxBytes) {
    throw new AppError('Profile picture must be smaller than 2MB.', 400);
  }

  const extension = EXTENSIONS[mimeType];
  const filename = `${userId}-${crypto.randomUUID()}.${extension}`;
  const relativeDir = path.join(env.storage.uploadDir, env.storage.profileBucket);
  const absoluteDir = path.join(__dirname, '..', relativeDir);
  const absolutePath = path.join(absoluteDir, filename);

  await fs.mkdir(absoluteDir, { recursive: true });
  await fs.writeFile(absolutePath, fileBuffer);

  return `/uploads/${env.storage.profileBucket}/${filename}`;
};

module.exports = { saveProfilePicture };
