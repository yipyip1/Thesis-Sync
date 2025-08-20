import React from 'react';

const FeatureCards = ({ onTeamRequest, onAIChatbot, onSupervisorSearch }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
    {/* Team Requests Card */}
    <div className="bg-white rounded-lg shadow-md overflow-hidden border-l-4 border-blue-500">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 p-3 rounded-full mr-4">
            <i className="fas fa-users text-blue-500"></i>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Team Requests</h2>
        </div>
        <p className="text-gray-600 mb-4">Create or join team requests based on required skills and thesis topics.</p>
        <button className="gradient-bg text-white px-4 py-2 rounded-md hover:opacity-90 transition" onClick={onTeamRequest}>
          Create Request
        </button>
      </div>
    </div>

    {/* AI Chatbot Card */}
    <div className="bg-white rounded-lg shadow-md overflow-hidden border-l-4 border-green-500">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="bg-green-100 p-3 rounded-full mr-4">
            <i className="fas fa-robot text-green-500"></i>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">AI Research Assistant</h2>
        </div>
        <p className="text-gray-600 mb-4">Get summaries and explanations of related topics from our AI chatbot.</p>
        <button className="gradient-bg text-white px-4 py-2 rounded-md hover:opacity-90 transition" onClick={onAIChatbot}>
          Ask AI
        </button>
      </div>
    </div>

    {/* Supervisor Search Card */}
    <div className="bg-white rounded-lg shadow-md overflow-hidden border-l-4 border-purple-500">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="bg-purple-100 p-3 rounded-full mr-4">
            <i className="fas fa-search text-purple-500"></i>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Supervisor Search</h2>
        </div>
        <p className="text-gray-600 mb-4">Find the perfect supervisor by department, rating, and availability.</p>
        <button className="gradient-bg text-white px-4 py-2 rounded-md hover:opacity-90 transition" onClick={onSupervisorSearch}>
          Search Now
        </button>
      </div>
    </div>
  </div>
);

export default FeatureCards;
