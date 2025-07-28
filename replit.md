# Scrum Poker Tool

## Overview

This is a real-time Scrum Poker estimation tool built for Agile teams. The application allows teams to conduct planning poker sessions where participants can vote on story points anonymously until the host reveals all votes. The system is designed for desktop use with a clean, minimalist interface optimized for collaborative estimation sessions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: React Query (@tanstack/react-query) for server state and React hooks for local state
- **Build Tool**: Vite with custom configuration for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **WebSocket**: Native WebSocket implementation for real-time communication
- **Storage**: In-memory storage using Map-based data structures (no persistent database)
- **Session Management**: Session-based with 4-digit PIN codes for access control

### Data Storage Solutions
- **Primary Storage**: In-memory storage using TypeScript interfaces and Map collections
- **Database ORM**: Drizzle ORM configured for PostgreSQL (ready for future database integration)
- **Session Storage**: Ephemeral sessions that clear when terminated
- **No Authentication**: PIN-based session access without user accounts

## Key Components

### Core Data Models
- **Session**: Contains PIN, host info, current vote state, and metadata
- **Participant**: User information including name, host status, and connection state  
- **Vote**: Individual vote submissions with participant, value, and label associations
- **VoteHistory**: Historical record of completed voting rounds with results

### Real-time Communication
- **WebSocket Server**: Handles real-time updates for session state, participant changes, and vote submissions
- **Message Types**: Structured WebSocket messages for joining sessions, submitting votes, and broadcasting updates
- **Connection Management**: Automatic reconnection with exponential backoff strategy

### UI Components
- **Home Page**: Landing page with session creation and joining functionality
- **Session Page**: Main voting interface with participant list, card selection, and vote history
- **Modal System**: Custom modal components for user interactions
- **Card System**: Visual representation of story point values (1, 2, 3, 5, 8, 13, 21, 34, coffee, ?)

## Data Flow

### Session Creation Flow
1. Host creates session with 4-digit PIN and name
2. Server validates PIN uniqueness and creates session record
3. Host automatically added as first participant
4. Session URL generated and shared with team members

### Voting Process Flow
1. Host initiates voting round with descriptive label
2. Participants select cards privately (votes hidden from others)
3. Real-time WebSocket updates sync participant states
4. Host reveals votes when ready, showing all selections and calculated average
5. Results stored in vote history for session reference

### Real-time Updates
- WebSocket connections maintain live session state
- Participant join/leave events broadcast to all session members
- Vote submissions update in real-time (hidden until revealed)
- Session state changes propagated immediately to all connected clients

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL driver (prepared for future database integration)
- **drizzle-orm**: Type-safe database ORM with schema validation
- **zod**: Runtime type validation for API requests and WebSocket messages
- **ws**: WebSocket library for real-time communication

### UI Dependencies
- **@radix-ui/react-***: Accessible UI primitives for all interactive components
- **@tanstack/react-query**: Server state management and caching
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library for consistent iconography

### Development Dependencies
- **vite**: Fast build tool with HMR support
- **typescript**: Type safety across frontend and backend
- **@replit/vite-plugin-***: Replit-specific development plugins

## Deployment Strategy

### Development Environment
- Vite development server with HMR for frontend
- Express server with auto-reload using tsx
- WebSocket server integrated with HTTP server
- Environment variables for database configuration

### Production Build
- Frontend: Vite build with optimized bundle splitting
- Backend: esbuild compilation to ESM format with external package resolution
- Static asset serving through Express middleware
- Single deployment artifact with embedded client assets

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (currently unused but configured)
- **NODE_ENV**: Environment detection for development vs production modes
- **Port Configuration**: Automatic port detection for deployment platforms

The application is designed to be stateless and horizontally scalable, with all session data stored in memory. Future enhancements could include persistent storage using the already-configured Drizzle ORM setup.