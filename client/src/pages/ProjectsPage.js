import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  BookOpen, 
  Users, 
  Calendar, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Edit,
  Trash2,
  Clock,
  Target,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { thesisProjectAPI, userAPI, thesisApplicationAPI, groupAPI } from '../utils/api';
import Navigation from '../components/Navigation';
import KanbanBoard from '../components/KanbanBoard';
import toast from 'react-hot-toast';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('my-projects');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showKanbanModal, setShowKanbanModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  
  // Kanban states
  const [projectTasks, setProjectTasks] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectsWithTaskProgress, setProjectsWithTaskProgress] = useState([]);
  
  // Status editing state
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  
  // Form states
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'AI',
    tags: '',
    expectedEndDate: '',
    students: [],
    supervisor: '',
    coSupervisors: []
  });
  
  const [supervisors, setSupervisors] = useState([]);
  const [students, setStudents] = useState([]);
  
  // Application states
  const [userTeams, setUserTeams] = useState([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedProjectForApplication, setSelectedProjectForApplication] = useState(null);
  const [applicationForm, setApplicationForm] = useState({
    teamId: '',
    message: ''
  });
  const [userApplications, setUserApplications] = useState([]);
  const [projectApplications, setProjectApplications] = useState([]);
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  const [selectedProjectForApplications, setSelectedProjectForApplications] = useState(null);

  const categories = ['AI', 'ML', 'Blockchain', 'Cybersecurity', 'IoT', 'Web Development', 'Mobile Development', 'Data Science', 'Other'];
  const statuses = ['proposal', 'approved', 'in_progress', 'review', 'defense_scheduled', 'completed', 'cancelled'];

  useEffect(() => {
    // Set default tab based on user role
    if (user?.role === 'student') {
      setActiveTab('all-projects');
    }
  }, [user]);

  useEffect(() => {
    fetchMyProjects();
    fetchAllProjects();
    if (user?.role === 'supervisor' || user?.role === 'admin') {
      fetchUsers();
    }
    if (user?.role === 'student') {
      fetchUserTeams();
      fetchUserApplications();
    }
  }, [searchTerm, filterStatus, filterCategory, user]);

  const fetchMyProjects = async () => {
    try {
      const response = await thesisProjectAPI.getMyProjects();
      const projects = response.data.projects || [];
      
      // Calculate task-based progress for each project
      const projectsWithProgress = await Promise.all(
        projects.map(async (project) => {
          try {
            const tasksResponse = await thesisProjectAPI.getTasks(project._id);
            const tasks = tasksResponse.data.tasks || [];
            const taskBasedProgress = calculateTaskBasedProgress(tasks);
            
            return {
              ...project,
              taskBasedProgress,
              originalProgress: project.overallProgress,
              overallProgress: taskBasedProgress
            };
          } catch (error) {
            console.error(`Failed to fetch tasks for project ${project._id}:`, error);
            return {
              ...project,
              taskBasedProgress: 0,
              originalProgress: project.overallProgress,
              overallProgress: project.overallProgress || 0
            };
          }
        })
      );
      
      setMyProjects(projectsWithProgress);
    } catch (error) {
      console.error('Fetch my projects error:', error);
    }
  };

  const fetchAllProjects = async () => {
    try {
      console.log('=== FRONTEND: Fetching all projects ===');
      console.log('User:', user);
      console.log('Search term:', searchTerm);
      console.log('Filter status:', filterStatus);
      console.log('Filter category:', filterCategory);
      
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterCategory !== 'all') params.category = filterCategory;
      
      console.log('API params:', params);
      
      const response = await thesisProjectAPI.getProjects(params);
      console.log('API response:', response.data);
      
      const projects = response.data.projects || [];
      
      // Calculate task-based progress for each project
      const projectsWithProgress = await Promise.all(
        projects.map(async (project) => {
          try {
            const tasksResponse = await thesisProjectAPI.getTasks(project._id);
            const tasks = tasksResponse.data.tasks || [];
            const taskBasedProgress = calculateTaskBasedProgress(tasks);
            
            return {
              ...project,
              taskBasedProgress,
              originalProgress: project.overallProgress,
              overallProgress: taskBasedProgress
            };
          } catch (error) {
            console.error(`Failed to fetch tasks for project ${project._id}:`, error);
            return {
              ...project,
              taskBasedProgress: 0,
              originalProgress: project.overallProgress,
              overallProgress: project.overallProgress || 0
            };
          }
        })
      );
      
      setProjects(projectsWithProgress);
      console.log('Projects set to state with task progress:', projectsWithProgress.length);
    } catch (error) {
      console.error('Fetch projects error:', error);
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getAllUsers();
      const allUsers = response.data.users || [];
      setSupervisors(allUsers.filter(u => u.role === 'supervisor'));
      setStudents(allUsers.filter(u => u.role === 'student'));
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  };

  const fetchUserTeams = async () => {
    try {
      if (user?.role === 'student') {
        const response = await groupAPI.getGroups();
        // Filter teams where user is admin (leader) and has at least 2 members
        const leaderTeams = response.data.filter(team => {
          const userMembership = team.members.find(member => 
            member.user._id === user.id
          );
          return userMembership && userMembership.role === 'admin' && team.members.length >= 2;
        });
        setUserTeams(leaderTeams);
      }
    } catch (error) {
      console.error('Fetch user teams error:', error);
    }
  };

  const fetchUserApplications = async () => {
    try {
      if (user?.role === 'student') {
        console.log('=== FRONTEND: Fetching user applications ===');
        const response = await thesisApplicationAPI.getMyApplications();
        console.log('User applications response:', response.data);
        setUserApplications(response.data.applications || []);
        console.log('User applications set to state:', response.data.applications?.length || 0);
      }
    } catch (error) {
      console.error('Fetch user applications error:', error);
      setUserApplications([]); // Set to empty array on error
    }
  };

  const fetchProjectApplications = async (projectId) => {
    try {
      console.log('=== FRONTEND: Fetching project applications ===');
      console.log('Project ID:', projectId);
      console.log('User:', user);
      
      if (user?.role === 'supervisor' || user?.role === 'admin') {
        const response = await thesisApplicationAPI.getProjectApplications(projectId);
        console.log('API response:', response.data);
        setProjectApplications(response.data.applications || []);
        console.log('Applications set to state:', response.data.applications?.length || 0);
      }
    } catch (error) {
      console.error('Fetch project applications error:', error);
    }
  };

  const handleApplyForProject = async (e) => {
    e.preventDefault();
    try {
      if (!applicationForm.teamId) {
        toast.error('Please select a team');
        return;
      }

      await thesisApplicationAPI.applyForProject({
        projectId: selectedProjectForApplication._id,
        teamId: applicationForm.teamId,
        message: applicationForm.message
      });

      toast.success('Application submitted successfully');
      setShowApplyModal(false);
      setApplicationForm({ teamId: '', message: '' });
      setSelectedProjectForApplication(null);
      fetchUserApplications();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit application');
      console.error('Apply for project error:', error);
    }
  };

  const handleApplicationResponse = async (applicationId, status, reviewMessage = '') => {
    try {
      await thesisApplicationAPI.updateApplication(applicationId, { status, reviewMessage });
      toast.success(`Application ${status} successfully`);
      
      // Refresh applications in the dedicated applications modal
      if (selectedProjectForApplications) {
        fetchProjectApplications(selectedProjectForApplications._id);
      }
      
      fetchAllProjects(); // Refresh projects to show updated status
    } catch (error) {
      toast.error('Failed to update application');
      console.error('Update application error:', error);
    }
  };

  const canApplyForProject = (project) => {
    if (user?.role !== 'student') return false;
    if (!project?.isPublic) return false;
    if (project?.students?.length > 0) return false; // Already has students
    
    // Check if user already applied - add defensive checks
    try {
      const hasApplied = Array.isArray(userApplications) && userApplications.some(app => 
        app && app.project && app.project._id === project._id && app.status === 'pending'
      );
      
      return !hasApplied && Array.isArray(userTeams) && userTeams.length > 0;
    } catch (error) {
      console.error('Error in canApplyForProject:', error);
      return false;
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const projectData = {
        ...createForm,
        tags: createForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        isPublic: true  // Make projects public so students can apply
      };
      
      await thesisProjectAPI.createProject(projectData);
      toast.success('Project created successfully');
      setShowCreateModal(false);
      resetCreateForm();
      fetchMyProjects();
      fetchAllProjects();
    } catch (error) {
      toast.error('Failed to create project');
      console.error('Create project error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId, projectTitle) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${projectTitle}"?\n\nThis action cannot be undone and will permanently remove the project and all associated data.`
    );
    
    if (!confirmDelete) {
      return;
    }

    try {
      await thesisProjectAPI.deleteProject(projectId);
      toast.success('Project deleted successfully');
      
      // Refresh the projects list
      fetchMyProjects();
      fetchAllProjects();
      
      // If the deleted project was being viewed in the details modal, close it
      if (selectedProject && selectedProject._id === projectId) {
        setShowDetailsModal(false);
        setSelectedProject(null);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete project';
      toast.error(errorMessage);
      console.error('Delete project error:', error);
    }
  };

  const fetchProjectDetails = async (projectId) => {
    try {
      const response = await thesisProjectAPI.getProject(projectId);
      const project = response.data.project;
      
      // Calculate task-based progress for the selected project
      try {
        const tasksResponse = await thesisProjectAPI.getTasks(projectId);
        const tasks = tasksResponse.data.tasks || [];
        const taskBasedProgress = calculateTaskBasedProgress(tasks);
        
        const projectWithProgress = {
          ...project,
          taskBasedProgress,
          originalProgress: project.overallProgress,
          overallProgress: taskBasedProgress
        };
        
        setSelectedProject(projectWithProgress);
      } catch (taskError) {
        console.error(`Failed to fetch tasks for project ${projectId}:`, taskError);
        // Fallback to original progress if task fetching fails
        setSelectedProject({
          ...project,
          taskBasedProgress: 0,
          originalProgress: project.overallProgress,
          overallProgress: project.overallProgress || 0
        });
      }
    } catch (error) {
      toast.error('Failed to fetch project details');
      console.error('Fetch project details error:', error);
    }
  };

  // Kanban Management Functions
  const handleOpenKanban = async (project) => {
    setSelectedProject(project);
    try {
      // Fetch project tasks
      const tasksResponse = await thesisProjectAPI.getTasks(project._id);
      setProjectTasks(tasksResponse.data.tasks || []);
      
      // Prepare project members (supervisor + students + co-supervisors)
      const members = [
        project.supervisor,
        ...project.students,
        ...(project.coSupervisors || [])
      ].filter(Boolean);
      setProjectMembers(members);
      
      setShowKanbanModal(true);
    } catch (error) {
      toast.error('Failed to load project tasks');
      console.error('Kanban load error:', error);
    }
  };

  const handleTasksUpdate = async (updatedTasks) => {
    try {
      await thesisProjectAPI.updateTasks(selectedProject._id, updatedTasks);
      setProjectTasks(updatedTasks);
      
      // Recalculate progress and update the selected project
      const newProgress = calculateTaskBasedProgress(updatedTasks);
      const updatedProject = {
        ...selectedProject,
        taskBasedProgress: newProgress,
        overallProgress: newProgress
      };
      setSelectedProject(updatedProject);
      
      // Update the project in both lists
      setMyProjects(prev => prev.map(p => 
        p._id === selectedProject._id ? updatedProject : p
      ));
      setProjects(prev => prev.map(p => 
        p._id === selectedProject._id ? updatedProject : p
      ));
      
    } catch (error) {
      toast.error('Failed to update tasks');
      console.error('Tasks update error:', error);
    }
  };

  // Calculate progress based on Kanban tasks
  const calculateTaskBasedProgress = (tasks) => {
    if (!tasks || tasks.length === 0) return 0;
    
    const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
    const doneTasks = tasks.filter(task => task.status === 'done').length;
    const totalTasks = tasks.length;
    
    // Ideas don't count, in_progress = 50% contribution, done = 100% contribution
    const weightedProgress = (inProgressTasks * 0.5) + (doneTasks * 1);
    const percentage = Math.round((weightedProgress / totalTasks) * 100);
    
    return percentage;
  };

  // Update project status
  const handleStatusUpdate = async () => {
    try {
      await thesisProjectAPI.updateProject(selectedProject._id, { status: newStatus });
      
      const updatedProject = { ...selectedProject, status: newStatus };
      setSelectedProject(updatedProject);
      
      // Update the project in both lists
      setMyProjects(prev => prev.map(p => 
        p._id === selectedProject._id ? { ...p, status: newStatus } : p
      ));
      setProjects(prev => prev.map(p => 
        p._id === selectedProject._id ? { ...p, status: newStatus } : p
      ));
      
      setIsEditingStatus(false);
      toast.success('Project status updated successfully');
    } catch (error) {
      toast.error('Failed to update project status');
      console.error('Status update error:', error);
    }
  };

  const handleStatusEdit = () => {
    setNewStatus(selectedProject.status || 'proposal');
    setIsEditingStatus(true);
  };

  const handleStatusCancel = () => {
    setIsEditingStatus(false);
    setNewStatus('');
  };

  const resetCreateForm = () => {
    setCreateForm({
      title: '',
      description: '',
      category: 'AI',
      tags: '',
      expectedEndDate: '',
      students: [],
      supervisor: '',
      coSupervisors: []
    });
  };

  const canManageProject = (project) => {
    console.log('=== CAN MANAGE PROJECT DEBUG ===');
    console.log('Project:', project);
    console.log('User:', user);
    console.log('Project supervisor:', project.supervisor);
    console.log('User role:', user?.role);
    console.log('User ID:', user?.id);
    console.log('Supervisor ID:', project.supervisor?._id);
    console.log('Are they equal?', project.supervisor?._id === user?.id);
    
    const result = user?.role === 'admin' ||
           project.supervisor?._id === user?.id ||
           (project.coSupervisors && project.coSupervisors.some(cs => cs?._id === user?.id));
    
    console.log('Final result:', result);
    console.log('=================================');
    
    return result;
  };

  const getStatusColor = (status) => {
    const colors = {
      proposal: 'outline',           // Gray outline for proposal stage
      approved: 'secondary',         // Light blue for approved
      in_progress: 'default',        // Blue for in progress  
      review: 'outline',             // Gray outline for review
      defense_scheduled: 'default',  // Blue for defense scheduled
      completed: 'default',          // Green-ish for completed
      cancelled: 'destructive'       // Red for cancelled
    };
    return colors[status] || 'secondary';
  };

  const getProgressColor = (progress) => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground">Manage thesis projects and track progress</p>
          </div>
          {(user?.role === 'supervisor' || user?.role === 'admin') && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-border">
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'my-projects' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('my-projects')}
          >
            My Projects
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'all-projects' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('all-projects')}
          >
            All Projects
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects by title, description, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="all">All Status</option>
              {statuses.map(status => (
                <option key={status} value={status}>{status.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="space-y-4">
          {(() => {
            const currentProjects = activeTab === 'my-projects' ? myProjects : projects;
            console.log('=== FRONTEND: Rendering projects ===');
            console.log('Active tab:', activeTab);
            console.log('User role:', user?.role);
            console.log('My projects count:', myProjects.length);
            console.log('All projects count:', projects.length);
            console.log('Current projects to display:', currentProjects.length);
            console.log('Loading:', loading);
            return null;
          })()}
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            (activeTab === 'my-projects' ? myProjects : projects).map((project) => (
              <Card key={project._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {project.title}
                        <Badge variant={getStatusColor(project.status)}>
                          {project.status.replace('_', ' ')}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2">{project.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          fetchProjectDetails(project._id);
                          setShowDetailsModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {/* Apply button for students */}
                      {canApplyForProject(project) && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setSelectedProjectForApplication(project);
                            setShowApplyModal(true);
                          }}
                          className="bg-primary text-primary-foreground"
                        >
                          Apply
                        </Button>
                      )}
                      
                      {/* Management buttons for supervisors/admins */}
                      {canManageProject(project) && (
                        <>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDeleteProject(project._id, project.title)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      
                      {/* Applications button for supervisors */}
                      {(user?.role === 'supervisor' || user?.role === 'admin') && 
                       (project.supervisor._id === user.id || user.role === 'admin') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            console.log('Applications button clicked for project:', project.title);
                            console.log('Setting selected project for applications and fetching...');
                            setSelectedProjectForApplications(project);
                            setShowApplicationsModal(true);
                            fetchProjectApplications(project._id);
                          }}
                        >
                          Applications
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Project Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Supervisor</p>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-3 w-3" />
                        </div>
                        <span className="text-sm">{project.supervisor.name}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Students</p>
                      <div className="flex flex-wrap gap-1">
                        {project.students.map((student, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {student.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Category</p>
                      <Badge variant="secondary">{project.category}</Badge>
                    </div>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Overall Progress</span>
                      <span className="text-sm text-muted-foreground">{project.overallProgress}%</span>
                    </div>
                    <Progress value={project.overallProgress} className="h-2" />
                  </div>

                  {/* Tags */}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Dates */}
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Started: {new Date(project.startDate).toLocaleDateString()}</span>
                    {project.expectedEndDate && (
                      <span>Due: {new Date(project.expectedEndDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {(activeTab === 'my-projects' ? myProjects : projects).length === 0 && !loading && (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No projects found</h3>
                <p className="text-muted-foreground">
                  {activeTab === 'my-projects' 
                    ? "You don't have any projects yet." 
                    : "No projects match your search criteria."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Create New Project</h3>
                <p className="text-sm text-muted-foreground">Create a thesis project and assign students</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
              >
                ×
              </Button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <Label htmlFor="title">Project Title</Label>
                <Input
                  id="title"
                  value={createForm.title}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border border-input rounded-md bg-background min-h-[100px]"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={createForm.category}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2 border border-input rounded-md bg-background"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="expectedEndDate">Expected End Date</Label>
                  <Input
                    id="expectedEndDate"
                    type="date"
                    value={createForm.expectedEndDate}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, expectedEndDate: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={createForm.tags}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g., Machine Learning, Python, Healthcare"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Details Modal */}
      {showDetailsModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-semibold">{selectedProject.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {isEditingStatus ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="text-sm border border-input rounded-md px-2 py-1 bg-background"
                      >
                        <option value="proposal">Proposal</option>
                        <option value="approved">Approved</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="defense_scheduled">Defense Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <Button size="sm" onClick={handleStatusUpdate} className="h-6 px-2">
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleStatusCancel} className="h-6 px-2">
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(selectedProject.status || 'proposal')} className="text-sm">
                        {selectedProject.status ? 
                          selectedProject.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                          'Proposal'
                        }
                      </Badge>
                      {canManageProject(selectedProject) && (
                        <Button size="sm" variant="ghost" onClick={handleStatusEdit} className="h-6 w-6 p-0">
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project Info */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Project Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Description</p>
                      <p className="text-sm text-muted-foreground">{selectedProject.description}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Category</p>
                      <Badge variant="secondary">{selectedProject.category}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Overall Progress</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={selectedProject.overallProgress} className="flex-1 h-2" />
                        <span className="text-sm">{selectedProject.overallProgress}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Team */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Team</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">Supervisor</p>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-3 w-3" />
                        </div>
                        <span className="text-sm">{selectedProject.supervisor.name}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Students</p>
                      <div className="space-y-1">
                        {selectedProject.students.map((student, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs">{student.name.charAt(0)}</span>
                            </div>
                            <span className="text-sm">{student.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Project Progress */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Project Progress</CardTitle>
                    <Button
                      size="sm"
                      onClick={() => handleOpenKanban(selectedProject)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      View Progress
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Track project tasks and milestones using our Kanban board system. 
                      Click "View Progress" to manage tasks and monitor project status.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Modal */}
      {showKanbanModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg w-full max-w-7xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                Project Progress - {selectedProject.title}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKanbanModal(false)}
                className="hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <KanbanBoard
                tasks={projectTasks}
                onTasksUpdate={handleTasksUpdate}
                projectMembers={projectMembers}
              />
            </div>
          </div>
        </div>
      )}

      {/* Apply for Project Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Apply for Project</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedProjectForApplication?.title}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowApplyModal(false);
                  setApplicationForm({ teamId: '', message: '' });
                  setSelectedProjectForApplication(null);
                }}
              >
                ×
              </Button>
            </div>
            <form onSubmit={handleApplyForProject} className="space-y-4">
              <div>
                <Label htmlFor="teamSelect">Select Team</Label>
                <select
                  id="teamSelect"
                  value={applicationForm.teamId}
                  onChange={(e) => setApplicationForm(prev => ({ ...prev, teamId: e.target.value }))}
                  className="w-full p-2 border border-border rounded-md bg-background"
                  required
                >
                  <option value="">Choose a team...</option>
                  {userTeams.map((team) => (
                    <option key={team._id} value={team._id}>
                      {team.name} ({team.members.length} members)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="applicationMessage">Message (Optional)</Label>
                <textarea
                  id="applicationMessage"
                  value={applicationForm.message}
                  onChange={(e) => setApplicationForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Tell the supervisor why your team is a good fit for this project..."
                  className="w-full p-2 border border-border rounded-md bg-background h-24 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setShowApplyModal(false);
                    setApplicationForm({ teamId: '', message: '' });
                    setSelectedProjectForApplication(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Submit Application
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Applications Modal for Supervisors */}
      {showApplicationsModal && selectedProjectForApplications && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Project Applications</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedProjectForApplications.title}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowApplicationsModal(false);
                  setSelectedProjectForApplications(null);
                  setProjectApplications([]);
                }}
              >
                ×
              </Button>
            </div>
            
            {projectApplications.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Applications Yet</h3>
                <p className="text-muted-foreground">
                  No teams have applied for this project yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {projectApplications.map((application) => (
                  <Card key={application._id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-medium">{application.team.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Applied by {application.applicant.name} • {new Date(application.appliedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={
                          application.status === 'accepted' ? 'default' :
                          application.status === 'rejected' ? 'destructive' :
                          'secondary'
                        }>
                          {application.status}
                        </Badge>
                      </div>
                      
                      {application.message && (
                        <div className="mb-4">
                          <p className="text-sm font-medium mb-1">Message:</p>
                          <p className="text-sm text-muted-foreground">{application.message}</p>
                        </div>
                      )}
                      
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-2">Team Members:</p>
                        <div className="flex flex-wrap gap-2">
                          {application.team.members.map((member) => (
                            <Badge key={member.user._id} variant="outline" className="text-xs">
                              {member.user.name} {member.role === 'admin' && '(Leader)'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      {application.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApplicationResponse(application._id, 'accepted')}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApplicationResponse(application._id, 'rejected')}
                            className="text-destructive hover:text-destructive"
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                      
                      {application.reviewMessage && (
                        <div className="mt-4 p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium">Review:</p>
                          <p className="text-sm">{application.reviewMessage}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
