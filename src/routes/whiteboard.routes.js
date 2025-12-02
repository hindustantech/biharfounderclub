// routes/Whiteboard.routes.js
import express from 'express';
import Whiteboard from '../models/whiteboard.js';

import { protect,admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all Whiteboards (with filters for admin)
router.get('/admin/Whiteboards', protect, admin, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            category,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            featured
        } = req.query;

        // Build query
        const query = {};

        if (status) query.status = status;
        if (category) query.category = category;
        if (featured === 'true') query.isFeatured = true;

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Sorting
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [Whiteboards, total] = await Promise.all([
            Whiteboard.find(query)
                .populate('createdBy', 'fullName email')
                .populate('lastModifiedBy', 'fulName email')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Whiteboard.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: Whiteboards,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching Whiteboards:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get single Whiteboard details
router.get('/admin/Whiteboards/:id', protect, admin, async (req, res) => {
    try {
        const Whiteboard = await Whiteboard.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('lastModifiedBy', 'name email')
            .lean();

        if (!Whiteboard) {
            return res.status(404).json({
                success: false,
                message: 'Whiteboard not found'
            });
        }

        res.json({
            success: true,
            data: Whiteboard
        });
    } catch (error) {
        console.error('Error fetching Whiteboard:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Update Whiteboard status
router.patch('/admin/Whiteboards/:id/status', protect, admin, async (req, res) => {
    try {
        const { status, adminNotes } = req.body;

        if (!['pending', 'active', 'rejected', 'archived'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const whiteboard = await Whiteboard.findByIdAndUpdate(
            req.params.id,
            {
                status,
                adminNotes,
                lastModifiedBy: req.user._id
            },
            { new: true, runValidators: true }
        ).populate('createdBy', 'name email');

        if (!whiteboard) {
            return res.status(404).json({
                success: false,
                message: 'Whiteboard not found'
            });
        }

        res.json({
            success: true,
            data: whiteboard,
            message: `Whiteboard ${status} successfully`
        });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Toggle featured status
router.patch('/admin/Whiteboards/:id/featured', protect, admin, async (req, res) => {
    try {
        const { isFeatured, featuredUntil } = req.body;

        const updateData = {
            isFeatured,
            lastModifiedBy: req.user._id
        };

        if (isFeatured && featuredUntil) {
            updateData.featuredUntil = featuredUntil;
        } else {
            updateData.featuredUntil = null;
        }

        const whiteboard = await Whiteboard.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!whiteboard) {
            return res.status(404).json({
                success: false,
                message: 'Whiteboard not found'
            });
        }

        res.json({
            success: true,
            data: whiteboard,
            message: `Whiteboard ${isFeatured ? 'featured' : 'unfeatured'} successfully`
        });
    } catch (error) {
        console.error('Error updating featured status:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Delete Whiteboard
router.delete('/admin/Whiteboards/:id', protect, admin, async (req, res) => {
    try {
        const whiteboard = await Whiteboard.findByIdAndDelete(req.params.id);

        if (!whiteboard) {
            return res.status(404).json({
                success: false,
                message: 'Whiteboard not found'
            });
        }

        res.json({
            success: true,
            message: 'Whiteboard deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting Whiteboard:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get dashboard stats
router.get('/admin/Whiteboards-stats', protect, admin, async (req, res) => {
    try {
        const stats = await Whiteboard.aggregate([
            {
                $facet: {
                    statusCounts: [
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    categoryCounts: [
                        {
                            $group: {
                                _id: '$category',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    featuredCount: [
                        { $match: { isFeatured: true } },
                        { $count: 'count' }
                    ],
                    totalViews: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: '$views' }
                            }
                        }
                    ],
                    recentActivity: [
                        { $sort: { updatedAt: -1 } },
                        { $limit: 5 },
                        {
                            $project: {
                                title: 1,
                                status: 1,
                                updatedAt: 1,
                                category: 1
                            }
                        }
                    ]
                }
            }
        ]);

        res.json({
            success: true,
            data: stats[0]
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

export default router;