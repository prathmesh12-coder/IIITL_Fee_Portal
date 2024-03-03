const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,

  params: {
    folder: "IIITL_FEES_PORTAL",
    format: async (req, file) => "pdf",
    use_filename_as_display_name: true,
    allowed_formats: ["pdf"],
  },
});

module.exports = {
  cloudinary,
  storage,
};
