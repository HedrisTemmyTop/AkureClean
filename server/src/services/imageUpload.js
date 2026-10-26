/**
 * Image upload helper.
 * Uploads a base64 data URI to Cloudinary and returns the secure URL.
 * If Cloudinary credentials are not configured, falls back to returning the
 * data URI itself so the app still works in development.
 */
const env = require('../config/env');

let cloudinary = null;
const isConfigured = () =>
  !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

const getCloudinary = () => {
  if (!cloudinary) {
    cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
  return cloudinary;
};

/**
 * @param {string|null|undefined} image  base64 data URI or already-hosted URL
 * @param {string} folder                Cloudinary folder
 * @returns {Promise<string|null>}
 */
exports.uploadImage = async (image, folder = 'smartenv') => {
  if (!image || typeof image !== 'string') return null;
  if (/^https?:\/\//i.test(image)) return image; // already a URL

  const dataUri = image.startsWith('data:')
    ? image
    : `data:image/jpeg;base64,${image}`;

  if (!isConfigured()) {
    console.warn('[images] Cloudinary not configured — storing image inline.');
    return dataUri;
  }

  const result = await getCloudinary().uploader.upload(dataUri, {
    folder,
    resource_type: 'image',
  });
  return result.secure_url;
};
