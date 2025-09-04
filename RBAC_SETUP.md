# Role-Based Access Control (RBAC) Setup Guide

This guide walks you through implementing comprehensive Role-Based Access Control for your Next.js polling application with Supabase.

## 🔒 Security Overview

Our RBAC implementation provides:

- **Row-Level Security (RLS)** on all database tables
- **Role-based permissions** (user, admin, moderator)
- **Ownership-based access control**
- **Admin override capabilities**
- **Comprehensive audit logging**
- **XSS and injection protection**

## 📁 Files Added/Modified

### Database Security
- `supabase/security_policies.sql` - Complete RLS policies
- `scripts/setup_security.sql` - Setup script for Supabase

### Middleware & API Security  
- `middleware.ts` - Enhanced with admin route protection
- `app/api/admin/users/route.ts` - Admin user management API
- `app/api/admin/polls/route.ts` - Admin poll management API
- `app/api/polls/[id]/route.ts` - Enhanced poll API with RBAC

### Documentation
- `RBAC_SETUP.md` - This guide

## 🚀 Quick Setup

### 1. Apply Database Security Policies

Run the security setup script in your Supabase SQL editor:

```bash
# Copy content from scripts/setup_security.sql and run in Supabase dashboard
```

Or via Supabase CLI:

```bash
supabase db reset  # If starting fresh
supabase migration new setup_security
# Copy security_policies.sql content to the migration file
supabase db push
```

### 2. Create Your First Admin User

After running the setup script, create your first admin:

```sql
-- Replace with your actual email address
INSERT INTO user_roles (user_id, role, created_at)
SELECT id, 'admin', NOW()
FROM auth.users
WHERE email = 'your-admin-email@example.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin', updated_at = NOW();
```

### 3. Verify Security Setup

Check that everything is working:

```sql
-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('polls', 'poll_options', 'votes', 'user_roles');

-- Check your admin role
SELECT * FROM user_roles WHERE user_id = auth.uid();
```

### 4. Update Supabase Client Configuration

Ensure your middleware imports are correct:

```typescript
// In middleware.ts - verify this import exists
import { validateAndRefreshSession, AuthSecurity, createMiddlewareClient } from '@/lib/supabase/middleware'
```

## 👤 User Roles & Permissions

### Anonymous Users (anon)
- ✅ View polls and poll options
- ❌ Cannot vote or create content
- ❌ No access to admin features

### Authenticated Users (authenticated)
- ✅ Create new polls
- ✅ Vote on active polls (once per poll)
- ✅ Update/delete only their own polls
- ✅ View their own votes
- ❌ Cannot access admin features

### Poll Creators
- ✅ All authenticated user permissions
- ✅ Manage their own poll options
- ✅ View votes on their polls
- ❌ Cannot modify other users' content

### Administrators (admin role)
- ✅ Full system access
- ✅ View/modify/delete any poll or vote
- ✅ Manage user roles
- ✅ Access admin API endpoints
- ✅ View audit logs
- ⚠️ Cannot impersonate users for voting

## 🔐 API Security Features

### Protected Routes

**Admin-only endpoints:**
```
/admin/*
/api/admin/*
```

**Authentication required:**
```
/dashboard
/polls/create
/polls/[id]/edit
/api/polls (POST, PUT, DELETE)
/api/votes
```

**Public access:**
```
/
/polls/[id] (viewing)
/auth/*
```

### Security Headers

All responses include security headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` for XSS protection

### Rate Limiting

Middleware sets rate limiting headers (customize as needed):
- `X-RateLimit-Limit: 100`
- `X-RateLimit-Remaining: 99`

## 🛠️ Admin API Usage

### Managing Users

**List all users:**
```bash
GET /api/admin/users?page=1&limit=20&search=email&role=admin
```

**Update user role:**
```bash
PATCH /api/admin/users
Content-Type: application/json

{
  "userId": "user-uuid",
  "role": "admin"
}
```

**Delete user (moderation):**
```bash
DELETE /api/admin/users?userId=user-uuid
```

### Managing Polls

**List all polls:**
```bash
GET /api/admin/polls?page=1&status=active&userId=user-uuid
```

**Update poll (admin moderation):**
```bash
PATCH /api/admin/polls
Content-Type: application/json

{
  "pollId": "poll-uuid",
  "title": "Updated title",
  "description": "Updated description",
  "expires_at": "2024-12-31T23:59:59Z"
}
```

**Delete poll (moderation):**
```bash
DELETE /api/admin/polls?pollId=poll-uuid
```

## 🔍 Database Functions

### Security Helper Functions

```sql
-- Check if user is admin
SELECT is_admin(); -- Returns boolean
SELECT is_admin('user-uuid'); -- Check specific user

-- Check poll ownership
SELECT user_owns_poll('poll-uuid'); -- Current user
SELECT user_owns_poll('poll-uuid', 'user-uuid'); -- Specific user

-- Check poll status
SELECT poll_is_active('poll-uuid');
```

### Admin Management

```sql
-- Assign admin role (only admins can do this)
SELECT assign_admin_role('target-user-uuid');

-- Revoke admin role
SELECT revoke_admin_role('target-user-uuid');
```

### Secure Voting

```sql
-- Cast vote with comprehensive validation
SELECT * FROM increment_vote('option-uuid', 'poll-uuid', 'user-uuid');
```

## 📊 Audit Logging

All admin actions are logged in the `audit_logs` table:

```sql
-- View admin actions
SELECT 
  al.created_at,
  al.action,
  al.table_name,
  u.email as admin_email,
  al.old_values,
  al.new_values
FROM audit_logs al
LEFT JOIN auth.users u ON u.id = al.user_id
ORDER BY al.created_at DESC;
```

## 🔥 Attack Vectors Blocked

Our RBAC system protects against:

- ✅ **Data manipulation by non-owners**
- ✅ **Vote tampering and duplicate voting**  
- ✅ **Unauthorized poll deletion**
- ✅ **Cross-user data access**
- ✅ **Privilege escalation**
- ✅ **Anonymous user abuse**
- ✅ **Expired poll voting**
- ✅ **SQL injection through RLS**
- ✅ **XSS attacks via input sanitization**
- ✅ **Admin impersonation**

## 🧪 Testing Security

### Test User Permissions

```bash
# Test as regular user - should fail
curl -X DELETE http://localhost:3000/api/admin/polls?pollId=some-id \
  -H "Authorization: Bearer user-token"

# Test as admin - should succeed  
curl -X DELETE http://localhost:3000/api/admin/polls?pollId=some-id \
  -H "Authorization: Bearer admin-token"
```

### Test Database Policies

```sql
-- Test as regular user (should only see own polls)
SET request.jwt.claims.sub TO 'regular-user-uuid';
SELECT * FROM polls; -- Should only return user's polls for modification

-- Test as admin (should see all)
SET request.jwt.claims.sub TO 'admin-user-uuid';  
SELECT * FROM polls; -- Should return all polls
```

## 🚨 Security Checklist

Before deploying to production:

- [ ] Applied all RLS policies via `setup_security.sql`
- [ ] Created first admin user  
- [ ] Tested API endpoints with different user roles
- [ ] Verified middleware is protecting admin routes
- [ ] Confirmed audit logging is working
- [ ] Updated environment variables for production
- [ ] Set up monitoring for suspicious activities
- [ ] Documented admin procedures for your team

## 🔄 Maintenance

### Regular Security Tasks

1. **Monitor Audit Logs:** Review admin actions weekly
2. **User Role Cleanup:** Remove inactive admin accounts
3. **Policy Updates:** Update RLS policies as features evolve
4. **Security Testing:** Regular penetration testing

### Scaling Considerations

- **Performance:** Indexes are already optimized for RLS queries
- **Monitoring:** Consider adding APM for database query performance
- **Caching:** Admin endpoints should not be cached
- **Backup:** Ensure audit logs are included in backups

## 📞 Support

If you encounter issues:

1. Check Supabase logs for RLS policy errors
2. Verify user roles in `user_roles` table
3. Test API endpoints with different authentication states
4. Review middleware configuration for route protection

## 🔒 Security Best Practices

- **Never expose service role key** in client-side code
- **Validate all inputs** server-side, not just client-side  
- **Use HTTPS** in production always
- **Rotate admin accounts** regularly
- **Monitor audit logs** for suspicious activity
- **Keep dependencies updated** for security patches

---

**Your Next.js polling application is now secured with enterprise-grade Role-Based Access Control!** 🎉

Users can only access what they're authorized to see, admins have full control with audit trails, and your application is protected against common security vulnerabilities.
