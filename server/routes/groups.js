const express = require('express');
const Group = require('../models/Group');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all groups for user
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.userId
    }).populate('members.user', 'username email avatar isOnline');

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new group
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, thesisTitle, memberEmails } = req.body;

    const group = new Group({
      name,
      description,
      thesisTitle,
      members: [
        {
          user: req.userId,
          role: 'admin'
        }
      ]
    });

    await group.save();
    await group.populate('members.user', 'username email avatar isOnline');

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get group messages
router.get('/:groupId/messages', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ group: groupId })
      .populate('sender', 'username avatar')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add member to group
router.post('/:groupId/members', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin
    const isAdmin = group.members.some(
      member => member.user.toString() === req.userId && member.role === 'admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    // Check if user is already a member
    const isMember = group.members.some(
      member => member.user.toString() === userId
    );

    if (isMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    group.members.push({ user: userId });
    await group.save();
    await group.populate('members.user', 'username email avatar isOnline');

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add member to group by email
router.post('/:groupId/members/email', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { email } = req.body;

    console.log('Add member request:', { groupId, email, userId: req.userId });

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    console.log('Group found:', group.name);
    console.log('Group members:', group.members.map(m => ({ userId: m.user, role: m.role })));

    // Check if current user is admin
    const isAdmin = group.members.some(
      member => member.user.toString() === req.userId && member.role === 'admin'
    );

    console.log('Is admin check:', isAdmin);

    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    // Find user by email
    const User = require('../models/User');
    const userToAdd = await User.findOne({ email: email.toLowerCase() });
    console.log('User lookup result:', userToAdd ? 'Found' : 'Not found');
    
    if (!userToAdd) {
      return res.status(404).json({ message: 'User with this email not found' });
    }

    // Check if user is already a member
    const isMember = group.members.some(
      member => member.user.toString() === userToAdd._id.toString()
    );

    if (isMember) {
      return res.status(400).json({ message: 'User is already a member of this group' });
    }

    // Add user to group
    group.members.push({ user: userToAdd._id });
    await group.save();
    await group.populate('members.user', 'username email avatar isOnline');

    console.log('Member added successfully');

    // Notify group members about new member via socket
    if (req.io) {
      req.io.to(`group-${groupId}`).emit('member-added', {
        groupId: groupId,
        newMember: {
          user: {
            _id: userToAdd._id,
            username: userToAdd.username,
            email: userToAdd.email,
            avatar: userToAdd.avatar
          },
          role: 'member'
        },
        group: group
      });
    }

    res.json({
      message: 'Member added successfully',
      group,
      addedUser: {
        id: userToAdd._id,
        username: userToAdd.username,
        email: userToAdd.email
      }
    });
  } catch (error) {
    console.error('Error in add member route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
