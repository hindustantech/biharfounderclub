import Banner from "../models/banner.js";
import { uploadToCloudinary } from "../config/imageUpload.js";

/**
 * CREATE NEW BANNER
 * Accepts: title (required), link (optional), email (optional), phoneNumber (optional), image file (req.file)
 */
export const createBanner = async (req, res, next) => {
  try {
    const { title, link, email, phoneNumber } = req.body;

    if (!title) return res.status(400).json({ message: "Title is required" });
    if (!req.file) return res.status(400).json({ message: "Banner image is required" });

    const imageUrl = await uploadToCloudinary(req.file.buffer, "banners");

    const newBanner = new Banner({
      title,
      imageUrl,
      link: link || [],
      email,
      phoneNumber,
    });

    const savedBanner = await newBanner.save();
    res.status(201).json({ message: "Banner created successfully", data: savedBanner });
  } catch (error) {
    next(error);
  }
};

/**
 * GET ALL BANNERS
 * Optional query param: activeOnly=true
 */
export const getBanners = async (req, res, next) => {
  try {
    const { activeOnly } = req.query;
    const query = {};

    if (activeOnly === "true") query.isActive = true;

    const banners = await Banner.find(query).sort({ createdAt: -1 });

    if (!banners || banners.length === 0) {
      return res.status(404).json({ message: "No banners found" });
    }

    res.status(200).json({ message: "Banners fetched successfully", data: banners });
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE BANNER
 * Accepts: title, link, email, phoneNumber, isActive, optional image file
 */
export const updateBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, link, email, phoneNumber, isActive } = req.body;

    let imageUrl;
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, "banners");
    }

    const updatedBanner = await Banner.findByIdAndUpdate(
      id,
      { 
        ...(title && { title }),
        ...(link && { link }),
        ...(email && { email }),
        ...(phoneNumber && { phoneNumber }),
        ...(typeof isActive !== "undefined" && { isActive }),
        ...(imageUrl && { imageUrl }),
      },
      { new: true }
    );

    if (!updatedBanner) return res.status(404).json({ message: "Banner not found" });

    res.status(200).json({ message: "Banner updated successfully", data: updatedBanner });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE BANNER
 */
export const deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deletedBanner = await Banner.findByIdAndDelete(id);

    if (!deletedBanner) return res.status(404).json({ message: "Banner not found" });

    res.status(200).json({ message: "Banner deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * TOGGLE BANNER STATUS (isActive)
 */
export const toggleBannerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);
    if (!banner) return res.status(404).json({ message: "Banner not found" });

    banner.isActive = !banner.isActive;
    const updatedBanner = await banner.save();

    res.status(200).json({ message: "Banner status updated", data: updatedBanner });
  } catch (error) {
    next(error);
  }
};
