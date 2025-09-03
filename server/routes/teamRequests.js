const express = require('express');
const TeamRequest = require('../models/TeamRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { sendTeamApplicationEmail } = require('../utils/emailService');
const router = express.Router();

// Create a new team request
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      thesisTopic,
      requiredSkills,
      maxTeamSize,
      category,
      deadline
    } = req.body;

    if (!title || !description || !thesisTopic || !requiredSkills || !maxTeamSize || !category) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    const teamRequest = new TeamRequest({
      title,
      description,
      thesisTopic,
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : requiredSkills.split(',').map(s => s.trim()),
      teamSize: {
        current: 1,
        max: maxTeamSize
      },
      creator: req.userId,
      members: [{ user: req.userId, role: 'leader' }],
      category,
      deadline: deadline ? new Date(deadline) : undefined
    });

    await teamRequest.save();
    await teamRequest.populate([
      { path: 'creator', select: 'name email avatar department' },
      { path: 'members.user', select: 'name email avatar department' }
    ]);

    // Add activity log to user
    const user = await User.findById(req.userId);
    user.activityLog.push({
      action: 'team_request_created',
      timestamp: new Date(),
      details: { teamRequestId: teamRequest._id, title }
    });
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Team request created successfully',
      teamRequest
    });
  } catch (error) {
    console.error('Create team request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get teams ready for supervision (for supervisors)
router.get('/for-supervision', auth, async (req, res) => {
  try {
    console.log('=== TEAMS FOR SUPERVISION REQUEST ===');
    console.log('User ID:', req.userId);
    
    // Get user to check if they're a supervisor
    const user = await User.findById(req.userId);
    console.log('User role:', user?.role);
    
    if (!user || user.role !== 'supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only supervisors can view teams for supervision.'
      });
    }

    const {
      page = 1,
      limit = 10,
      category,
      search
    } = req.query;

    // Query for teams ready for supervision:
    // 1. Team is full (current size = max size)
    // 2. Status is 'in_progress' (no longer recruiting)
    // 3. Either no supervisor assigned OR supervisor request is 'none' or 'rejected'
    const query = {
      $expr: { $eq: ['$teamSize.current', '$teamSize.max'] }, // Team is full
      status: 'in_progress', // Ready and no longer recruiting
      $or: [
        { supervisor: { $exists: false } }, // No supervisor assigned
        { supervisor: null }, // No supervisor assigned
        { 'supervisorRequest.status': 'none' }, // No supervision requested yet
        { 'supervisorRequest.status': 'rejected' } // Previous request was rejected
      ]
    };

    // Add filters
    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { thesisTopic: new RegExp(search, 'i') }
      ];
    }

    console.log('Query for teams ready for supervision:', JSON.stringify(query, null, 2));

    const teamRequests = await TeamRequest.find(query)
      .populate([
        { path: 'creator', select: 'name email avatar department university' },
        { path: 'members.user', select: 'name email avatar department university skills' },
        { path: 'supervisor', select: 'name email avatar department' }
      ])
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await TeamRequest.countDocuments(query);

    console.log('Found teams ready for supervision:', teamRequests.length);

    res.json({
      success: true,
      teamRequests,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching teams for supervision:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get all team requests
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      skills,
      search
    } = req.query;

    const query = { status: 'open' };

    // Add filters
    if (category && category !== 'all') {
      query.category = category;
    }

    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      query.requiredSkills = { $in: skillsArray.map(skill => new RegExp(skill, 'i')) };
    }

    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { thesisTopic: new RegExp(search, 'i') }
      ];
    }

    const teamRequests = await TeamRequest.find(query)
      .populate([
        { path: 'creator', select: 'name email avatar department university' },
        { path: 'members.user', select: 'name email avatar department' },
        { path: 'supervisor', select: 'name email avatar department' },
        { path: 'applications.user', select: 'name email avatar department' }
      ])
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await TeamRequest.countDocuments(query);

    res.json({
      success: true,
      teamRequests,
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

// Get user's team requests
router.get('/my-requests', auth, async (req, res) => {
  try {
    const teamRequests = await TeamRequest.find({
      $or: [
        { creator: req.userId },
        { 'members.user': req.userId },
        { 'applications.user': req.userId }
      ]
    })
    .populate([
      { path: 'creator', select: 'name email avatar department' },
      { path: 'members.user', select: 'name email avatar department' },
      { path: 'applications.user', select: 'name email avatar department skills' },
      { path: 'supervisor', select: 'name email avatar department' }
    ])
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      teamRequests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Apply to join a team request
router.post('/:id/apply', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const teamRequest = await TeamRequest.findById(req.params.id);

    if (!teamRequest) {
      return res.status(404).json({
        success: false,
        message: 'Team request not found'
      });
    }

    if (teamRequest.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'This team request is no longer open'
      });
    }

    // Check if user is the creator (can't apply to own team)
    if (teamRequest.creator.toString() === req.userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot apply to your own team request'
      });
    }

    // Check if user is already a member
    if (teamRequest.members.some(member => member.user.toString() === req.userId)) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this team'
      });
    }

    // Check if user has already applied
    if (teamRequest.applications.some(app => app.user.toString() === req.userId)) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied to this team'
      });
    }

    // Check if team is full
    if (teamRequest.teamSize.current >= teamRequest.teamSize.max) {
      return res.status(400).json({
        success: false,
        message: 'This team is already full'
      });
    }

    teamRequest.applications.push({
      user: req.userId,
      message,
      appliedAt: new Date()
    });

    await teamRequest.save();

    // Get the newly created application ID
    const newApplication = teamRequest.applications[teamRequest.applications.length - 1];

    // Create notification for team creator
    const notification = new Notification({
      recipient: teamRequest.creator,
      sender: req.userId,
      type: 'team_application',
      title: 'New Team Application',
      message: `Someone applied to join your team "${teamRequest.title}"`,
      relatedId: teamRequest._id,
      relatedModel: 'TeamRequest',
      actionData: {
        applicationId: newApplication._id,
        teamId: teamRequest._id,
        applicantId: req.userId
      }
    });
    await notification.save();

    // Emit real-time notification via Socket.IO
    if (req.io) {
      // Populate notification with sender info for frontend
      const populatedNotification = await Notification.findById(notification._id)
        .populate('sender', 'name email avatar');
      
      console.log('Emitting team application notification to user:', teamRequest.creator);
      
      // Emit to the specific user's room
      req.io.to(`user-${teamRequest.creator}`).emit('new-notification', {
        ...populatedNotification.toObject(),
        id: notification._id
      });
      
      req.io.to(`user-${teamRequest.creator}`).emit('team-application-received', {
        ...populatedNotification.toObject(),
        id: notification._id
      });
      
      console.log(`Notification sent to user room: user-${teamRequest.creator}`);
    }

    // Send email notification to team leader
    try {
      console.log('=== TEAM APPLICATION EMAIL NOTIFICATION ===');
      const teamLeader = await User.findById(teamRequest.creator);
      const applicant = await User.findById(req.userId);
      
      console.log('Team leader:', teamLeader ? teamLeader.email : 'Not found');
      console.log('Applicant:', applicant ? applicant.name : 'Not found');
      console.log('Team title:', teamRequest.title);
      
      if (teamLeader && teamLeader.email && applicant) {
        console.log('Attempting to send email to:', teamLeader.email);
        
        const emailResult = await sendTeamApplicationEmail(
          teamLeader.email,
          teamLeader.name,
          applicant.name,
          teamRequest.title,
          message
        );
        
        console.log('Email result:', emailResult);
        
        if (emailResult.success) {
          console.log('✅ Email sent successfully');
          // Update notification to mark email as sent
          notification.emailSent = true;
          notification.emailSentAt = new Date();
          await notification.save();
        } else {
          console.log('❌ Email failed:', emailResult.error);
        }
      } else {
        console.log('❌ Missing required data for email:');
        console.log('- Team leader found:', !!teamLeader);
        console.log('- Team leader email:', teamLeader?.email);
        console.log('- Applicant found:', !!applicant);
      }
    } catch (emailError) {
      console.error('❌ Error sending team application email:', emailError);
      // Don't fail the entire request if email fails
    }

    // Add activity log
    const user = await User.findById(req.userId);
    user.activityLog.push({
      action: 'team_application_sent',
      timestamp: new Date(),
      details: { teamRequestId: teamRequest._id, teamTitle: teamRequest.title }
    });
    await user.save();

    res.json({
      success: true,
      message: 'Application sent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Accept/reject team application
router.put('/:id/applications/:applicationId', auth, async (req, res) => {
  try {
    console.log('=== MANAGE APPLICATION REQUEST ===');
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    console.log('User ID:', req.userId);
    console.log('Manage application request:', {
      teamId: req.params.id,
      applicationId: req.params.applicationId,
      status: req.body.status,
      userId: req.userId
    });

    const { status } = req.body; // 'accepted' or 'rejected'
    
    console.log('Attempting to find team request...');
    const teamRequest = await TeamRequest.findById(req.params.id);

    if (!teamRequest) {
      console.log('❌ Team request not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Team request not found'
      });
    }

    console.log('✅ Team request found successfully');
    console.log('Team request details:', {
      teamId: teamRequest._id,
      creator: teamRequest.creator,
      currentUser: req.userId,
      applicationsCount: teamRequest.applications.length,
      applications: teamRequest.applications.map(app => ({
        id: app._id,
        user: app.user,
        status: app.status
      }))
    });

    // Check if current user is the creator
    if (teamRequest.creator.toString() !== req.userId) {
      console.log('❌ Permission denied - not creator:', {
        teamCreator: teamRequest.creator.toString(),
        currentUser: req.userId
      });
      return res.status(403).json({
        success: false,
        message: 'Only team creator can manage applications'
      });
    }

    console.log('✅ Permission check passed - user is creator');

    console.log('Looking for application with ID:', req.params.applicationId);
    const application = teamRequest.applications.id(req.params.applicationId);
    if (!application) {
      console.log('❌ Application not found:', req.params.applicationId);
      console.log('Available applications:', teamRequest.applications.map(app => ({ 
        id: app._id.toString(), 
        user: app.user,
        status: app.status 
      })));
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    console.log('✅ Application found:', {
      applicationId: application._id,
      user: application.user,
      currentStatus: application.status
    });

    application.status = status;
    console.log('✅ Application status updated to:', status);

    if (status === 'accepted') {
      console.log('Processing acceptance...');
      // Add user to team members
      teamRequest.members.push({
        user: application.user,
        role: 'member',
        joinedAt: new Date()
      });
      teamRequest.teamSize.current += 1;
      console.log('User added to team members, current team size:', teamRequest.teamSize.current);

      // If team is now full, close the request
      if (teamRequest.teamSize.current >= teamRequest.teamSize.max) {
        teamRequest.status = 'in_progress';
        console.log('Team is now full, status changed to in_progress');
      }
    }

    console.log('Saving team request...');
    await teamRequest.save();
    console.log('✅ Team request updated successfully');

    if (status === 'accepted') {
      // If accepted, remove the original team application notification
      console.log('Removing original team application notification...');
      try {
        await Notification.findOneAndDelete({
          type: 'team_application',
          'actionData.teamId': teamRequest._id,
          'actionData.applicationId': req.params.applicationId
        });
        console.log('✅ Original notification removed');
      } catch (deleteError) {
        console.log('⚠️ Could not delete original notification:', deleteError.message);
      }
    } else {
      // If rejected, create notification for applicant
      console.log('Creating notification for applicant...');
      const notification = new Notification({
        recipient: application.user,
        sender: req.userId,
        type: 'team_application_response',
        title: `Team Application Rejected`,
        message: `Your application to join "${teamRequest.title}" has been rejected`,
        relatedId: teamRequest._id,
        relatedModel: 'TeamRequest'
      });
      await notification.save();
      console.log('✅ Notification created for applicant');
    }

    res.json({
      success: true,
      message: `Application ${status} successfully`
    });
    console.log('✅ Response sent successfully');
  } catch (error) {
    console.error('❌ MANAGE APPLICATION ERROR:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Request supervisor for team
router.post('/:id/request-supervisor', auth, async (req, res) => {
  try {
    const { supervisorId, message } = req.body;
    const teamRequest = await TeamRequest.findById(req.params.id);

    if (!teamRequest) {
      return res.status(404).json({
        success: false,
        message: 'Team request not found'
      });
    }

    // Check if current user is team creator or member
    const isMember = teamRequest.members.some(member => member.user.toString() === req.userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Only team members can request supervisors'
      });
    }

    // Check if supervisor exists and is actually a supervisor
    const supervisor = await User.findById(supervisorId);
    if (!supervisor || supervisor.role !== 'supervisor') {
      return res.status(404).json({
        success: false,
        message: 'Supervisor not found'
      });
    }

    // Check if already has a supervisor request pending or accepted
    if (teamRequest.supervisorRequest.status !== 'none') {
      return res.status(400).json({
        success: false,
        message: 'Supervisor request already exists'
      });
    }

    teamRequest.supervisor = supervisorId;
    teamRequest.supervisorRequest = {
      status: 'pending',
      requestedAt: new Date(),
      message
    };

    await teamRequest.save();

    // Create notification for supervisor
    const notification = new Notification({
      recipient: supervisorId,
      sender: req.userId,
      type: 'supervisor_request',
      title: 'New Supervision Request',
      message: `A team has requested you to supervise their thesis project "${teamRequest.title}"`,
      relatedId: teamRequest._id,
      relatedModel: 'TeamRequest'
    });
    await notification.save();

    res.json({
      success: true,
      message: 'Supervisor request sent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Supervisor accept/reject team request
router.put('/:id/supervisor-response', auth, async (req, res) => {
  try {
    const { status, responseMessage } = req.body; // 'accepted' or 'rejected'
    const teamRequest = await TeamRequest.findById(req.params.id);

    if (!teamRequest) {
      return res.status(404).json({
        success: false,
        message: 'Team request not found'
      });
    }

    // Check if current user is the requested supervisor
    if (teamRequest.supervisor.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not the requested supervisor'
      });
    }

    teamRequest.supervisorRequest.status = status;
    teamRequest.supervisorRequest.respondedAt = new Date();
    teamRequest.supervisorRequest.message = responseMessage;

    if (status === 'rejected') {
      teamRequest.supervisor = undefined;
    }

    await teamRequest.save();

    // Create notifications for all team members
    for (const member of teamRequest.members) {
      const notification = new Notification({
        recipient: member.user,
        sender: req.userId,
        type: 'supervisor_response',
        title: `Supervision Request ${status === 'accepted' ? 'Accepted' : 'Rejected'}`,
        message: `Your supervision request for "${teamRequest.title}" has been ${status}`,
        relatedId: teamRequest._id,
        relatedModel: 'TeamRequest'
      });
      await notification.save();
    }

    res.json({
      success: true,
      message: `Supervision request ${status} successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Update team request
router.put('/:id', auth, async (req, res) => {
  try {
    const teamRequest = await TeamRequest.findById(req.params.id);

    if (!teamRequest) {
      return res.status(404).json({
        success: false,
        message: 'Team request not found'
      });
    }

    // Check if current user is the creator
    if (teamRequest.creator.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Only team creator can update the request'
      });
    }

    const {
      title,
      description,
      thesisTopic,
      requiredSkills,
      maxTeamSize,
      deadline
    } = req.body;

    if (title) teamRequest.title = title;
    if (description) teamRequest.description = description;
    if (thesisTopic) teamRequest.thesisTopic = thesisTopic;
    if (requiredSkills) {
      teamRequest.requiredSkills = Array.isArray(requiredSkills) 
        ? requiredSkills 
        : requiredSkills.split(',').map(s => s.trim());
    }
    if (maxTeamSize) teamRequest.teamSize.max = maxTeamSize;
    if (deadline) teamRequest.deadline = new Date(deadline);

    await teamRequest.save();

    res.json({
      success: true,
      message: 'Team request updated successfully',
      teamRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Delete team request
router.delete('/:id', auth, async (req, res) => {
  try {
    const teamRequest = await TeamRequest.findById(req.params.id);

    if (!teamRequest) {
      return res.status(404).json({
        success: false,
        message: 'Team request not found'
      });
    }

    // Check if current user is the creator or admin
    const user = await User.findById(req.userId);
    if (teamRequest.creator.toString() !== req.userId && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await TeamRequest.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Team request deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Test email endpoint (for development only)
router.post('/test-email', auth, async (req, res) => {
  try {
    const { testEmail } = req.body;
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const emailResult = await sendTeamApplicationEmail(
      testEmail || user.email,
      'Test Team Leader',
      user.name,
      'Test Team Project',
      'This is a test application message to verify email functionality.'
    );

    res.json({
      success: emailResult.success,
      message: emailResult.success ? 'Test email sent successfully' : 'Failed to send test email',
      details: emailResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get user's teams (teams where user is a member)
router.get('/my-teams', auth, async (req, res) => {
  try {
    const teams = await TeamRequest.find({
      'members.user': req.userId,
      status: { $in: ['open', 'in_progress', 'completed'] }
    })
    .populate([
      { path: 'creator', select: 'name email avatar department' },
      { path: 'members.user', select: 'name email avatar department' },
      { path: 'supervisor', select: 'name email avatar department' }
    ])
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      teams
    });
  } catch (error) {
    console.error('Get my teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
