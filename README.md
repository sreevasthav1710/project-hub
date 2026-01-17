# ProjectHub

An all-in-one platform to manage development projects and track hackathon participations with your team.

## Features

- **Project Management**: Create, edit, and track development projects with detailed information
- **Team Collaboration**: Assign team members with specific roles (Team Lead, Frontend Developer, Backend Developer, etc.)
- **Hackathon Tracking**: Organize and manage hackathon entries with deadlines, teams, and linked projects
- **User Profiles**: Track statistics, projects led, and generate PDF reports
- **Real-time Updates**: Instant synchronization across all views using Supabase realtime

## Technologies

This project is built with:

- **Vite** - Fast build tool and dev server
- **React** - UI library with functional components
- **TypeScript** - Type-safe JavaScript
- **Supabase** - Authentication, Realtime Database, and Storage
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn-ui** - Re-usable component library
- **React Router** - Client-side routing

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
cd project-hub
```

2. Install dependencies:
```sh
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env` (if exists)
   - Add your Supabase URL and anon key

4. Start the development server:
```sh
npm run dev
```

The application will be available at `http://localhost:8080`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm test` - Run tests

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page components
├── hooks/          # Custom React hooks
├── integrations/   # Supabase client and types
├── types/          # TypeScript type definitions
└── lib/            # Utility functions
```

## Database Schema

The application uses Supabase with the following main tables:

- `profiles` - User profile information
- `projects` - Project details and metadata
- `project_members` - Team member assignments with roles
- `hackathons` - Hackathon information
- `hackathon_members` - Hackathon team members
- `hackathon_projects` - Links between hackathons and projects

## Deployment

Build the production version:

```sh
npm run build
```

The `dist/` folder will contain the production-ready files that can be deployed to any static hosting service.

## License

MIT
