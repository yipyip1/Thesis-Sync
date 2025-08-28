const express = require('express');
const ThesisProject = require('../models/ThesisProject');
const TeamRequest = require('../models/TeamRequest');
const User = require('../models/User');
const Group = require('../models/Group');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'file-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, TXT, and ZIP files are allowed.'));
    }
  }
});

// Create a new thesis project
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      students,
      supervisor,
      coSupervisors,
      category,
      tags,
      expectedEndDate,
      teamRequestId
    } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and category are required'
      });
    }

    // Validate that current user can create project (only supervisors and admins)
    const currentUser = await User.findById(req.userId);
    if (!['supervisor', 'admin'].includes(currentUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only supervisors and administrators can create projects'
      });
    }

    const project = new ThesisProject({
      title,
      description,
      students: students || [],
      supervisor: supervisor || req.userId, // Current user (supervisor) is the supervisor
      coSupervisors: coSupervisors || [],
      category,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
      expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : undefined,
      // Initialize with basic phases
      phases: [
        {
          name: 'Proposal',
          description: 'Research proposal and literature review',
          status: 'in_progress',
          progress: 0
        },
        {
          name: 'Research',
          description: 'Conduct research and data collection',
          status: 'not_started',
          progress: 0
        },
        {
          name: 'Development',
          description: 'Implementation and development phase',
          status: 'not_started',
          progress: 0
        },
        {
          name: 'Testing',
          description: 'Testing and validation',
          status: 'not_started',
          progress: 0
        },
        {
          name: 'Documentation',
          description: 'Final documentation and thesis writing',
          status: 'not_started',
          progress: 0
        },
        {
          name: 'Defense',
          description: 'Thesis defense preparation and presentation',
          status: 'not_started',
          progress: 0
        }
      ]
    });

    await project.save();

    // Create a team chat group for the project
    const groupData = {
      name: `${title} - Team`,
      description: `Team chat for thesis project: ${title}`,
      thesisTitle: title,
      members: [
        { user: supervisor || req.userId, role: 'admin' }, // Supervisor is admin
        ...(students || []).map(studentId => ({ user: studentId, role: 'member' })),
        ...(coSupervisors || []).map(coSupId => ({ user: coSupId, role: 'member' }))
      ],
      type: 'project'
    };

    const group = new Group(groupData);
    await group.save();

    project.teamChat = group._id;
    await project.save();

    // If created from team request, update the team request status
    if (teamRequestId) {
      await TeamRequest.findByIdAndUpdate(teamRequestId, { status: 'completed' });
    }

    // Add activity log
    project.activityLog.push({
      action: 'project_created',
      actor: req.userId,
      timestamp: new Date(),
      details: { title }
    });

    // Add to user's activity log as well
    const user = await User.findById(req.userId);
    user.activityLog.push({
      action: 'project_created',
      timestamp: new Date(),
      details: { projectId: project._id, title }
    });
    await user.save();

    await project.save();
    await project.populate([
      { path: 'students', select: 'name email avatar department' },
      { path: 'supervisor', select: 'name email avatar department' },
      { path: 'coSupervisors', select: 'name email avatar department' },
      { path: 'teamChat', select: 'name' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Thesis project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get all projects (with filtering and search)
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      status,
      supervisor,
      student
    } = req.query;

    const query = {};

    // Add search functionality
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Add filters
    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (supervisor) {
      query.$or = [
        { supervisor },
        { coSupervisors: supervisor }
      ];
    }

    if (student) {
      query.students = student;
    }

    // If not admin, only show public projects or projects user is involved in
    const currentUser = await User.findById(req.userId);
    if (currentUser.role !== 'admin') {
      query.$or = [
        { isPublic: true },
        { students: req.userId },
        { supervisor: req.userId },
        { coSupervisors: req.userId }
      ];
    }

    const projects = await ThesisProject.find(query)
      .populate([
        { path: 'students', select: 'name email avatar department' },
        { path: 'supervisor', select: 'name email avatar department' },
        { path: 'coSupervisors', select: 'name email avatar department' }
      ])
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ThesisProject.countDocuments(query);

    res.json({
      success: true,
      projects,
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

// Get user's projects
router.get('/my-projects', auth, async (req, res) => {
  try {
    const projects = await ThesisProject.find({
      $or: [
        { students: req.userId },
        { supervisor: req.userId },
        { coSupervisors: req.userId }
      ]
    })
    .populate([
      { path: 'students', select: 'name email avatar department' },
      { path: 'supervisor', select: 'name email avatar department' },
      { path: 'coSupervisors', select: 'name email avatar department' },
      { path: 'teamChat', select: 'name' }
    ])
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get single project details
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await ThesisProject.findById(req.params.id)
      .populate([
        { path: 'students', select: 'name email avatar department university skills' },
        { path: 'supervisor', select: 'name email avatar department university' },
        { path: 'coSupervisors', select: 'name email avatar department university' },
        { path: 'teamChat', select: 'name' },
        { path: 'documents.uploadedBy', select: 'name avatar' },
        { path: 'meetings.attendees', select: 'name avatar' },
        { path: 'meetings.actionItems.assignedTo', select: 'name avatar' },
        { path: 'activityLog.actor', select: 'name avatar' }
      ]);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check access permissions
    const currentUser = await User.findById(req.userId);
    const hasAccess = 
      project.isPublic ||
      currentUser.role === 'admin' ||
      project.students.some(s => s._id.toString() === req.userId) ||
      project.supervisor._id.toString() === req.userId ||
      project.coSupervisors.some(cs => cs._id.toString() === req.userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await ThesisProject.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permissions (supervisor, co-supervisors, or admin can update)
    const currentUser = await User.findById(req.userId);
    const canUpdate = 
      currentUser.role === 'admin' ||
      project.supervisor.toString() === req.userId ||
      project.coSupervisors.includes(req.userId);

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const {
      title,
      description,
      tags,
      expectedEndDate,
      status,
      isPublic,
      currentPhase
    } = req.body;

    if (title) project.title = title;
    if (description) project.description = description;
    if (tags) project.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    if (expectedEndDate) project.expectedEndDate = new Date(expectedEndDate);
    if (status) project.status = status;
    if (typeof isPublic === 'boolean') project.isPublic = isPublic;
    if (currentPhase) project.currentPhase = currentPhase;

    // Add activity log
    project.activityLog.push({
      action: 'project_updated',
      actor: req.userId,
      timestamp: new Date(),
      details: { updatedFields: Object.keys(req.body) }
    });

    await project.save();

    res.json({
      success: true,
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Update project phase
router.put('/:id/phases/:phaseId', auth, async (req, res) => {
  try {
    const project = await ThesisProject.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const phase = project.phases.id(req.params.phaseId);
    if (!phase) {
      return res.status(404).json({
        success: false,
        message: 'Phase not found'
      });
    }

    const { status, progress, startDate, endDate, deadline } = req.body;

    if (status) phase.status = status;
    if (typeof progress === 'number') phase.progress = Math.max(0, Math.min(100, progress));
    if (startDate) phase.startDate = new Date(startDate);
    if (endDate) phase.endDate = new Date(endDate);
    if (deadline) phase.deadline = new Date(deadline);

    // Recalculate overall progress
    const totalProgress = project.phases.reduce((sum, p) => sum + (p.progress || 0), 0);
    project.overallProgress = Math.round(totalProgress / project.phases.length);

    // Add activity log
    project.activityLog.push({
      action: 'phase_updated',
      actor: req.userId,
      timestamp: new Date(),
      details: { 
        phaseName: phase.name,
        newStatus: status,
        newProgress: progress
      }
    });

    await project.save();

    res.json({
      success: true,
      message: 'Phase updated successfully',
      project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Upload project document
router.post('/:id/documents', auth, upload.single('document'), async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const project = await ThesisProject.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is part of the project
    const isProjectMember = 
      project.students.includes(req.userId) ||
      project.supervisor.toString() === req.userId ||
      project.coSupervisors.includes(req.userId);

    if (!isProjectMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Mark previous versions as not latest if same type
    if (type && type !== 'other') {
      project.documents.forEach(doc => {
        if (doc.type === type) {
          doc.isLatest = false;
        }
      });
    }

    const document = {
      name: name || req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      type: type || 'other',
      uploadedBy: req.userId,
      uploadDate: new Date(),
      version: 1,
      isLatest: true
    };

    // Calculate version number for similar documents
    const similarDocs = project.documents.filter(doc => 
      doc.name.toLowerCase().includes(document.name.toLowerCase().split('.')[0])
    );
    if (similarDocs.length > 0) {
      document.version = Math.max(...similarDocs.map(doc => doc.version)) + 1;
    }

    project.documents.push(document);

    // Add activity log
    project.activityLog.push({
      action: 'document_uploaded',
      actor: req.userId,
      timestamp: new Date(),
      details: { 
        documentName: document.name,
        documentType: document.type
      }
    });

    await project.save();

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

// Add project milestone/important date
router.post('/:id/milestones', auth, async (req, res) => {
  try {
    const { title, description, date, type } = req.body;

    const project = await ThesisProject.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permissions
    const canUpdate = 
      project.supervisor.toString() === req.userId ||
      project.coSupervisors.includes(req.userId);

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Only supervisors can add milestones'
      });
    }

    project.importantDates.push({
      title,
      description,
      date: new Date(date),
      type,
      isCompleted: false
    });

    // Add activity log
    project.activityLog.push({
      action: 'milestone_added',
      actor: req.userId,
      timestamp: new Date(),
      details: { 
        milestoneTitle: title,
        milestoneDate: date,
        milestoneType: type
      }
    });

    await project.save();

    res.json({
      success: true,
      message: 'Milestone added successfully',
      project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get project statistics for dashboard
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    const userProjects = await ThesisProject.find({
      $or: [
        { students: req.userId },
        { supervisor: req.userId },
        { coSupervisors: req.userId }
      ]
    });

    const stats = {
      totalProjects: userProjects.length,
      activeProjects: userProjects.filter(p => ['proposal', 'approved', 'in_progress'].includes(p.status)).length,
      completedProjects: userProjects.filter(p => p.status === 'completed').length,
      averageProgress: userProjects.length > 0 
        ? Math.round(userProjects.reduce((sum, p) => sum + p.overallProgress, 0) / userProjects.length)
        : 0,
      upcomingDeadlines: []
    };

    // Get upcoming deadlines from all user projects
    userProjects.forEach(project => {
      project.importantDates.forEach(date => {
        if (!date.isCompleted && new Date(date.date) > new Date()) {
          stats.upcomingDeadlines.push({
            projectTitle: project.title,
            title: date.title,
            date: date.date,
            type: date.type,
            daysUntil: Math.ceil((new Date(date.date) - new Date()) / (1000 * 60 * 60 * 24))
          });
        }
      });
    });

    // Sort deadlines by date
    stats.upcomingDeadlines.sort((a, b) => new Date(a.date) - new Date(b.date));
    stats.upcomingDeadlines = stats.upcomingDeadlines.slice(0, 5); // Limit to 5 most urgent

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Admin route to clean up test projects (temporary for development)
router.delete('/cleanup/test-projects', auth, async (req, res) => {
  try {
    // Only allow admins to perform cleanup
    const currentUser = await User.findById(req.userId);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can perform cleanup operations'
      });
    }

    // Find projects where supervisor is also listed as a student (invalid state)
    const invalidProjects = await ThesisProject.find({
      $expr: {
        $and: [
          { $in: ['$supervisor', '$students'] }, // Supervisor is in students array
          { $ne: ['$supervisor', null] }
        ]
      }
    });

    console.log(`Found ${invalidProjects.length} invalid test projects to clean up`);

    // Also find associated groups to clean up
    const projectIds = invalidProjects.map(p => p._id);
    const groupsToDelete = await Group.find({
      thesisTitle: { $in: invalidProjects.map(p => p.title) }
    });

    // Delete the groups first
    if (groupsToDelete.length > 0) {
      await Group.deleteMany({
        _id: { $in: groupsToDelete.map(g => g._id) }
      });
      console.log(`Deleted ${groupsToDelete.length} associated groups`);
    }

    // Delete the invalid projects
    const deleteResult = await ThesisProject.deleteMany({
      _id: { $in: projectIds }
    });

    console.log(`Deleted ${deleteResult.deletedCount} invalid projects`);

    res.json({
      success: true,
      message: `Cleanup completed: Removed ${deleteResult.deletedCount} invalid projects and ${groupsToDelete.length} associated groups`,
      deletedProjects: deleteResult.deletedCount,
      deletedGroups: groupsToDelete.length
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during cleanup',
      error: error.message
    });
  }
});

module.exports = router;
