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
  FileText,
  Upload,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { thesisProjectAPI, userAPI } from '../utils/api';
import Navigation from '../components/Navigation';
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
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState(null);
  
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
  
  const [phaseForm, setPhaseForm] = useState({
    status: '',
    progress: 0,
    startDate: '',
    endDate: '',
    deadline: ''
  });
  
  const [documentForm, setDocumentForm] = useState({
    name: '',
    type: 'other'
  });
  
  const [documentFile, setDocumentFile] = useState(null);
  const [supervisors, setSupervisors] = useState([]);
  const [students, setStudents] = useState([]);

  const categories = ['AI', 'ML', 'Blockchain', 'Cybersecurity', 'IoT', 'Web Development', 'Mobile Development', 'Data Science', 'Other'];
  const statuses = ['proposal', 'approved', 'in_progress', 'review', 'defense_scheduled', 'completed', 'cancelled'];
  const documentTypes = ['proposal', 'chapter', 'presentation', 'code', 'data', 'reference', 'other'];

  useEffect(() => {
    fetchMyProjects();
    fetchAllProjects();
    if (user?.role === 'supervisor' || user?.role === 'admin') {
      fetchUsers();
    }
  }, [searchTerm, filterStatus, filterCategory]);

  const fetchMyProjects = async () => {
    try {
      const response = await thesisProjectAPI.getMyProjects();
      setMyProjects(response.data.projects || []);
    } catch (error) {
      console.error('Fetch my projects error:', error);
    }
  };

  const fetchAllProjects = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterCategory !== 'all') params.category = filterCategory;
      
      const response = await thesisProjectAPI.getProjects(params);
      setProjects(response.data.projects || []);
    } catch (error) {
      toast.error('Failed to fetch projects');
      console.error('Fetch projects error:', error);
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

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const projectData = {
        ...createForm,
        tags: createForm.tags.split(',').map(t => t.trim()).filter(Boolean)
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

  const handleUpdatePhase = async () => {
    try {
      await thesisProjectAPI.updatePhase(selectedProject._id, selectedPhase._id, phaseForm);
      toast.success('Phase updated successfully');
      setShowPhaseModal(false);
      fetchProjectDetails(selectedProject._id);
    } catch (error) {
      toast.error('Failed to update phase');
      console.error('Update phase error:', error);
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!documentFile) {
      toast.error('Please select a file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('document', documentFile);
      formData.append('name', documentForm.name);
      formData.append('type', documentForm.type);
      
      await thesisProjectAPI.uploadDocument(selectedProject._id, formData);
      toast.success('Document uploaded successfully');
      setShowDocumentModal(false);
      setDocumentForm({ name: '', type: 'other' });
      setDocumentFile(null);
      fetchProjectDetails(selectedProject._id);
    } catch (error) {
      toast.error('Failed to upload document');
      console.error('Upload document error:', error);
    }
  };

  const fetchProjectDetails = async (projectId) => {
    try {
      const response = await thesisProjectAPI.getProject(projectId);
      setSelectedProject(response.data.project);
    } catch (error) {
      toast.error('Failed to fetch project details');
      console.error('Fetch project details error:', error);
    }
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
    return user?.role === 'admin' ||
           project.supervisor._id === user._id ||
           (project.coSupervisors && project.coSupervisors.some(cs => cs._id === user._id));
  };

  const getStatusColor = (status) => {
    const colors = {
      proposal: 'secondary',
      approved: 'default',
      in_progress: 'default',
      review: 'secondary',
      defense_scheduled: 'default',
      completed: 'default',
      cancelled: 'destructive'
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
                      {canManageProject(project) && (
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
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
                <Badge variant={getStatusColor(selectedProject.status)} className="mt-2">
                  {selectedProject.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex gap-2">
                {canManageProject(selectedProject) && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => setShowDocumentModal(true)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Document
                    </Button>
                  </>
                )}
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

              {/* Phases */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Project Phases</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedProject.phases.map((phase, index) => (
                        <div key={phase._id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-sm">{phase.name}</p>
                              <p className="text-xs text-muted-foreground">{phase.description}</p>
                            </div>
                            {canManageProject(selectedProject) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedPhase(phase);
                                  setPhaseForm({
                                    status: phase.status,
                                    progress: phase.progress,
                                    startDate: phase.startDate ? new Date(phase.startDate).toISOString().split('T')[0] : '',
                                    endDate: phase.endDate ? new Date(phase.endDate).toISOString().split('T')[0] : '',
                                    deadline: phase.deadline ? new Date(phase.deadline).toISOString().split('T')[0] : ''
                                  });
                                  setShowPhaseModal(true);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={phase.status === 'completed' ? 'default' : phase.status === 'in_progress' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {phase.status.replace('_', ' ')}
                            </Badge>
                            <div className="flex-1">
                              <Progress value={phase.progress} className="h-1" />
                            </div>
                            <span className="text-xs text-muted-foreground">{phase.progress}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Documents */}
                {selectedProject.documents && selectedProject.documents.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Documents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedProject.documents.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{doc.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.type} • {new Date(doc.uploadDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase Update Modal */}
      {showPhaseModal && selectedPhase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Update Phase: {selectedPhase.name}</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="phaseStatus">Status</Label>
                <select
                  id="phaseStatus"
                  value={phaseForm.status}
                  onChange={(e) => setPhaseForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full p-2 border border-input rounded-md bg-background"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div>
                <Label htmlFor="phaseProgress">Progress (%)</Label>
                <Input
                  id="phaseProgress"
                  type="number"
                  min="0"
                  max="100"
                  value={phaseForm.progress}
                  onChange={(e) => setPhaseForm(prev => ({ ...prev, progress: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={phaseForm.startDate}
                    onChange={(e) => setPhaseForm(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={phaseForm.deadline}
                    onChange={(e) => setPhaseForm(prev => ({ ...prev, deadline: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPhaseModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleUpdatePhase}
                >
                  Update Phase
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocumentModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Upload Document</h3>
            <form onSubmit={handleUploadDocument} className="space-y-4">
              <div>
                <Label htmlFor="documentName">Document Name</Label>
                <Input
                  id="documentName"
                  value={documentForm.name}
                  onChange={(e) => setDocumentForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="documentType">Document Type</Label>
                <select
                  id="documentType"
                  value={documentForm.type}
                  onChange={(e) => setDocumentForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full p-2 border border-input rounded-md bg-background"
                >
                  {documentTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="documentFile">Choose File</Label>
                <input
                  id="documentFile"
                  type="file"
                  onChange={(e) => setDocumentFile(e.target.files[0])}
                  className="w-full p-2 border border-input rounded-md bg-background"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDocumentModal(false);
                    setDocumentForm({ name: '', type: 'other' });
                    setDocumentFile(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Upload
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
