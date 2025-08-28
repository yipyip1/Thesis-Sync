const express = require('express');
const ThesisIdea = require('../models/ThesisIdea');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all thesis ideas (Idea Pool)
router.get('/', async (req, res) => {
  try {
    const {
      category,
      tags,
      difficulty,
      search,
      author,
      page = 1,
      limit = 12
    } = req.query;

    const query = { isPublic: true };

    // Add filters
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (author) query.author = author;
    if (tags) {
      const tagsArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagsArray };
    }
    if (search) {
      query.$text = { $search: search };
    }

    const ideas = await ThesisIdea.find(query)
      .populate('author', 'name role avatar department')
      .populate('comments.user', 'name avatar')
      .populate('likes.user', 'name')
      .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ThesisIdea.countDocuments(query);

    res.json({
      success: true,
      ideas,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get single thesis idea
router.get('/:id', async (req, res) => {
  try {
    const idea = await ThesisIdea.findById(req.params.id)
      .populate('author', 'name role avatar department university')
      .populate('comments.user', 'name avatar role')
      .populate('likes.user', 'name avatar');

    if (!idea) {
      return res.status(404).json({
        success: false,
        message: 'Thesis idea not found'
      });
    }

    res.json({
      success: true,
      idea
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Create new thesis idea
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      tags,
      category,
      difficulty,
      requiredSkills,
      estimatedDuration,
      isPublic = true
    } = req.body;

    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and category are required'
      });
    }

    const idea = new ThesisIdea({
      title,
      description,
      tags: Array.isArray(tags) ? tags : tags?.split(',').map(tag => tag.trim()) || [],
      category,
      difficulty,
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : requiredSkills?.split(',').map(skill => skill.trim()) || [],
      estimatedDuration,
      author: req.userId,
      isPublic
    });

    await idea.save();

    // Populate author info for response
    await idea.populate('author', 'name role avatar department');

    // Add to user's activity log
    await User.findByIdAndUpdate(req.userId, {
      $push: {
        activityLog: {
          action: 'thesis_idea_created',
          timestamp: new Date(),
          details: { ideaId: idea._id, title }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Thesis idea created successfully',
      idea
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Update thesis idea
router.put('/:id', auth, async (req, res) => {
  try {
    const idea = await ThesisIdea.findById(req.params.id);

    if (!idea) {
      return res.status(404).json({
        success: false,
        message: 'Thesis idea not found'
      });
    }

    // Check if user is the author or admin
    const user = await User.findById(req.userId);
    if (idea.author.toString() !== req.userId && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const {
      title,
      description,
      tags,
      category,
      difficulty,
      requiredSkills,
      estimatedDuration,
      isPublic,
      status
    } = req.body;

    // Update fields
    if (title) idea.title = title;
    if (description) idea.description = description;
    if (tags) idea.tags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
    if (category) idea.category = category;
    if (difficulty) idea.difficulty = difficulty;
    if (requiredSkills) idea.requiredSkills = Array.isArray(requiredSkills) ? requiredSkills : requiredSkills.split(',').map(skill => skill.trim());
    if (estimatedDuration) idea.estimatedDuration = estimatedDuration;
    if (typeof isPublic === 'boolean') idea.isPublic = isPublic;
    if (status) idea.status = status;

    await idea.save();
    await idea.populate('author', 'name role avatar department');

    res.json({
      success: true,
      message: 'Thesis idea updated successfully',
      idea
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Delete thesis idea
router.delete('/:id', auth, async (req, res) => {
  try {
    const idea = await ThesisIdea.findById(req.params.id);

    if (!idea) {
      return res.status(404).json({
        success: false,
        message: 'Thesis idea not found'
      });
    }

    // Check if user is the author or admin
    const user = await User.findById(req.userId);
    if (idea.author.toString() !== req.userId && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await ThesisIdea.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Thesis idea deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Like/unlike thesis idea
router.post('/:id/like', auth, async (req, res) => {
  try {
    const idea = await ThesisIdea.findById(req.params.id);

    if (!idea) {
      return res.status(404).json({
        success: false,
        message: 'Thesis idea not found'
      });
    }

    const existingLike = idea.likes.find(like => like.user.toString() === req.userId);

    if (existingLike) {
      // Unlike
      idea.likes = idea.likes.filter(like => like.user.toString() !== req.userId);
    } else {
      // Like
      idea.likes.push({
        user: req.userId,
        timestamp: new Date()
      });
    }

    await idea.save();

    res.json({
      success: true,
      message: existingLike ? 'Idea unliked' : 'Idea liked',
      likesCount: idea.likes.length,
      isLiked: !existingLike
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Add comment to thesis idea
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    const idea = await ThesisIdea.findById(req.params.id);

    if (!idea) {
      return res.status(404).json({
        success: false,
        message: 'Thesis idea not found'
      });
    }

    const comment = {
      user: req.userId,
      content: content.trim(),
      timestamp: new Date()
    };

    idea.comments.push(comment);
    await idea.save();

    // Populate the new comment's user info
    await idea.populate('comments.user', 'name avatar role');

    // Get the newly added comment
    const newComment = idea.comments[idea.comments.length - 1];

    res.json({
      success: true,
      message: 'Comment added successfully',
      comment: newComment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get ideas by current user
router.get('/my/ideas', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const ideas = await ThesisIdea.find({ author: req.userId })
      .populate('author', 'name role avatar department')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ThesisIdea.countDocuments({ author: req.userId });

    res.json({
      success: true,
      ideas,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get trending/popular ideas
router.get('/trending/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const ideas = await ThesisIdea.aggregate([
      { $match: { isPublic: true } },
      {
        $addFields: {
          likesCount: { $size: '$likes' },
          commentsCount: { $size: '$comments' },
          popularity: {
            $add: [
              { $multiply: [{ $size: '$likes' }, 2] },
              { $size: '$comments' }
            ]
          }
        }
      },
      { $sort: { popularity: -1, createdAt: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Populate author info
    await ThesisIdea.populate(ideas, { path: 'author', select: 'name role avatar department' });

    res.json({
      success: true,
      ideas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
