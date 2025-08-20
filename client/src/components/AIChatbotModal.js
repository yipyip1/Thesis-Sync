import React, { useState } from 'react';

const AIChatbotModal = ({ onClose }) => {
  const [messages, setMessages] = useState([
    { from: 'ai', text: "Hello! I'm your AI research assistant. How can I help you with your thesis today?" },
    { from: 'user', text: 'Can you summarize recent advancements in NLP?' },
    { from: 'ai', text: 'Recent NLP advancements include transformer models like GPT-4, multimodal approaches combining text with other data types, and more efficient training techniques...' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages([...messages, { from: 'user', text: input }]);
    // Simulate AI response
    setTimeout(() => {
      setMessages(msgs => [...msgs, { from: 'ai', text: `Here's what I found about "${input}": [Simulated AI response]` }]);
    }, 1000);
    setInput('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md slide-in">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <div className="bg-green-100 p-2 rounded-full mr-3">
                <i className="fas fa-robot text-green-500"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">AI Research Assistant</h3>
            </div>
            <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 mb-4 h-64 overflow-y-auto">
            {messages.map((msg, idx) => (
              <div key={idx} className={msg.from === 'ai' ? 'flex mb-4' : 'flex justify-end mb-4'}>
                {msg.from === 'ai' && (
                  <div className="bg-green-100 p-2 rounded-full mr-3 h-10 w-10 flex items-center justify-center">
                    <i className="fas fa-robot text-green-500"></i>
                  </div>
                )}
                <div className={msg.from === 'ai' ? 'bg-white rounded-lg py-2 px-4 shadow-sm max-w-xs md:max-w-md' : 'bg-blue-100 rounded-lg py-2 px-4 shadow-sm max-w-xs md:max-w-md'}>
                  <p className="text-gray-800">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
          <form className="flex items-center" onSubmit={handleSend}>
            <input type="text" placeholder="Ask about your research..." className="flex-1 border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-green-500" value={input} onChange={e => setInput(e.target.value)} />
            <button type="submit" className="ml-2 gradient-bg text-white rounded-full p-2 hover:opacity-90">
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIChatbotModal;
