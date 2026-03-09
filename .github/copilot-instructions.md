# ResQCity - Copilot Instructions

## Project Overview
ResQCity is a full-stack urban management platform built with Next.js 14, React 18, TypeScript, Tailwind CSS, Prisma, and PostgreSQL (Supabase).

## Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Socket.IO for WebSockets
- **Database**: PostgreSQL (Supabase) with Prisma ORM
- **Authentication**: JWT tokens with bcryptjs
- **Maps**: Interactive visualization with coordinate-based overlay system
- **Weather**: OpenWeatherMap API integration
- **Email**: Nodemailer with SMTP fallback

## Project Completion Status

### ✅ Completed Features
1. **Project Structure**: Consolidated single directory setup with clean organization
2. **Build Pipeline**: All TypeScript/JSON compilation errors resolved
3. **Database Integration**: Supabase PostgreSQL configured with Prisma ORM
4. **Authentication System**: JWT-based auth with role-based access (CITIZEN, ADMIN, SUPER_ADMIN)
5. **Core API Routes**:
   - Authentication (login, register, me endpoints)
   - Report management (CRUD operations)
   - Public reports API (for map visualization)
   - Store inventory API with 8 mock stores

6. **Interactive Map** (ENHANCED):
   - Multi-layer visualization on coordinate grid
   - Reports layer with status color-coding
   - Store locations with real-time inventory display
   - **Real-time vehicle tracking via WebSocket** (NEW)
   - Weather integration via OpenWeatherMap API
   - Toggle-able layers for custom views
   - Responsive sidebar with statistics and controls
   - **Direction arrows showing vehicle movement** (NEW)

## Development Environment

### Running the Application
```bash
npm run dev
```
App runs on http://localhost:3000

### Key Routes
- `/` - Home page with navigation
- `/map` - Interactive map with multiple data layers
- `/auth/login` - User login
- `/auth/register` - User registration
- `/dashboard` - Citizen report management
- `/admin` - Admin dashboard

## Test Credentials
- **Admin**: admin@resqcity.bg / admin123
- **Citizen**: citizen@test.bg / citizen123

## API Endpoints
- `GET /api/reports/public` - Public reports for map
- `GET /api/stores` - Store inventory data
- `POST /api/reports` - Submit new report
- `GET /api/auth/me` - Current user info
- `POST /api/auth/login` - User login

## Environment Variables
Required:
- `DATABASE_URL` - Supabase PostgreSQL connection
- `JWT_SECRET` - JWT signing key
- `JWT_EXPIRES_IN` - Token expiration (default: "7d")

Optional:
- `NEXT_PUBLIC_MAPBOX_TOKEN` - Mapbox access token
- `KEP_*` - Bulgarian КЕП integration variables
- `SMTP_*` - Email service configuration

## Database
- Schema: Prisma-managed with User, Report, Comment, ReportHistory models
- Location: Supabase PostgreSQL
- Test data: Auto-seeded with `npm run prisma:seed`

## Next Steps
Future enhancements possible:
- Real Mapbox integration
- Real store API integration
- WebSocket real-time map updates
- BG-Alert emergency layer
- Advanced analytics and reporting
- Mobile app development

---
**Status**: Production Ready with Interactive Map Feature
**Last Updated**: February 21, 2026
