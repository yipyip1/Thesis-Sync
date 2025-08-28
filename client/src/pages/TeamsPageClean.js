import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Users, 
  Plus, 
  Search, 
  UserPlus, 
  MessageCircle, 
  Calendar, 
  Star,
  Crown,
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Eye,
  Send
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { teamRequestAPI, userAPI } from '../utils/api';
import Navigation from '../components/Navigation';
import toast from 'react-hot-toast';

export default function TeamsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('browse');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [skillsFilter, setSkillsFilter] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [teamRequests, setTeamRequests] = useState([]);
  const [myTeamRequests, setMyTeamRequests] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  
  // Form states
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    thesisTopic: '',
    requiredSkills: '',
    maxTeamSize: 4,
    category: 'AI',
    deadline: ''
  });
  const [applicationMessage, setApplicationMessage] = useState('');
  const [supervisorMessage, setSupervisorMessage] = useState('');

  const categories = ['AI', 'ML', 'Blockchain', 'Cybersecurity', 'IoT', 'Web Development', 'Mobile Development', 'Data Science', 'Other'];

  useEffect(() => {
    fetchTeamRequests();
    fetchMyTeamRequests();
    if (user?.role === 'student') {
      fetchSupervisors();
    }
  }, [categoryFilter, skillsFilter, searchTerm]);

  const fetchTeamRequests = async () => {
    try {
      setLoading(true);
      const params = {};
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (skillsFilter) params.skills = skillsFilter;
      if (searchTerm) params.search = searchTerm;
      
      const response = await teamRequestAPI.getTeamRequests(params);
      setTeamRequests(response.data.teamRequests || []);
    } catch (error) {
      toast.error('Failed to fetch team requests');
      console.error('Fetch team requests error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTeamRequests = async () => {
    try {
      const response = await teamRequestAPI.getMyTeamRequests();
      setMyTeamRequests(response.data.teamRequests || []);
    } catch (error) {
      console.error('Fetch my team requests error:', error);
    }
  };

  const fetchSupervisors = async () => {
    try {
      const response = await userAPI.searchSupervisors({ limit: 20 });
      setSupervisors(response.data.supervisors || []);
    } catch (error) {
      console.error('Fetch supervisors error:', error);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await teamRequestAPI.createTeamRequest({
        ...createForm,
        requiredSkills: createForm.requiredSkills.split(',').map(s => s.trim()).filter(Boolean)
      });
      toast.success('Team request created successfully');
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        thesisTopic: '',
        requiredSkills: '',
        maxTeamSize: 4,
        category: 'AI',
        deadline: ''
      });
      fetchTeamRequests();
      fetchMyTeamRequests();
    } catch (error) {
      toast.error('Failed to create team request');
      console.error('Create team error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToTeam = async (teamId) => {
    try {
      await teamRequestAPI.applyToTeam(teamId, applicationMessage);
      toast.success('Application sent successfully');
      setShowJoinModal(false);
      setApplicationMessage('');
      setSelectedTeam(null);
      fetchTeamRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to apply to team');
      console.error('Apply to team error:', error);
    }
  };

  const handleManageApplication = async (teamId, applicationId, status) => {
    try {
      await teamRequestAPI.manageApplication(teamId, applicationId, status);
      toast.success(`Application ${status} successfully`);
      fetchMyTeamRequests();
    } catch (error) {
      toast.error(`Failed to ${status} application`);
      console.error('Manage application error:', error);
    }
  };

  const handleRequestSupervisor = async (teamId, supervisorId) => {
    try {
      await teamRequestAPI.requestSupervisor(teamId, supervisorId, supervisorMessage);
      toast.success('Supervisor request sent successfully');
      setShowSupervisorModal(false);
      setSupervisorMessage('');
      setSelectedSupervisor(null);
      fetchMyTeamRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request supervisor');
      console.error('Request supervisor error:', error);
    }
  };

  const handleSupervisorResponse = async (teamId, status, responseMessage = '') => {
    try {
      await teamRequestAPI.respondToSupervision(teamId, status, responseMessage);
      toast.success(`Supervision request ${status} successfully`);
      fetchMyTeamRequests();
    } catch (error) {
      toast.error(`Failed to ${status} supervision request`);
      console.error('Supervisor response error:', error);
    }
  };

  const canManageTeam = (team) => {
    return team.creator._id === user._id || 
           team.members.some(m => m.user._id === user._id && m.role === 'leader');
  };

  const isTeamMember = (team) => {
    return team.members.some(m => m.user._id === user._id);
  };

  const hasApplied = (team) => {
    return team.applications.some(app => app.user._id === user._id);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Teams</h1>
            <p className="text-muted-foreground">Join or create thesis teams and collaborate with peers</p>
          </div>
          {user?.role === 'student' && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Team Request
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-border">
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'browse' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('browse')}
          >
            Browse Teams
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'my-teams' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('my-teams')}
          >
            My Teams
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams by title, topic, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Input
              placeholder="Filter by skills..."
              value={skillsFilter}
              onChange={(e) => setSkillsFilter(e.target.value)}
              className="w-48"
            />
          </div>
        </div>

        {/* Content */}
        {activeTab === 'browse' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : teamRequests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No teams found</h3>
                  <p className="text-muted-foreground">Try adjusting your search filters or create a new team request.</p>
                </CardContent>
              </Card>
            ) : (
              teamRequests.map((team) => (
                <Card key={team._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {team.title}
                          <Badge variant={team.status === 'open' ? 'default' : 'secondary'}>
                            {team.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription>{team.thesisTopic}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {team.teamSize.current}/{team.teamSize.max}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{team.description}</p>
                    
                    {/* Team Leader */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Crown className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{team.creator.name}</p>
                        <p className="text-xs text-muted-foreground">{team.creator.department}</p>
                      </div>
                    </div>

                    {/* Required Skills */}
                    <div>
                      <p className="text-sm font-medium mb-2">Required Skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {team.requiredSkills.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Category and Deadline */}
                    <div className="flex justify-between items-center">
                      <Badge variant="secondary">{team.category}</Badge>
                      {team.deadline && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Due: {new Date(team.deadline).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {user?.role === 'student' && !isTeamMember(team) && team.status === 'open' && (
                      <div className="flex gap-2">
                        {hasApplied(team) ? (
                          <Badge variant="outline">Application Sent</Badge>
                        ) : (
                          <Button
                            onClick={() => {
                              setSelectedTeam(team);
                              setShowJoinModal(true);
                            }}
                            disabled={team.teamSize.current >= team.teamSize.max}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Apply to Join
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Applications (for team creator) */}
                    {canManageTeam(team) && team.applications.length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">Applications ({team.applications.length})</h4>
                        <div className="space-y-2">
                          {team.applications.filter(app => app.status === 'pending').map((application) => (
                            <div key={application._id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{application.user.name}</p>
                                <p className="text-sm text-muted-foreground">{application.message}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleManageApplication(team._id, application._id, 'accepted')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleManageApplication(team._id, application._id, 'rejected')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'my-teams' && (
          <div className="space-y-4">
            {myTeamRequests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No teams yet</h3>
                  <p className="text-muted-foreground">
                    {user?.role === 'student' 
                      ? "Create a team request or apply to join existing teams." 
                      : "No supervision requests yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              myTeamRequests.map((team) => (
                <Card key={team._id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {team.title}
                          <Badge variant={team.status === 'open' ? 'default' : 'secondary'}>
                            {team.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription>{team.thesisTopic}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {team.teamSize.current}/{team.teamSize.max}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Team Members */}
                    <div>
                      <h4 className="font-medium mb-2">Team Members:</h4>
                      <div className="flex flex-wrap gap-2">
                        {team.members.map((member, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                              {member.role === 'leader' && <Crown className="h-3 w-3 text-primary" />}
                            </div>
                            <span className="text-sm">{member.user.name}</span>
                            <Badge variant="outline" className="text-xs">{member.role}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Supervisor Status */}
                    <div>
                      <h4 className="font-medium mb-2">Supervisor:</h4>
                      {team.supervisor ? (
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{team.supervisor.name}</p>
                            <p className="text-sm text-muted-foreground">{team.supervisor.department}</p>
                          </div>
                          <Badge variant={
                            team.supervisorRequest.status === 'accepted' ? 'default' :
                            team.supervisorRequest.status === 'pending' ? 'secondary' : 'destructive'
                          }>
                            {team.supervisorRequest.status}
                          </Badge>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 border rounded-lg border-dashed">
                          <span className="text-muted-foreground">No supervisor assigned</span>
                          {canManageTeam(team) && user?.role === 'student' && (
                            <Button
                              size="sm"
                              onClick={() => setShowSupervisorModal(true)}
                            >
                              Request Supervisor
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Supervisor Actions */}
                    {user?.role === 'supervisor' && team.supervisor?._id === user._id && team.supervisorRequest.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSupervisorResponse(team._id, 'accepted')}
                        >
                          Accept Supervision
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleSupervisorResponse(team._id, 'rejected')}
                        >
                          Decline
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create Team Request</h3>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <Label htmlFor="title">Team Title</Label>
                <Input
                  id="title"
                  value={createForm.title}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="thesisTopic">Thesis Topic</Label>
                <Input
                  id="thesisTopic"
                  value={createForm.thesisTopic}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, thesisTopic: e.target.value }))}
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
                  <Label htmlFor="maxTeamSize">Max Team Size</Label>
                  <Input
                    id="maxTeamSize"
                    type="number"
                    min="2"
                    max="10"
                    value={createForm.maxTeamSize}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, maxTeamSize: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="requiredSkills">Required Skills (comma-separated)</Label>
                <Input
                  id="requiredSkills"
                  value={createForm.requiredSkills}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, requiredSkills: e.target.value }))}
                  placeholder="e.g., JavaScript, Python, React, Machine Learning"
                />
              </div>
              <div>
                <Label htmlFor="deadline">Deadline (optional)</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={createForm.deadline}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Team Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Team Modal */}
      {showJoinModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Apply to Join Team</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Applying to join "{selectedTeam.title}"
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="applicationMessage">Message to Team Leader</Label>
                <textarea
                  id="applicationMessage"
                  value={applicationMessage}
                  onChange={(e) => setApplicationMessage(e.target.value)}
                  placeholder="Tell them why you'd be a great addition to their team..."
                  className="w-full p-2 border border-input rounded-md bg-background min-h-[100px]"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowJoinModal(false);
                    setApplicationMessage('');
                    setSelectedTeam(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleApplyToTeam(selectedTeam._id)}
                  disabled={!applicationMessage.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Application
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Supervisor Modal */}
      {showSupervisorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Request Supervisor</h3>
            <div className="space-y-4">
              <div>
                <Label>Select Supervisor</Label>
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  {supervisors.map((supervisor) => (
                    <div
                      key={supervisor._id}
                      className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${
                        selectedSupervisor?._id === supervisor._id ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => setSelectedSupervisor(supervisor)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{supervisor.name}</p>
                          <p className="text-sm text-muted-foreground">{supervisor.department}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{supervisor.availability}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {supervisor.currentStudents}/{supervisor.maxStudents} students
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{supervisor.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {selectedSupervisor && (
                <div>
                  <Label htmlFor="supervisorMessage">Message to Supervisor</Label>
                  <textarea
                    id="supervisorMessage"
                    value={supervisorMessage}
                    onChange={(e) => setSupervisorMessage(e.target.value)}
                    placeholder="Describe your project and why you'd like them to supervise..."
                    className="w-full p-2 border border-input rounded-md bg-background min-h-[100px]"
                    required
                  />
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowSupervisorModal(false);
                    setSelectedSupervisor(null);
                    setSupervisorMessage('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleRequestSupervisor(myTeamRequests[0]?._id, selectedSupervisor._id)}
                  disabled={!selectedSupervisor || !supervisorMessage.trim()}
                >
                  Send Request
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
