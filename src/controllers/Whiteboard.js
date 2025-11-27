import Whiteboard from "../models/whiteboard.js";


export const createWhiteboard = async (req, res, next) => {
    try {
        const { category, title, description } = req.body;

        // Validation
        if (!category || !title || !description) {
            return res.status(400).json({
                message: "Category, title and description are required",
            });
        }

        const post = await Whiteboard.create({
            category,
            title,
            description,
            createdBy: req.user.id,
        });

        res.status(201).json({
            message: "Whiteboard post created successfully",
            data: post,
        });
    } catch (error) {
        next(error);
    }
};

const buildPaginationPipeline = (category, page, limit) => {
    return {
        data: [
            { $match: { category } },
            { $sort: { createdAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit }
        ],
        count: [
            { $match: { category } },
            { $count: "total" }
        ]
    };
};


export const getWhiteboardsPaged = async (req, res, next) => {
    try {
        const {
            snPage = 1,
            snLimit = 10,
            swPage = 1,
            swLimit = 10,
            soPage = 1,
            soLimit = 10,
        } = req.query;

        const pipelines = {
            startup_news: buildPaginationPipeline("startup_news", Number(snPage), Number(snLimit)),
            services_wanted: buildPaginationPipeline("services_wanted", Number(swPage), Number(swLimit)),
            services_offering: buildPaginationPipeline("services_offering", Number(soPage), Number(soLimit))
        };

        const facetStage = {
            $facet: {
                startup_news: pipelines.startup_news.data,
                startup_news_count: pipelines.startup_news.count,

                services_wanted: pipelines.services_wanted.data,
                services_wanted_count: pipelines.services_wanted.count,

                services_offering: pipelines.services_offering.data,
                services_offering_count: pipelines.services_offering.count,
            }
        };

        const result = await Whiteboard.aggregate([facetStage]);

        const format = (cat, page, limit) => ({
            data: result[0][cat],
            total: result[0][`${cat}_count`][0]?.total || 0,
            page,
            limit,
        });

        res.status(200).json({
            success: true,
            data: {
                startup_news: format("startup_news", Number(snPage), Number(snLimit)),
                services_wanted: format("services_wanted", Number(swPage), Number(swLimit)),
                services_offering: format("services_offering", Number(soPage), Number(soLimit)),
            }
        });

    } catch (error) {
        console.error("Whiteboard Pagination Error:", error);
        next(error);
    }
};



export const getWhiteboardById = async (req, res, next) => {
    try {
        const post = await Whiteboard.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        res.status(200).json(post);
    } catch (error) {
        next(error);
    }
};


export const deleteWhiteboard = async (req, res, next) => {
    try {
        const post = await Whiteboard.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Check if the user is the creator
        if (post.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized" });
        }
        await post.remove();
        res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        next(error);
    }
};
export const updateWhiteboard = async (req, res, next) => {
    try {
        const post = await Whiteboard.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (post.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized to update this post" });
        }

        const updates = {
            category: req.body.category ?? post.category,
            title: req.body.title ?? post.title,
            description: req.body.description ?? post.description,
        };

        const updatedPost = await Whiteboard.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            message: "Post updated successfully",
            data: updatedPost,
        });
    } catch (error) {
        next(error);
    }
};

