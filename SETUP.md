# ResQCity Quick Setup Guide

## Option 1: Local Development (Recommended for Development)

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 12 or higher
- Git

### Steps

1. **Install Node.js dependencies**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL database**
   
   Option A - Using existing PostgreSQL:
   ```bash
   # Create database
   createdb resqcity
   ```
   
   Option B - Using Docker:
   ```bash
   docker run --name resqcity-db \
     -e POSTGRES_PASSWORD=resqcity123 \
     -e POSTGRES_DB=resqcity \
     -p 5432:5432 \
     -d postgres:15-alpine
   ```

3. **Configure environment**
   
   The `.env` file is already created. Update these values:
   ```bash
   # Edit .env file
   DATABASE_URL="postgresql://postgres:resqcity123@localhost:5432/resqcity"
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="your-mapbox-token"
   ```
   
   Get a free Mapbox token from: https://www.mapbox.com/

4. **Initialize database**
   ```bash
   npm run prisma:migrate
   npm run prisma:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open http://localhost:3000
   - Login with test credentials:
     - **Admin**: admin@resqcity.bg / admin123
     - **Citizen**: citizen@test.bg / citizen123

## Option 2: Docker Compose (Easiest)

### Prerequisites
- Docker
- Docker Compose

### Steps

1. **Update environment (optional)**
   Edit `docker-compose.yml` if needed

2. **Start services**
   ```bash
   docker-compose up -d
   ```

3. **Run database migrations**
   ```bash
   docker-compose exec app npx prisma migrate deploy
   docker-compose exec app npm run prisma:seed
   ```

4. **Access the application**
   - Open http://localhost:3000
   - Use test credentials above

5. **View logs**
   ```bash
   docker-compose logs -f app
   ```

6. **Stop services**
   ```bash
   docker-compose down
   ```

## Next Steps

1. **Explore the application**
   - Register a new citizen account
   - Create a report with location
   - Login as admin to view dashboard and heatmap

2. **Configure email (optional)**
   Update SMTP settings in `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   ```

3. **Set up Mapbox token**
   - Go to https://www.mapbox.com/
   - Create free account
   - Get access token
   - Update `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` in `.env`

## Troubleshooting

### Database connection fails
```bash
# Check if PostgreSQL is running
docker ps  # or
pg_isctl status

# Check DATABASE_URL in .env matches your setup
```

### Prisma errors
```bash
# Regenerate Prisma client
npx prisma generate

# Reset database (WARNING: deletes data)
npx prisma migrate reset
```

### Port 3000 already in use
```bash
# Kill process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:3000 | xargs kill
```

### Missing dependencies
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## Development Tools

### Prisma Studio (Database GUI)
```bash
npm run prisma:studio
# Opens at http://localhost:5555
```

### View API Documentation
All API endpoints are documented in `README.md`

### Database Seeding
```bash
# Add test data
npm run prisma:seed
```

## Production Deployment

See `README.md` for detailed deployment instructions for:
- Vercel (serverless - limited WebSocket support)
- Custom server (full features)
- Docker production setup

---

**Need help?** Check `DEVELOPMENT.md` for detailed documentation.
