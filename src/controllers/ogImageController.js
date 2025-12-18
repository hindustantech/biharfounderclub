// controllers/ogImageController.js
import nodeHtmlToImage from "node-html-to-image";
import path from "path";
import fs from "fs-extra";
import whiteboard from "../models/whiteboard";
import mongoose from "mongoose";

export const generateOgImage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const post = await whiteboard.findById(id).populate("createdBy");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Prepare data for image
    const title = post.title || "Untitled Post";
    const description =
      post.description?.slice(0, 120) || "Discover something amazing at InShopzz.";
    const creatorImage =
      post.creatorProfile?.image ||
      "https://yourdomain.com/assets/default-avatar.png";
    const logoUrl = "https://yourdomain.com/assets/logo.png"; // Optional

    // Ensure image output directory exists
    const outputDir = path.join("public", "og-images");
    await fs.ensureDir(outputDir);

    const fileName = `${id}.png`;
    const outputPath = path.join(outputDir, fileName);

    // HTML Template for OG/Instagram card
    const html = `
      <html>
        <head>
          <style>
            body {
              width: 1200px;
              height: 630px;
              font-family: "Poppins", sans-serif;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: linear-gradient(135deg, #E8F3FF, #F4FAFF, #E9FDF3);
              padding: 40px;
              box-sizing: border-box;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .logo {
              width: 140px;
            }
            .title {
              font-size: 42px;
              font-weight: 700;
              color: #1a1a1a;
              margin-top: 60px;
              line-height: 1.3;
            }
            .description {
              font-size: 24px;
              color: #333;
              margin-top: 20px;
              line-height: 1.5;
            }
            .creator {
              display: flex;
              align-items: center;
              margin-top: auto;
              padding-top: 40px;
              border-top: 2px solid #dfe6f2;
            }
            .creator img {
              width: 90px;
              height: 90px;
              border-radius: 50%;
              object-fit: cover;
              margin-right: 20px;
            }
            .creator-info {
              font-size: 20px;
              color: #333;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoUrl}" class="logo" />
          </div>
          <div class="title">${title}</div>
          <div class="description">${description}</div>
          <div class="creator">
            <img src="${creatorImage}" alt="Creator" />
            <div class="creator-info">${post.creatorProfile?.email || "InShopzz"}</div>
          </div>
        </body>
      </html>
    `;

    // Generate image
    await nodeHtmlToImage({
      output: outputPath,
      html,
      puppeteerArgs: {
        args: ["--no-sandbox"],
      },
    });

    const imageUrl = `${process.env.BASE_URL || "https://yourdomain.com"}/og-images/${fileName}`;

    res.status(200).json({
      success: true,
      imageUrl,
      message: "OG Image generated successfully",
    });
  } catch (error) {
    console.error("OG Image Generation Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
