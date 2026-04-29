import { v2 as cloudinary } from 'cloudinary';

function applyCloudinaryConfig() {
  const url = process.env.CLOUDINARY_URL?.trim();
  if (url) {
    const m = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@([^/?#]+)/);
    if (m) {
      const [, api_key, api_secret, cloud_name] = m;
      cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
      return;
    }
    console.warn('[cloudinary] CLOUDINARY_URL no tiene el formato cloudinary://KEY:SECRET@CLOUD_NAME');
  }
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure:     true,
    });
  }
}

applyCloudinaryConfig();

export default cloudinary;
