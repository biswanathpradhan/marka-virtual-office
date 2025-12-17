# Production Setup Guide

## Authentication Issue Fix

If you're getting `{"message":"Unauthenticated."}` errors in production, follow these steps:

### 1. Update `.env` file

Add these environment variables to your production `.env` file:

```env
APP_URL=https://video-call.hmindustries.co
APP_ENV=production
APP_DEBUG=false

# Sanctum Configuration
SANCTUM_STATEFUL_DOMAINS=video-call.hmindustries.co,localhost,127.0.0.1

# Session Configuration
SESSION_DOMAIN=.hmindustries.co
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax

# CORS Configuration
CORS_ALLOWED_ORIGINS=https://video-call.hmindustries.co
FRONTEND_URL=https://video-call.hmindustries.co
```

### 2. Clear Configuration Cache

After updating `.env`, run these commands on your production server:

```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
```

### 3. Verify Session Configuration

Ensure your session driver is set correctly in `.env`:

```env
SESSION_DRIVER=file
# OR for better performance in production:
SESSION_DRIVER=database
```

If using `database` driver, make sure the `sessions` table exists:
```bash
php artisan migrate
```

### 4. Check Cookie Settings

The application uses session-based authentication via Sanctum. Ensure:
- Cookies are being sent with requests (`withCredentials: true` is set in `bootstrap.js`)
- Session cookies are accessible across the domain
- HTTPS is enabled (required for secure cookies in production)

### 5. Verify Trust Proxies

If you're behind a proxy/load balancer (like Cloudflare, AWS ELB, etc.), ensure `TrustProxies` middleware is configured correctly (already set to `*`).

### 6. Test Authentication

After making changes:
1. Clear browser cookies for the domain
2. Login again
3. Check browser DevTools → Application → Cookies to verify session cookie is set
4. Check Network tab to ensure cookies are sent with API requests

### Common Issues:

1. **Domain mismatch**: Ensure `APP_URL` matches your actual domain
2. **HTTPS required**: Production should use HTTPS, set `SESSION_SECURE_COOKIE=true`
3. **Cookie domain**: Use `.hmindustries.co` (with leading dot) to allow subdomains
4. **CORS**: Ensure production domain is in CORS allowed origins

