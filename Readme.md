# ResQCity - Urban Management Platform

A comprehensive full-stack urban management platform built with Next.js 14, PostgreSQL, and real-time features for citizen reporting and administrative management.

## 🚀 Features

- **Citizen Reporting**: Submit urban issues with location, photos, and detailed descriptions
  - 🗺️ **Interactive Location Picker**: Select exact location from map
  - 📍 **Automatic District Detection**: System automatically identifies Sofia district
  - 📂 **Dynamic Categories**: Expandable category system with icons and colors
- **Smart Assignment**: Automatic routing of reports to responsible persons by district and category
- **Real-time Updates**: WebSocket integration for live report status updates
- **Admin Dashboard**: Comprehensive management interface with:
  - 📊 Statistics and report handling
  - 📂 Category management (create, edit, activate/deactivate)
  - 👥 Responsible persons management by district and category
- **Interactive Map**: Multi-layer map visualization with:
  - 📍 Citizen reports with status indicators
  - 🛒 Grocery stores with real-time inventory data
  - 🌦️ Real-time weather information (OpenWeatherMap)
  - Toggle-able layer system for custom views
- **Interactive Heatmap**: Mapbox GL visualization of report density and locations
- **Bulgarian КЕП Integration**: Government digital signature authentication support
- **Email Notifications**: Automatic updates via email fallback
- **Role-based Access**: Multi-tier user roles (Citizen, Admin, Super Admin)
- **RESTful API**: Complete API for all operations

## �️ Interactive Map Features

The interactive map provides a comprehensive view of urban data:

### Available Layers
1. **📍 Reports Layer** - View all citizen-reported issues
   - Color-coded by status: Pending (red), In Review (orange), In Progress (teal), Resolved (green)
   - Hover to see report details
   - Track resolution progress

2. **🛒 Stores Layer** - Grocery store locations with inventory
   - Real-time product availability (bread, milk, eggs, rice, oil)
   - Stock level indicators
   - Store address and contact information

3. **🌦️ Weather Layer** - Real-time meteorological data
   - Click anywhere on the map to get weather
   - Temperature, humidity, pressure, wind speed
   - Powered by OpenWeatherMap API

### How to Use
1. Navigate to `/map` from the home page
2. Use the left sidebar to toggle layers on/off
3. View statistics and selected location coordinates
4. Click on the map to get weather information (when weather layer is enabled)
5. Hover over markers to see detailed information

### Frontend
- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Mapbox GL JS**
- **Socket.IO Client**

### Backend
- **Next.js API Routes**
- **PostgreSQL** database
- **Prisma ORM**
- **JWT Authentication**
- **Socket.IO** for WebSockets
- **Nodemailer** for emails

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "ResQCity The Original"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   - Database URL (PostgreSQL)
   - JWT secret
   - Mapbox access token
   - KEP API credentials (optional)
   - SMTP settings for email

4. **Set up the database**
   ```bash
   npm run prisma:migrate
   ```

5. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

6. **Seed categories and responsible persons**
   ```bash
   npx tsx prisma/seed-categories.ts
   ```

   This will create:
   - 16 default report categories (potholes, street lights, garbage, etc.)
   - Sample responsible persons for the first 3 districts
   - All 24 Sofia districts support

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build
```bash
npm run build
npm start
```

### Database Management
```bash
# Open Prisma Studio
npm run prisma:studio

# Create a new migration
npm run prisma:migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## 📁 Project Structure

```
ResQCity/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── reports/       # Report management
│   │   │   │   └── public/    # Public report endpoint (for map)
│   │   │   ├── stores/        # Store data endpoint
│   │   │   ├── admin/         # Admin endpoints
│   │   │   └── heatmap/       # Heatmap data
│   │   ├── auth/              # Auth pages (login, register)
│   │   ├── dashboard/         # Citizen dashboard
│   │   ├── admin/             # Admin dashboard
│   │   ├── map/               # 🆕 Interactive map page
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Landing page
│   │   └── globals.css        # Global styles
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client
│   │   ├── auth.ts            # JWT utilities
│   │   ├── middleware.ts      # Auth middleware
│   │   ├── kep.ts             # KEP integration
│   │   ├── email.ts           # Email service
│   │   └── websocket.ts       # WebSocket server
│   └── hooks/
│       └── useWebSocket.ts    # WebSocket hook
├── server.ts                  # Custom server with WebSocket
├── next.config.js             # Next.js configuration
├── tailwind.config.ts         # Tailwind configuration
└── tsconfig.json              # TypeScript configuration
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `GET /api/auth/kep` - KEP authentication

### Reports
- `GET /api/reports` - List reports (filtered)
- `GET /api/reports/public` - Public reports for map visualization
- `POST /api/reports` - Create report (auto-assigns to responsible person)
- `GET /api/reports/[id]` - Get report details
- `PATCH /api/reports/[id]` - Update report (admin)
- `DELETE /api/reports/[id]` - Delete report (admin)
- `POST /api/reports/[id]/comments` - Add comment

### Categories (Admin)
- `GET /api/admin/categories` - List all categories
- `POST /api/admin/categories` - Create new category
- `GET /api/admin/categories/[id]` - Get category details
- `PUT /api/admin/categories/[id]` - Update category
- `DELETE /api/admin/categories/[id]` - Deactivate category

### Responsible Persons (Admin)
- `GET /api/admin/responsible-persons` - List all responsible persons (filter by district/category)
- `POST /api/admin/responsible-persons` - Create new responsible person
- `GET /api/admin/responsible-persons/[id]` - Get person details
- `PUT /api/admin/responsible-persons/[id]` - Update person
- `DELETE /api/admin/responsible-persons/[id]` - Deactivate person

### Stores & Map
- `GET /api/stores` - List all stores with inventory

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/heatmap` - Heatmap data

## 🗺️ Mapbox Setup

1. Create a free account at [Mapbox](https://www.mapbox.com/)
2. Get your access token from the dashboard
3. Add it to `.env`:
   ```
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token_here
   ```

## 🔐 Bulgarian KEP Integration

The platform includes support for Bulgarian government digital signatures (КЕП). To enable:

1. Register your application with [eAuth.bg](https://eauth.egov.bg/)
2. Obtain client credentials
3. Configure in `.env`:
   ```
   KEP_API_URL=https://eauth.egov.bg/api
   KEP_CLIENT_ID=your_client_id
   KEP_CLIENT_SECRET=your_client_secret
   ```

Note: Current implementation includes placeholders - full integration requires eAuth.bg registration.

## 📧 Email Configuration

Configure SMTP settings in `.env` for email notifications:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@resqcity.bg
```

## 🔒 Environment Variables

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` - Mapbox API token

Optional variables:
- `KEP_*` - Bulgarian KEP integration
- `SMTP_*` - Email configuration
- `NEXT_PUBLIC_WEBSOCKET_URL` - WebSocket server URL

## 👥 Default User Roles

- **CITIZEN**: Can create and view own reports
- **ADMIN**: Can manage all reports and access admin dashboard
- **SUPER_ADMIN**: Full system access

## 🧪 Testing

Create a test admin user:
```bash
npx prisma studio
```
Then manually create a user with role `ADMIN` or `SUPER_ADMIN`.

## 📝 Database Schema

Main entities:
- **User**: User accounts with roles
- **Report**: Citizen reports with location data and district
- **ReportCategory**: Dynamic categories with multilingual names, icons, and colors
- **ResponsiblePerson**: District-based responsible persons for each category
- **Comment**: Comments on reports
- **ReportHistory**: Audit trail of report changes

### New Features in Schema
- **Dynamic Categories**: Categories are now stored in database, not hardcoded enums
- **District Assignment**: Reports automatically linked to Sofia districts (24 districts)
- **Responsible Persons**: Each category can have multiple responsible persons per district
- **Auto-Assignment**: Reports automatically assigned to appropriate responsible person based on district and category

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project to Vercel
3. Configure environment variables
4. Deploy

Note: WebSocket features require custom deployment (not serverless)

### Docker
```bash
docker build -t resqcity .
docker run -p 3000:3000 resqcity
```

## 📄 License

MIT License - feel free to use this project for your urban management needs.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ for better cities
