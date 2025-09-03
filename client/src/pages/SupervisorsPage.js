import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Search, Mail, Star, Users, Filter, User, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { userAPI, messageAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function SupervisorsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [supervisors, setSupervisors] = useState([]);
  const [filteredSupervisors, setFilteredSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    console.log('SupervisorsPage mounted, fetching supervisors...');
    fetchSupervisors();
  }, []);

  useEffect(() => {
    filterSupervisors();
  }, [searchTerm, departmentFilter, supervisors]);

  const fetchSupervisors = async () => {
    try {
      setLoading(true);
      console.log('Fetching supervisors...');
      const response = await userAPI.searchSupervisors();
      console.log('Supervisors API response:', response);
      console.log('Response data:', response.data);
      
      if (response.data && response.data.supervisors) {
        setSupervisors(response.data.supervisors);
        console.log('Set supervisors:', response.data.supervisors.length, 'supervisors');
      } else {
        console.log('No supervisors property in response');
        setSupervisors([]);
      }
    } catch (error) {
      console.error('Error fetching supervisors:', error);
      console.error('Error response:', error.response);
      toast.error('Failed to fetch supervisors: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const filterSupervisors = () => {
    let filtered = supervisors;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(supervisor =>
        supervisor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supervisor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supervisor.department && supervisor.department.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by department
    if (departmentFilter !== 'All') {
      filtered = filtered.filter(supervisor =>
        supervisor.department === departmentFilter
      );
    }

    setFilteredSupervisors(filtered);
  };

  const departments = ['All', ...new Set(supervisors.map(s => s.department).filter(Boolean))];

  const handleContactSupervisor = (supervisor) => {
    setSelectedSupervisor(supervisor);
    setShowMessageModal(true);
  };

  const handleSendMessageRequest = async () => {
    if (!messageText.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      await messageAPI.sendMessageRequest(selectedSupervisor._id, messageText);
      toast.success('Message request sent successfully!');
      setShowMessageModal(false);
      setMessageText('');
      setSelectedSupervisor(null);
    } catch (error) {
      console.error('Error sending message request:', error);
      toast.error(error.response?.data?.message || 'Failed to send message request');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Find Supervisors</h1>
          <p className="text-muted-foreground">
            Connect with potential thesis supervisors and explore their research areas
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by name, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-muted-foreground">
            {loading ? 'Loading...' : `Found ${filteredSupervisors.length} supervisor${filteredSupervisors.length !== 1 ? 's' : ''}`}
          </p>
          {/* Debug info */}
          <p className="text-xs text-muted-foreground mt-1">
            Debug: Total supervisors: {supervisors.length}, Filtered: {filteredSupervisors.length}, 
            Search: "{searchTerm}", Department: "{departmentFilter}"
          </p>
        </div>

        {/* Supervisors Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-muted rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-32"></div>
                      <div className="h-3 bg-muted rounded w-24"></div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredSupervisors.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No supervisors found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or check back later.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSupervisors.map((supervisor) => (
              <Card key={supervisor._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{supervisor.name}</CardTitle>
                      <CardDescription>{supervisor.email}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {supervisor.department && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Department</h4>
                      <Badge variant="outline">{supervisor.department}</Badge>
                    </div>
                  )}
                  
                  {supervisor.researchAreas && supervisor.researchAreas.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Research Areas</h4>
                      <div className="flex flex-wrap gap-1">
                        {supervisor.researchAreas.slice(0, 3).map((area, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                        {supervisor.researchAreas.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{supervisor.researchAreas.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {supervisor.bio && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">About</h4>
                      <p className="text-sm text-foreground line-clamp-3">
                        {supervisor.bio}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleContactSupervisor(supervisor)}
                      className="flex-1"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contact
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Could navigate to supervisor's profile or projects
                        toast('View profile functionality coming soon', {
                          icon: 'ℹ️',
                        });
                      }}
                    >
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Message Request Modal */}
      {showMessageModal && selectedSupervisor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Send Message Request</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowMessageModal(false);
                  setMessageText('');
                  setSelectedSupervisor(null);
                }}
              >
                ×
              </Button>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{selectedSupervisor.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedSupervisor.email}</p>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                Send a message request to start a conversation with this supervisor.
              </p>
              
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Hi, I'm interested in discussing thesis supervision opportunities..."
                className="w-full p-3 border border-border rounded-md bg-background h-24 resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {messageText.length}/500 characters
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowMessageModal(false);
                  setMessageText('');
                  setSelectedSupervisor(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSendMessageRequest}
                disabled={!messageText.trim()}
              >
                Send Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
