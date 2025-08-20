const express = require('express');
const multer = require('multer');
const path = require('path');
const Message = require('../models/Message');
const Group = require('../models/Group');
const auth = require('../middleware/auth');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images, PDFs, and videos
  const allowedTypes = /jpeg|jpg|png|gif|pdf|mp4|mov|avi|mkv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and videos are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: fileFilter
});

// Send text message
router.post('/text', auth, async (req, res) => {
  try {
    const { groupId, content, replyTo } = req.body;

    // Verify user is member of group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(
      member => member.user.toString() === req.userId
    );

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const message = new Message({
      sender: req.userId,
      group: groupId,
      content,
      messageType: 'text',
      replyTo: replyTo || null
    });

    await message.save();
    await message.populate('sender', 'username avatar');
    if (replyTo) {
      await message.populate('replyTo');
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send file message
router.post('/file', auth, upload.single('file'), async (req, res) => {
  try {
    const { groupId, replyTo } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Verify user is member of group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(
      member => member.user.toString() === req.userId
    );

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Determine message type based on file
    let messageType = 'file';
    if (req.file.mimetype.startsWith('image/')) {
      messageType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      messageType = 'video';
    }

    const message = new Message({
      sender: req.userId,
      group: groupId,
      messageType,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`
      },
      replyTo: replyTo || null
    });

    await message.save();
    await message.populate('sender', 'username avatar');
    if (replyTo) {
      await message.populate('replyTo');
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark message as read
router.put('/:messageId/read', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if already read by user
    const alreadyRead = message.readBy.some(
      read => read.user.toString() === req.userId
    );

    if (!alreadyRead) {
      message.readBy.push({ user: req.userId });
      await message.save();
    }

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
