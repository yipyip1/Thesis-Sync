import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { BookOpen, Users, MessageSquare, Calendar, CheckCircle, Plus, Search, Filter, TrendingUp, Clock, UserPlus, Lightbulb, AlertCircle, FolderPlus, Folder, User, Shield, Activity, Mail, Bell, Megaphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { thesisProjectAPI, teamRequestAPI, thesisIdeaAPI, notificationAPI, activityAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user } = useAuth();
  
  // State for real data
  const [stats, setStats] = useState({
    activeProjects: 0,
    teamMembers: 0,
    unreadMessages: 0,
    upcomingDeadlines: 0,
  });
  
  const [recentActivity, setRecentActivity] = useState([]);
  const [currentProjects, setCurrentProjects] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [newTeamRequests, setNewTeamRequests] = useState([]);
  const [recentIdeas, setRecentIdeas] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all dashboard data in parallel
      const [
        projectsRes,
        teamRequestsRes,
        ideasRes,
        activityRes,
        notificationsRes
      ] = await Promise.allSettled([
        thesisProjectAPI.getMyProjects(),
        teamRequestAPI.getTeamRequests({ limit: 5 }),
        thesisIdeaAPI.getIdeas({ limit: 5, sort: 'latest' }),
        activityAPI.getDashboardActivity({ limit: 8 }),
        notificationAPI.getNotifications({ limit: 10 })
      ]);

      // Process projects data
      if (projectsRes.status === 'fulfilled') {
        const projects = projectsRes.value.data.projects || [];
        setCurrentProjects(projects);
        
        // Calculate deadlines
        const now = new Date();
        const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const deadlines = [];
        
        projects.forEach(project => {
          project.phases?.forEach(phase => {
            if (phase.deadline && new Date(phase.deadline) <= nextMonth && new Date(phase.deadline) >= now) {
              deadlines.push({
                id: `${project._id}-${phase._id}`,
                title: phase.name,
                project: project.title,
                due: phase.deadline,
                priority: new Date(phase.deadline) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) ? 'high' : 'medium'
              });
            }
          });
          
          if (project.expectedEndDate && new Date(project.expectedEndDate) <= nextMonth && new Date(project.expectedEndDate) >= now) {
            deadlines.push({
              id: project._id,
              title: 'Project Completion',
              project: project.title,
              due: project.expectedEndDate,
              priority: 'high'
            });
          }
        });
        
        setUpcomingDeadlines(deadlines);
        
        // Update stats
        setStats(prev => ({
          ...prev,
          activeProjects: projects.length,
          upcomingDeadlines: deadlines.length
        }));
      }

      // Process team requests
      if (teamRequestsRes.status === 'fulfilled') {
        const teamRequests = teamRequestsRes.value.data.teamRequests || [];
        setNewTeamRequests(teamRequests.filter(req => req.status === 'open').slice(0, 3));
      }

      // Process ideas
      if (ideasRes.status === 'fulfilled') {
        const ideas = ideasRes.value.data.ideas || [];
        setRecentIdeas(ideas.slice(0, 3));
      }

      // Process comprehensive activity feed
      if (activityRes.status === 'fulfilled') {
        const activities = activityRes.value.data.activities || [];
        
        // Transform activities with proper formatting
        const formattedActivities = activities.map(activity => ({
          id: activity.id,
          action: activity.action,
          time: getTimeAgo(activity.timestamp),
          type: activity.type,
          icon: activity.icon,
          color: activity.color,
          read: activity.read !== false, // Default to read for user activities
          details: activity.details
        }));
        
        setRecentActivity(formattedActivities);
        
        // Count unread notifications (only notification type activities)
        const unreadNotifications = activities.filter(a => 
          a.type === 'notification' && !a.read
        ).length;
        
        setStats(prev => ({
          ...prev,
          unreadMessages: unreadNotifications
        }));
      }

      // Process notifications
      if (notificationsRes.status === 'fulfilled') {
        const allNotifications = notificationsRes.value.data.notifications || [];
        setNotifications(allNotifications);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const getActivityIcon = (iconName) => {
    const iconMap = {
      'folder-plus': FolderPlus,
      'folder': Folder,
      'users': Users,
      'user-plus': UserPlus,
      'lightbulb': Lightbulb,
      'message-square': MessageSquare,
      'shield': Shield,
      'activity': Activity,
      'mail': Mail,
      'bell': Bell,
      'megaphone': Megaphone,
      'check-circle': CheckCircle,
      'alert-circle': AlertCircle,
      'trending-up': TrendingUp,
      'clock': Clock
    };
    
    return iconMap[iconName] || Activity;
  };

  const getActivityColor = (colorName) => {
    const colorMap = {
      'blue': 'text-blue-500',
      'green': 'text-green-500',
      'yellow': 'text-yellow-500',
      'purple': 'text-purple-500',
      'red': 'text-red-500',
      'orange': 'text-orange-500',
      'indigo': 'text-indigo-500',
      'pink': 'text-pink-500',
      'gray': 'text-gray-500'
    };
    
    return colorMap[colorName] || 'text-gray-500';
  };

  const formatActivityDetails = (details) => {
    if (!details) return null;
    
    // If details is already a string, return it
    if (typeof details === 'string') return details;
    
    // If details is an object, format it appropriately
    if (typeof details === 'object') {
      if (details.message && details.sender) {
        return `Message from ${details.sender}: "${details.message}"`;
      }
      if (details.teamRequestId && details.title) {
        return `Team request: ${details.title}`;
      }
      if (details.projectTitle) {
        return `Project: ${details.projectTitle}`;
      }
      if (details.groupName) {
        return `Group: ${details.groupName}`;
      }
      if (details.ideaTitle) {
        return `Idea: ${details.ideaTitle}`;
      }
      
      // Generic fallback for other object structures
      const entries = Object.entries(details);
      if (entries.length > 0) {
        return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
      }
    }
    
    return null;
  };

  const getProjectStatus = (project) => {
    if (!project.expectedEndDate) return 'on-track';
    
    const now = new Date();
    const deadline = new Date(project.expectedEndDate);
    const progress = project.overallProgress || 0;
    const timeLeft = deadline - now;
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
    
    // If project is 90%+ complete, it's on track
    if (progress >= 90) return 'on-track';
    
    // If less than 30 days left and less than 70% complete, behind
    if (daysLeft < 30 && progress < 70) return 'behind';
    
    // If past deadline, critical
    if (daysLeft < 0) return 'critical';
    
    return 'on-track';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'behind': return 'destructive';
      case 'critical': return 'destructive';
      case 'on-track': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'behind': return 'Behind Schedule';
      case 'critical': return 'Critical';
      case 'on-track': return 'On Track';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto p-6 flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto p-6 space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.name || 'User'}!</h1>
          <p className="text-muted-foreground">Here's what's happening with your thesis projects.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProjects}</div>
              <p className="text-xs text-muted-foreground">+1 from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.teamMembers}</div>
              <p className="text-xs text-muted-foreground">Across all projects</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unreadMessages}</div>
              <p className="text-xs text-muted-foreground">Unread messages</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deadlines</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingDeadlines}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>



        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Projects */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current Projects</CardTitle>
                {(user?.role === 'supervisor' || user?.role === 'admin') && (
                  <Link to="/projects">
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New Project
                    </Button>
                  </Link>
                )}
              </div>
              <CardDescription>Track your ongoing thesis projects and their progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentProjects.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No active projects</h3>
                  {(user?.role === 'supervisor' || user?.role === 'admin') ? (
                    <>
                      <p className="text-muted-foreground mb-4">Create a new thesis project and assign students</p>
                      <Link to="/projects">
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Project
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground mb-4">Join a team or wait to be assigned to a project</p>
                      <Link to="/teams">
                        <Button>
                          <Users className="h-4 w-4 mr-2" />
                          Join Team
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              ) : (
                currentProjects.map((project) => {
                  const status = getProjectStatus(project);
                  return (
                    <div key={project._id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-foreground">{project.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Supervisor: {project.supervisor?.name || 'Not assigned'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Category: {project.category}
                          </p>
                        </div>
                        <Badge variant={getStatusColor(status)}>
                          {getStatusText(status)}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-foreground">{project.overallProgress || 0}%</span>
                        </div>
                        <Progress value={project.overallProgress || 0} className="h-2" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Due: {project.expectedEndDate ? new Date(project.expectedEndDate).toLocaleDateString() : 'No deadline set'}
                        </span>
                        <Link to="/projects">
                          <Button variant="ghost" size="sm">View Details</Button>
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Stay updated with the latest developments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No recent activity</h3>
                  <p className="text-muted-foreground">Your activity will appear here as you work on projects</p>
                </div>
              ) : (
                recentActivity.map((activity) => {
                  const IconComponent = getActivityIcon(activity.icon);
                  const iconColor = getActivityColor(activity.color);
                  const formattedDetails = formatActivityDetails(activity.details);
                  
                  return (
                    <div key={activity.id} className={`flex items-start gap-3 pb-3 border-b border-border last:border-0 ${!activity.read ? 'bg-blue-50 -mx-3 px-3 py-2 rounded' : ''}`}>
                      <div className={`mt-1 flex-shrink-0`}>
                        <IconComponent className={`h-5 w-5 ${iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                        {formattedDetails && (
                          <p className="text-xs text-muted-foreground mt-1">{formattedDetails}</p>
                        )}
                      </div>
                      {!activity.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
              {recentActivity.length > 0 && (
                <Link to="/activity">
                  <Button variant="ghost" className="w-full">
                    View All Activity
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Don't miss important project milestones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingDeadlines.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No upcoming deadlines</h3>
                  <p className="text-muted-foreground">You're all caught up! New deadlines will appear here</p>
                </div>
              ) : (
                upcomingDeadlines.map((deadline) => (
                  <div key={deadline.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">{deadline.title}</p>
                        <p className="text-sm text-muted-foreground">{deadline.project}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={deadline.priority === 'high' ? 'destructive' : deadline.priority === 'medium' ? 'default' : 'secondary'}>
                        {deadline.priority} priority
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(deadline.due).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* New sections for team requests and ideas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Team Requests */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Looking for Team Members</CardTitle>
                <Link to="/teams">
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </Link>
              </div>
              <CardDescription>Students seeking collaborators for their projects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {newTeamRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No team requests</h3>
                  <p className="text-muted-foreground">New team formation requests will appear here</p>
                </div>
              ) : (
                newTeamRequests.map((request) => (
                  <div key={request._id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{request.title || 'Untitled Request'}</h4>
                        <p className="text-sm text-muted-foreground">{request.thesisTopic || 'No topic specified'}</p>
                        <p className="text-xs text-muted-foreground">
                          By: {request.creator?.name || 'Unknown'} ({request.creator?.department || 'Unknown Department'})
                        </p>
                      </div>
                      <Badge variant="secondary">{request.category || 'General'}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(request.requiredSkills || []).slice(0, 3).map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {typeof skill === 'string' ? skill : 'Skill'}
                        </Badge>
                      ))}
                      {(request.requiredSkills || []).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{(request.requiredSkills || []).length - 3}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Team size: {request.teamSize?.current || 0}/{request.teamSize?.max || 0}
                      </span>
                      <Link to="/teams">
                        <Button variant="ghost" size="sm">View Details</Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Ideas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Latest Thesis Ideas</CardTitle>
                <Link to="/ideas">
                  <Button variant="outline" size="sm">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </Link>
              </div>
              <CardDescription>Fresh research ideas from the community</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentIdeas.length === 0 ? (
                <div className="text-center py-8">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No recent ideas</h3>
                  <p className="text-muted-foreground">New thesis ideas will appear here</p>
                </div>
              ) : (
                recentIdeas.map((idea) => (
                  <div key={idea._id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{idea.title || 'Untitled Idea'}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{idea.description || 'No description available'}</p>
                        <p className="text-xs text-muted-foreground">
                          By: {idea.author?.name || 'Unknown'} ({idea.author?.role || 'Unknown Role'})
                        </p>
                      </div>
                      <Badge variant="secondary">{idea.category || 'General'}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(idea.tags || []).slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {typeof tag === 'string' ? tag : 'Tag'}
                        </Badge>
                      ))}
                      {(idea.tags || []).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{(idea.tags || []).length - 3}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          {idea.likes?.length || 0}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          {idea.comments?.length || 0}
                        </span>
                      </div>
                      <Link to="/ideas">
                        <Button variant="ghost" size="sm">View Details</Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium text-foreground mb-2">Find Supervisors</h3>
              <p className="text-sm text-muted-foreground">Search and connect with potential thesis supervisors</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium text-foreground mb-2">Join Teams</h3>
              <p className="text-sm text-muted-foreground">Collaborate with other students on research projects</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium text-foreground mb-2">Idea Pool</h3>
              <p className="text-sm text-muted-foreground">Browse and share thesis ideas with the community</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
