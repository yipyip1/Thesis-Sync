import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { BookOpen, Plus, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import NotificationPanel from './NotificationPanel';

export default function Navigation() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-accent" />
          <Link to="/dashboard" className="text-2xl font-bold text-foreground hover:text-accent transition-colors">
            ThesisSync
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link 
            to="/dashboard" 
            className={`transition-colors ${
              isActive('/dashboard') 
                ? 'text-foreground font-medium' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Dashboard
          </Link>
          <Link 
            to="/projects" 
            className={`transition-colors ${
              isActive('/projects') 
                ? 'text-foreground font-medium' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Projects
          </Link>
          <Link 
            to="/teams" 
            className={`transition-colors ${
              isActive('/teams') 
                ? 'text-foreground font-medium' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {user?.role === 'supervisor' ? 'Available Teams' : 'Teams'}
          </Link>
          <Link 
            to="/messages" 
            className={`transition-colors ${
              isActive('/messages') 
                ? 'text-foreground font-medium' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Messages
          </Link>
          <Link 
            to="/ideas" 
            className={`transition-colors ${
              isActive('/ideas') 
                ? 'text-foreground font-medium' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Ideas
          </Link>
          <Link 
            to="/activity" 
            className={`transition-colors ${
              isActive('/activity') 
                ? 'text-foreground font-medium' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Activity
          </Link>
        </nav>
        
        <div className="flex items-center gap-3">
          {user?.role === 'admin' && (
            <Link to="/projects">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </Link>
          )}
          
          {/* Notification Panel */}
          <NotificationPanel />
          
          <div className="relative group">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium cursor-pointer">
              {user?.name?.charAt(0) || 'U'}
            </div>
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="p-3 border-b border-border">
                <p className="font-medium text-foreground">{user?.name || 'User'}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role || 'Student'}</p>
              </div>
              <div className="p-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-sm transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
