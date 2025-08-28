const express = require('express');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'avatar') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Avatar must be an image file'));
      }
    } else if (file.fieldname === 'document') {
      if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Documents must be PDF or image files'));
      }
    } else {
      cb(null, true);
    }
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const {
      name,
      skills,
      researchInterests,
      department,
      university,
      bio,
      contactInfo,
      availability,
      maxStudents
    } = req.body;

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (skills) user.skills = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
    if (researchInterests) user.researchInterests = Array.isArray(researchInterests) ? researchInterests : researchInterests.split(',').map(s => s.trim());
    if (department) user.department = department;
    if (university) user.university = university;
    if (bio) user.bio = bio;
    if (contactInfo) user.contactInfo = { ...user.contactInfo, ...contactInfo };
    
    // Supervisor specific fields
    if (user.role === 'supervisor') {
      if (availability) user.availability = availability;
      if (maxStudents) user.maxStudents = maxStudents;
    }

    // Add activity log
    user.activityLog.push({
      action: 'profile_updated',
      timestamp: new Date(),
      details: { updatedFields: Object.keys(req.body) }
    });

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: await User.findById(req.userId).select('-password')
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Upload profile picture
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.avatar = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      avatarUrl: user.avatar
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Upload academic document
router.post('/documents', auth, upload.single('document'), async (req, res) => {
  try {
    const { name, type } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Document name and type are required'
      });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const document = {
      name,
      url: `/uploads/${req.file.filename}`,
      type,
      uploadDate: new Date()
    };

    user.academicDocuments.push(document);
    await user.save();

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Search supervisors (Advanced search feature)
router.get('/supervisors/search', auth, async (req, res) => {
  try {
    const {
      department,
      rating,
      availability,
      skills,
      researchInterests,
      page = 1,
      limit = 10
    } = req.query;

    const query = { 
      role: 'supervisor', 
      isActive: true, 
      isBanned: false 
    };

    // Add filters
    if (department) query.department = new RegExp(department, 'i');
    if (rating) query.rating = { $gte: parseFloat(rating) };
    if (availability) query.availability = availability;
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      query.skills = { $in: skillsArray.map(skill => new RegExp(skill, 'i')) };
    }
    if (researchInterests) {
      const interestsArray = researchInterests.split(',').map(s => s.trim());
      query.researchInterests = { $in: interestsArray.map(interest => new RegExp(interest, 'i')) };
    }

    const supervisors = await User.find(query)
      .select('-password -activityLog')
      .sort({ rating: -1, name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      supervisors,
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

// Get user's work history
router.get('/history', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('activityLog');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      history: user.activityLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Admin routes
// Assign/revoke supervisor role
router.put('/role/:userId', auth, async (req, res) => {
  try {
    const { role } = req.body;
    
    // Check if current user is admin
    const currentUser = await User.findById(req.userId);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    if (!['student', 'supervisor', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const oldRole = user.role;
    user.role = role;
    
    // Add activity log
    user.activityLog.push({
      action: 'role_changed',
      timestamp: new Date(),
      details: { oldRole, newRole: role, changedBy: req.userId }
    });

    await user.save();

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user: await User.findById(req.params.userId).select('-password')
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Ban/unban user
router.put('/ban/:userId', auth, async (req, res) => {
  try {
    const { isBanned, banReason } = req.body;
    
    // Check if current user is admin
    const currentUser = await User.findById(req.userId);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isBanned = isBanned;
    if (isBanned && banReason) {
      user.banReason = banReason;
    }
    
    // Add activity log
    user.activityLog.push({
      action: isBanned ? 'user_banned' : 'user_unbanned',
      timestamp: new Date(),
      details: { reason: banReason, bannedBy: req.userId }
    });

    await user.save();

    res.json({
      success: true,
      message: `User ${isBanned ? 'banned' : 'unbanned'} successfully`,
      user: await User.findById(req.params.userId).select('-password')
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
