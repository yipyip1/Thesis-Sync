import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { logout } = useAuth();

  return (
    <nav className="gradient-bg text-white shadow-lg">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <i className="fas fa-graduation-cap text-2xl"></i>
          <span className="text-xl font-bold">ThesisSync</span>
        </div>
        <div className="hidden md:flex space-x-6">
          <a href="#" className="hover:text-gray-200">Dashboard</a>
          <a href="#" className="font-semibold border-b-2 border-white">Collaborate</a>
          <a href="#" className="hover:text-gray-200">Resources</a>
          <a href="#" className="hover:text-gray-200">Profile</a>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <i className="fas fa-bell text-xl cursor-pointer"></i>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">3</span>
          </div>
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer">
            U
          </div>
          <button 
            onClick={logout}
            className="text-white hover:text-gray-200 text-sm bg-white bg-opacity-20 px-3 py-1 rounded-md transition"
          >
            Logout
          </button>
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <i className="fas fa-bars text-xl"></i>
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-indigo-800 px-4 py-2">
          <a href="#" className="block py-2 text-white hover:bg-indigo-700 rounded px-2">Dashboard</a>
          <a href="#" className="block py-2 text-white font-semibold bg-indigo-600 rounded px-2">Collaborate</a>
          <a href="#" className="block py-2 text-white hover:bg-indigo-700 rounded px-2">Resources</a>
          <a href="#" className="block py-2 text-white hover:bg-indigo-700 rounded px-2">Profile</a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
