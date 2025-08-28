import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Lightbulb, 
  Plus, 
  Search, 
  Filter, 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share, 
  Eye,
  TrendingUp,
  Calendar,
  User,
  Tag,
  Clock,
  Star,
  Users,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import { thesisIdeaAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function IdeasPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  
  // Real data state
  const [ideas, setIdeas] = useState([]);
  const [filteredIdeas, setFilteredIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    topLikes: 0
  });

  useEffect(() => {
    fetchIdeas();
  }, []);

  useEffect(() => {
    filterIdeas();
  }, [ideas, searchTerm, selectedCategory, sortBy]);

  const fetchIdeas = async () => {
    try {
      setLoading(true);
      const response = await thesisIdeaAPI.getIdeas();
      const fetchedIdeas = response.data.ideas || [];
      setIdeas(fetchedIdeas);
      
      // Calculate stats
      setStats({
        total: fetchedIdeas.length,
        available: fetchedIdeas.filter(idea => idea.status === 'available').length,
        topLikes: fetchedIdeas.length > 0 ? Math.max(...fetchedIdeas.map(i => i.likes?.length || 0)) : 0
      });
    } catch (error) {
      console.error('Error fetching ideas:', error);
      toast.error('Failed to load thesis ideas');
    } finally {
      setLoading(false);
    }
  };

  const filterIdeas = () => {
    let filtered = ideas;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(idea =>
        idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        idea.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        idea.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(idea => idea.category === selectedCategory);
    }

    // Sort ideas
    switch (sortBy) {
      case 'latest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'popular':
        filtered.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
        break;
      case 'mostViewed':
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }

    setFilteredIdeas(filtered);
  };
  const categories = [
    { value: 'all', label: 'All Categories', count: ideas.length },
    { value: 'AI', label: 'Artificial Intelligence', count: ideas.filter(i => i.category === 'AI').length },
    { value: 'Blockchain', label: 'Blockchain', count: ideas.filter(i => i.category === 'Blockchain').length },
    { value: 'IoT', label: 'Internet of Things', count: ideas.filter(i => i.category === 'IoT').length },
    { value: 'AR/VR', label: 'AR/VR', count: ideas.filter(i => i.category === 'AR/VR').length },
    { value: 'Machine Learning', label: 'Machine Learning', count: ideas.filter(i => i.category === 'Machine Learning').length }
  ];

  const handleLikeIdea = async (ideaId) => {
    try {
      await thesisIdeaAPI.likeIdea(ideaId);
      toast.success('Idea liked!');
      fetchIdeas(); // Refresh ideas to get updated like count
    } catch (error) {
      console.error('Error liking idea:', error);
      toast.error('Failed to like idea');
    }
  };

  const handleSubmitIdea = async (ideaData) => {
    try {
      await thesisIdeaAPI.createIdea(ideaData);
      toast.success('Idea submitted successfully!');
      setShowSubmitModal(false);
      fetchIdeas(); // Refresh ideas list
    } catch (error) {
      console.error('Error submitting idea:', error);
      toast.error('Failed to submit idea');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading ideas...</p>
          </div>
        </div>
      </div>
    );
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner': return 'secondary';
      case 'Intermediate': return 'default';
      case 'Advanced': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'default';
      case 'taken': return 'destructive';
      case 'in-progress': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Available';
      case 'taken': return 'Taken';
      case 'in-progress': return 'In Progress';
      default: return status;
    }
  };

  const handleLike = (ideaId) => {
    console.log('Liking idea:', ideaId);
    // Handle like functionality
  };

  const handleBookmark = (ideaId) => {
    console.log('Bookmarking idea:', ideaId);
    // Handle bookmark functionality
  };

  const handleContact = (ideaId) => {
    console.log('Contacting about idea:', ideaId);
    // Handle contact functionality
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Thesis Ideas</h1>
            <p className="text-muted-foreground">Explore and discover innovative thesis project ideas</p>
          </div>
          <Button 
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Submit Idea
          </Button>
        </div>
        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ideas by title, description, tags, or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label} ({cat.count})
                </option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
            >
              <option value="latest">Latest</option>
              <option value="popular">Most Popular</option>
              <option value="most-viewed">Most Viewed</option>
              <option value="most-commented">Most Commented</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Ideas</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Lightbulb className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Available</p>
                  <p className="text-2xl font-bold">{stats.available}</p>
                </div>
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Most Popular</p>
                  <p className="text-2xl font-bold">{stats.topLikes}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Categories</p>
                  <p className="text-2xl font-bold">{categories.length - 1}</p>
                </div>
                <Tag className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ideas Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredIdeas.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Lightbulb className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No ideas found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Be the first to share a thesis idea!'
                }
              </p>
              <Button onClick={() => setShowSubmitModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Submit New Idea
              </Button>
            </div>
          ) : (
            filteredIdeas.map((idea) => (
              <Card key={idea._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2 mb-2">{idea.title}</CardTitle>
                      <CardDescription className="line-clamp-3">
                        {idea.description}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <Badge variant={getStatusColor(idea.status || 'available')}>
                        {getStatusText(idea.status || 'available')}
                      </Badge>
                      <Badge variant={getDifficultyColor(idea.difficulty)}>
                        {idea.difficulty}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Author Info */}
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="w-8 h-8 bg-background rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {idea.author?.name ? idea.author.name.split(' ').map(n => n[0]).join('') : 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{idea.author?.name || 'Unknown Author'}</p>
                      <p className="text-xs text-muted-foreground">
                        {idea.author?.role || 'User'} • {idea.author?.department || 'General'}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {idea.estimatedDuration || 'Duration TBD'}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {idea.tags?.slice(0, 4).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {idea.tags?.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{idea.tags.length - 4}
                      </Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleLikeIdea(idea._id)}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Heart className="h-4 w-4" />
                        {idea.likes?.length || 0}
                      </button>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MessageCircle className="h-4 w-4" />
                        {idea.comments?.length || 0}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        {idea.views || 0}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Bookmark className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
