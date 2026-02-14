const prisma = require('../lib/prisma');
const { uploadToCloudinary, cloudinary } = require('../middleware/upload');

exports.getProperty = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, propertyAddress: true, propertyDescription: true, propertyPhotos: true },
    });
    res.json({
      success: true,
      data: {
        id: user.id,
        propertyAddress: user.propertyAddress,
        propertyDescription: user.propertyDescription,
        propertyPhotos: user.propertyPhotos,
      },
    });
  } catch (error) { next(error); }
};

exports.updateProperty = async (req, res, next) => {
  try {
    const { propertyAddress, propertyDescription } = req.body;
    const data = {};
    if (propertyAddress !== undefined) data.propertyAddress = propertyAddress;
    if (propertyDescription !== undefined) data.propertyDescription = propertyDescription;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { propertyAddress: true, propertyDescription: true, propertyPhotos: true },
    });
    res.json({
      success: true,
      message: 'Property info updated successfully',
      data: { propertyAddress: user.propertyAddress, propertyDescription: user.propertyDescription, propertyPhotos: user.propertyPhotos },
    });
  } catch (error) { next(error); }
};

exports.getPhotos = async (req, res, next) => {
  try {
    const photos = await prisma.propertyPhoto.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: { photos, count: photos.length } });
  } catch (error) { next(error); }
};

exports.addPhoto = async (req, res, next) => {
  try {
    let url, publicId;

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, { folder: 'r3sults/property', resource_type: 'image' });
      url = result.secure_url;
      publicId = result.public_id;
    } else if (req.body.url) {
      url = req.body.url;
    } else {
      return res.status(400).json({ success: false, message: 'Image file or URL is required' });
    }

    const type = req.body.type || 'other';
    const label = req.body.label || null;

    const photo = await prisma.propertyPhoto.create({
      data: { userId: req.user.id, url, type, label, publicId },
    });
    res.status(201).json({ success: true, message: 'Property photo added successfully', data: { photo } });
  } catch (error) { next(error); }
};

exports.updatePhoto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.propertyPhoto.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }

    const data = {};
    if (req.body.type !== undefined) data.type = req.body.type;
    if (req.body.label !== undefined) data.label = req.body.label;

    if (req.file) {
      if (existing.publicId) {
        await cloudinary.uploader.destroy(existing.publicId).catch(() => {});
      }
      const result = await uploadToCloudinary(req.file.buffer, { folder: 'r3sults/property', resource_type: 'image' });
      data.url = result.secure_url;
      data.publicId = result.public_id;
    } else if (req.body.url !== undefined) {
      if (existing.publicId) {
        await cloudinary.uploader.destroy(existing.publicId).catch(() => {});
      }
      data.url = req.body.url;
      data.publicId = null;
    }

    const photo = await prisma.propertyPhoto.update({ where: { id }, data });
    res.json({ success: true, message: 'Property photo updated successfully', data: { photo } });
  } catch (error) { next(error); }
};

exports.deletePhoto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.propertyPhoto.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }

    if (existing.publicId) {
      await cloudinary.uploader.destroy(existing.publicId).catch(() => {});
    }

    await prisma.propertyPhoto.delete({ where: { id } });
    res.json({ success: true, message: 'Property photo deleted successfully' });
  } catch (error) { next(error); }
};
