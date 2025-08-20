import React, { useState } from 'react';

const SupervisorSearchModal = ({ onClose }) => {
  // Example supervisor data
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All Departments');
  const [rating, setRating] = useState('Any Rating');
  const [availability, setAvailability] = useState('Any Availability');
  const supervisors = [
    {
      name: 'Dr. Michael Johnson',
      dept: 'Computer Science - Artificial Intelligence',
      initials: 'MJ',
      rating: 4.5,
      reviews: 24,
      available: true,
    },
    {
      name: 'Dr. Sarah Williams',
      dept: 'Electrical Engineering - Power Systems',
      initials: 'SW',
      rating: 4,
      reviews: 18,
      available: true,
    },
    {
      name: 'Dr. Robert Chen',
      dept: 'Computer Science - Data Science',
      initials: 'RC',
      rating: 5,
      reviews: 32,
      available: false,
    },
  ];
  const filtered = supervisors.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.dept.toLowerCase().includes(search.toLowerCase());
    const matchesDept = department === 'All Departments' || s.dept.includes(department);
    const matchesRating = rating === 'Any Rating' || (rating === '4+ Stars' && s.rating >= 4) || (rating === '3+ Stars' && s.rating >= 3) || (rating === '2+ Stars' && s.rating >= 2);
    const matchesAvail = availability === 'Any Availability' || (availability === 'Available Now' && s.available) || (availability === 'Available Next Semester' && !s.available);
    return matchesSearch && matchesDept && matchesRating && matchesAvail;
  });
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl slide-in">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">Find a Supervisor</h3>
            <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Department</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={department} onChange={e => setDepartment(e.target.value)}>
                  <option>All Departments</option>
                  <option>Computer Science</option>
                  <option>Electrical Engineering</option>
                  <option>Mechanical Engineering</option>
                  <option>Business Administration</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Minimum Rating</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={rating} onChange={e => setRating(e.target.value)}>
                  <option>Any Rating</option>
                  <option>4+ Stars</option>
                  <option>3+ Stars</option>
                  <option>2+ Stars</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Availability</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={availability} onChange={e => setAvailability(e.target.value)}>
                  <option>Any Availability</option>
                  <option>Available Now</option>
                  <option>Available Next Semester</option>
                </select>
              </div>
            </div>
            <div className="relative">
              <input type="text" placeholder="Search by name or expertise..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={search} onChange={e => setSearch(e.target.value)} />
              <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
            </div>
          </div>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filtered.map((s, idx) => (
              <div key={idx} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="h-12 w-12 bg-blue-500 rounded-full mr-4 flex items-center justify-center text-white font-bold">
                  {s.initials}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">{s.name}</h4>
                  <p className="text-sm text-gray-600">{s.dept}</p>
                  <div className="flex items-center mt-1">
                    <div className="flex text-yellow-400">
                      {[...Array(Math.floor(s.rating))].map((_, i) => <i key={i} className="fas fa-star"></i>)}
                      {s.rating % 1 !== 0 && <i className="fas fa-star-half-alt"></i>}
                      {[...Array(5 - Math.ceil(s.rating))].map((_, i) => <i key={i} className="far fa-star"></i>)}
                    </div>
                    <span className="text-xs text-gray-500 ml-1">({s.reviews} reviews)</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${s.available ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{s.available ? 'Available' : 'Limited Availability'}</span>
                  <button className="mt-2 gradient-bg text-white px-3 py-1 rounded-md text-sm hover:opacity-90" onClick={() => alert(`Request sent to ${s.name}! You'll be notified when they respond.`)}>Request</button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="text-center text-gray-500">No supervisors found.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorSearchModal;
