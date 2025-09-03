const express = require('express');
const ThesisApplication = require('../models/ThesisApplication');
const ThesisProject = require('../models/ThesisProject');
const Group = require('../models/Group');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const router = express.Router();

// Apply for a thesis project with a team
router.post('/', auth, async (req, res) => {
  try {
    const { projectId, teamId, message } = req.body;

    // Check if project exists and is public
    const project = await ThesisProject.findById(projectId).populate('supervisor');
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!project.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'This project is not accepting applications'
      });
    }

    // Check if team exists and user is the leader (admin role)
    const team = await Group.findById(teamId).populate('members.user');
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Find user's role in the team
    const userMembership = team.members.find(member => 
      member.user._id.toString() === req.userId
    );

    if (!userMembership || userMembership.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only team leaders can apply for thesis projects'
      });
    }

    // Check if team has minimum required members (at least 2)
    if (team.members.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Team must have at least 2 members to apply for thesis projects'
      });
    }

    // Check if application already exists
    const existingApplication = await ThesisApplication.findOne({
      project: projectId,
      team: teamId
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'Application already submitted for this project'
      });
    }

    // Create application
    const application = new ThesisApplication({
      project: projectId,
      team: teamId,
      applicant: req.userId,
      message
    });

    await application.save();

    // Create notification for supervisor
    const notification = new Notification({
      recipient: project.supervisor._id,
      type: 'thesis_application',
      title: 'New Thesis Application',
      message: `Team "${team.name}" has applied for your thesis project "${project.title}"`,
      data: {
        applicationId: application._id,
        projectId: projectId,
        teamId: teamId,
        teamName: team.name
      }
    });

    await notification.save();

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application
    });

  } catch (error) {
    console.error('Apply for thesis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get applications for a specific project (for supervisors)
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    console.log('=== GET PROJECT APPLICATIONS ===');
    const { projectId } = req.params;
    console.log('Project ID:', projectId);
    console.log('Requesting user ID:', req.userId);

    // Check if user is supervisor of the project
    const project = await ThesisProject.findById(projectId);
    if (!project) {
      console.log('Project not found');
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    console.log('Project found:', project.title);
    console.log('Project supervisor:', project.supervisor.toString());
    console.log('Requesting user matches supervisor:', project.supervisor.toString() === req.userId);

    if (project.supervisor.toString() !== req.userId) {
      console.log('Access denied - user is not supervisor');
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    console.log('Fetching applications for project:', projectId);
    const applications = await ThesisApplication.find({ project: projectId })
      .populate({
        path: 'team',
        populate: {
          path: 'members.user',
          select: 'name email avatar'
        }
      })
      .populate('applicant', 'name email avatar')
      .sort({ appliedAt: -1 });

    console.log('Found applications:', applications.length);
    applications.forEach((app, index) => {
      console.log(`Application ${index + 1}:`, {
        id: app._id,
        team: app.team?.name,
        applicant: app.applicant?.name,
        status: app.status,
        appliedAt: app.appliedAt
      });
    });

    res.json({
      success: true,
      applications
    });
    
    console.log('=== END GET PROJECT APPLICATIONS ===');

  } catch (error) {
    console.error('Get project applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get user's applications
router.get('/my-applications', auth, async (req, res) => {
  try {
    const applications = await ThesisApplication.find({ applicant: req.userId })
      .populate('project', 'title description supervisor')
      .populate({
        path: 'project',
        populate: {
          path: 'supervisor',
          select: 'name email'
        }
      })
      .populate('team', 'name')
      .sort({ appliedAt: -1 });

    res.json({
      success: true,
      applications
    });

  } catch (error) {
    console.error('Get my applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Accept/Reject application
router.put('/:applicationId', auth, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, reviewMessage } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const application = await ThesisApplication.findById(applicationId)
      .populate('project')
      .populate('team')
      .populate('applicant');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if user is supervisor of the project
    if (application.project.supervisor.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update application
    application.status = status;
    application.reviewedAt = new Date();
    application.reviewedBy = req.userId;
    application.reviewMessage = reviewMessage;

    await application.save();

    // If accepted, add team to project and reject other applications
    if (status === 'accepted') {
      // Add team members to project
      const teamMemberIds = application.team.members.map(member => member.user);
      await ThesisProject.findByIdAndUpdate(application.project._id, {
        $addToSet: { students: { $each: teamMemberIds } },
        status: 'approved'
      });

      // Reject other pending applications for this project
      await ThesisApplication.updateMany(
        { 
          project: application.project._id, 
          _id: { $ne: applicationId },
          status: 'pending'
        },
        { 
          status: 'rejected',
          reviewedAt: new Date(),
          reviewedBy: req.userId,
          reviewMessage: 'Another team was selected for this project'
        }
      );
    }

    // Create notification for applicant
    const notification = new Notification({
      recipient: application.applicant._id,
      type: 'application_response',
      title: `Application ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your application for "${application.project.title}" has been ${status}`,
      data: {
        applicationId: application._id,
        projectId: application.project._id,
        status
      }
    });

    await notification.save();

    res.json({
      success: true,
      message: `Application ${status} successfully`,
      application
    });

  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
