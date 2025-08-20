# Thesis-Sync Chat & Video Call System

## Overview
A comprehensive group chat and video calling system designed for thesis management, built with the MERN stack, WebRTC, and Socket.io.

## Features
- **Multi-user Group Chat**: Support for 4-6 person thesis groups
- **File Sharing**: Share images, PDFs, and short videos
- **Multi-user Video Calls**: Group video calling with up to 6 participants
- **Real-time Messaging**: Instant messaging with typing indicators
- **User Authentication**: Secure login and registration
- **Beautiful UI**: Modern, responsive design

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, Socket.io-client
- **Backend**: Node.js, Express.js, Socket.io
- **Database**: MongoDB with Mongoose
- **Real-time Communication**: WebRTC for video calls, Socket.io for messaging
- **File Handling**: Multer for file uploads

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Modern web browser with WebRTC support

### 1. Clone and Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Environment Configuration

Create a `.env` file in the server directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/thesis-sync-chat
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

### 3. Start MongoDB
Make sure MongoDB is running on your system.

### 4. Run the Application

Start the server:
```bash
cd server
npm start
```

Start the client (in a new terminal):
```bash
cd client
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
thesis-sync-chat/
├── server/
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── middleware/       # Authentication middleware
│   ├── uploads/          # File uploads directory
│   └── index.js          # Server entry point
├── client/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── contexts/     # React contexts
│   │   ├── utils/        # Utility functions
│   │   └── App.js        # Main App component
│   └── public/
└── README.md
```

## Key Features Explained

### Group Chat System
- Create thesis groups with project titles
- Real-time messaging between group members
- Typing indicators and online status
- Message history and read receipts

### File Sharing
- Drag-and-drop file uploads
- Support for images, PDFs, and videos
- Preview files in chat
- Download functionality

### Multi-user Video Calls
- Support for group video calls (2-6 participants)
- Audio/video toggle controls
- Screen sharing capabilities
- Responsive video grid layout

### Authentication
- User registration and login
- JWT-based authentication
- Secure API endpoints
- Session management

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Groups
- `GET /api/groups` - Get user's groups
- `POST /api/groups` - Create new group
- `GET /api/groups/:id/messages` - Get group messages
- `POST /api/groups/:id/members` - Add group member

### Messages
- `POST /api/messages/text` - Send text message
- `POST /api/messages/file` - Send file message
- `PUT /api/messages/:id/read` - Mark message as read

## Socket Events

### Chat Events
- `join-group` - Join a group chat room
- `leave-group` - Leave a group chat room
- `new-message` - Send a new message
- `typing-start` - Start typing indicator
- `typing-stop` - Stop typing indicator

### Video Call Events
- `start-video-call` - Initiate a video call
- `join-video-call` - Join an existing call
- `leave-video-call` - Leave a video call
- `video-signal` - WebRTC signaling
- `video-offer` - WebRTC offer
- `video-answer` - WebRTC answer
- `ice-candidate` - ICE candidate exchange

## Browser Support
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Security Features
- JWT authentication
- File type validation
- File size limits
- Input sanitization
- CORS protection

## Future Enhancements
- Screen sharing in video calls
- Message reactions and replies
- Group admin controls
- File storage optimization
- Mobile app development
- Integration with thesis management tools
