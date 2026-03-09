# ResQCity Development Documentation

## Quick Start Guide

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database running
- Mapbox account (free tier works)

### Initial Setup

1. **Database Setup**
   ```bash
   # Start PostgreSQL (if using Docker)
   docker run --name resqcity-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=resqcity -p 5432:5432 -d postgres

   # Or use existing PostgreSQL installation
   createdb resqcity
   ```

2. **Environment Configuration**
   Create `.env` file:
   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/resqcity?schema=public"
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="pk.your-mapbox-token"
   NEXT_PUBLIC_WEBSOCKET_URL="http://localhost:3000"
   ```

3. **Install & Run**
   ```bash
   npm install
   npm run prisma:migrate
   npm run dev
   ```

4. **Access the App**
   - Open `http://localhost:3000`
   - Register a new account
   - Reports are visible in dashboard

## Development Workflow

### Creating Database Migrations
```bash
# After modifying schema.prisma
npm run prisma:migrate

# Name your migration descriptively
# Example: "add_user_role_field"
```

### Viewing Database
```bash
npm run prisma:studio
# Opens at http://localhost:5555
```

### Code Structure

#### Adding a New API Route
1. Create file in `src/app/api/your-route/route.ts`
2. Import auth middleware if needed
3. Export HTTP method handlers (GET, POST, etc.)

Example:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request);
  if (authResult instanceof NextResponse) return authResult;
  
  // Your logic here
  return NextResponse.json({ data: 'response' });
}
```

#### Adding a New Page
1. Create file in `src/app/your-page/page.tsx`
2. Use `'use client'` directive if using React hooks
3. Pages under `/dashboard` or `/admin` are protected by layout auth

Example:
```typescript
'use client';

export default function YourPage() {
  return <div>Your content</div>;
}
```

### Authentication Flow

1. User registers/logs in
2. JWT token stored in localStorage
3. Token sent in Authorization header: `Bearer <token>`
4. Middleware validates token and extracts user info
5. Routes check user role if needed

### Real-time WebSocket

Server-side (in API routes):
```typescript
import { notifyReportUpdate } from '@/lib/websocket';
notifyReportUpdate(reportId, updateData);
```

Client-side:
```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

const { isConnected, onReportUpdate } = useWebSocket();
onReportUpdate((data) => {
  console.log('Report updated:', data);
});
```

## Testing

### Manual Testing Checklist
- [ ] User registration
- [ ] User login
- [ ] Create report
- [ ] View reports list
- [ ] View single report
- [ ] Add comment to report
- [ ] Admin: Change report status
- [ ] Admin: View dashboard stats
- [ ] Admin: View heatmap
- [ ] Real-time update when report changes

### Creating Test Data

Using Prisma Studio (`npm run prisma:studio`):
1. Create a user with role "ADMIN"
2. Create several reports with different:
   - Categories
   - Priorities
   - Statuses
   - Locations (vary lat/lng for heatmap)

Or use the API:
```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","firstName":"Test","lastName":"User"}'

# Login (save the token)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Create report
curl -X POST http://localhost:3000/api/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"Pothole","description":"Large pothole on main street","category":"POTHOLE","latitude":42.6977,"longitude":23.3219}'
```

## Common Issues & Solutions

### Database Connection Issues
```
Error: Can't reach database server
```
**Solution**: Ensure PostgreSQL is running and DATABASE_URL is correct

### Mapbox Not Loading
```
Error: Invalid access token
```
**Solution**: Verify NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env

### WebSocket Not Connecting
**Solution**: 
- Ensure using `npm run dev` (runs custom server)
- Check NEXT_PUBLIC_WEBSOCKET_URL matches your dev server

### Prisma Client Not Found
```
Error: @prisma/client not found
```
**Solution**: 
```bash
npm run postinstall
# or
npx prisma generate
```

## Advanced Configuration

### Changing Default Map Center
Edit `src/app/admin/heatmap/page.tsx`:
```typescript
center: [longitude, latitude], // [23.3219, 42.6977] = Sofia
zoom: 12,
```

### Customizing Email Templates
Edit `src/lib/email.ts` functions:
- `sendVerificationEmail`
- `sendReportUpdateEmail`

### Adding New Report Categories
1. Update `prisma/schema.prisma`:
   ```prisma
   enum Category {
     // ... existing
     YOUR_NEW_CATEGORY
   }
   ```
2. Run migration: `npm run prisma:migrate`
3. Update frontend category lists in forms

### Role-Based Permissions
Modify `src/lib/middleware.ts` to add custom role checks:
```typescript
export async function authMiddleware(
  request: NextRequest,
  requiredRole?: string,
  customCheck?: (user: any) => boolean
) {
  // ... existing code
  if (customCheck && !customCheck(payload)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
```

## Deployment Notes

### Environment for Production
- Set `NODE_ENV=production`
- Use strong JWT_SECRET (32+ characters)
- Enable SSL for PostgreSQL connection
- Use production Mapbox token
- Configure proper email credentials

### Database Migrations in Production
```bash
npx prisma migrate deploy
```

### Build Process
```bash
npm run build
npm start
```

## Performance Optimization

### Database Indexes
Already included in schema:
- Reports: status, category, createdAt
- Consider adding more for large datasets

### API Response Pagination
Implemented in `/api/reports`:
```typescript
?page=1&limit=10
```

### Caching Strategies
Consider adding:
- Redis for session storage
- CDN for static assets
- Database query result caching

## Security Considerations

- JWT tokens expire based on JWT_EXPIRES_IN
- Passwords hashed with bcrypt (10 rounds)
- SQL injection prevented by Prisma
- XSS protection via React's escaping
- CORS configured in WebSocket server
- Auth middleware on protected routes

## Monitoring & Logging

Add monitoring:
```typescript
// src/lib/logger.ts
export function logError(error: any, context: string) {
  console.error(`[${context}]`, error);
  // Send to logging service (e.g., Sentry)
}
```

Use in API routes:
```typescript
catch (error) {
  logError(error, 'CreateReport');
  return NextResponse.json({ error: 'Failed' }, { status: 500 });
}
```

---

Happy Development! 🚀
