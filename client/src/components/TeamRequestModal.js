import React, { useState } from 'react';

const TeamRequestModal = ({ onClose, onCreate }) => {
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState(['Machine Learning', 'Python']);
  const [skillInput, setSkillInput] = useState('');

  const handleAddSkill = (e) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
      e.preventDefault();
    }
  };

  const handleRemoveSkill = (skill) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({ topic, description, skills });
    setTopic('');
    setDescription('');
    setSkills([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md slide-in">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">Create Team Request</h3>
            <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="thesis-topic">Thesis Topic</label>
              <input type="text" id="thesis-topic" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your thesis topic" value={topic} onChange={e => setTopic(e.target.value)} />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="description">Description</label>
              <textarea id="description" rows="3" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Describe your project and what you're looking for in team members" value={description} onChange={e => setDescription(e.target.value)}></textarea>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">Required Skills</label>
              <div className="flex flex-wrap gap-2">
                {skills.map(skill => (
                  <span key={skill} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                    {skill}
                    <button type="button" className="ml-1 text-blue-500 hover:text-blue-700" onClick={() => handleRemoveSkill(skill)}>
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </span>
                ))}
                <input type="text" className="text-xs px-2 py-1 border-b border-gray-300 focus:outline-none focus:border-blue-500" placeholder="Add skill..." value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyPress={handleAddSkill} />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button type="button" className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="gradient-bg text-white px-4 py-2 rounded-md hover:opacity-90">
                Create Request
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TeamRequestModal;
