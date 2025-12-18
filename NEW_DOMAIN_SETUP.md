# New Domain Installation Guide

Complete guide for installing the Virtual Office application on a new domain.

## Prerequisites

- PHP 8.1+ with extensions: BCMath, Ctype, Fileinfo, JSON, Mbstring, OpenSSL, PDO, Tokenizer, XML
- Composer
- Node.js 18+ and npm
- MySQL/MariaDB database
- Web server (Apache/Nginx)
- SSL certificate (recommended for production)

## Step 1: Upload Files

1. Upload all project files to your server
2. Ensure file permissions are correct:
   ```bash
   chmod -R 755 storage bootstrap/cache
   chown -R www-data:www-data storage bootstrap/cache
   ```

## Step 2: Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` file with your domain settings:

```env
APP_NAME="Virtual Office"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://yourdomain.com

# Database Configuration
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_database_user
DB_PASSWORD=your_database_password

# Session Configuration (IMPORTANT for authentication)
SESSION_DRIVER=cookie
SESSION_LIFETIME=120
SESSION_DOMAIN=.yourdomain.com  # Use your actual domain
SESSION_SECURE=true  # Set to true if using HTTPS
SESSION_SAME_SITE=lax

# Sanctum Configuration (IMPORTANT for API authentication)
SANCTUM_STATEFUL_DOMAINS=yourdomain.com,www.yourdomain.com
SESSION_DOMAIN=.yourdomain.com

# Broadcasting Configuration (WebSocket)
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=local-app-id
PUSHER_APP_KEY=local-key
PUSHER_APP_SECRET=local-secret
PUSHER_HOST=127.0.0.1
PUSHER_PORT=6001
PUSHER_SCHEME=http
PUSHER_APP_CLUSTER=mt1

# WebSocket Port (for self-hosted WebSocket server)
WEBSOCKET_PORT=6001

# Mail Configuration (if needed)
MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-email@yourdomain.com
MAIL_PASSWORD=your-email-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="${APP_NAME}"
```

## Step 3: Generate Application Key

```bash
php artisan key:generate
```

## Step 4: Install Dependencies

```bash
# Install PHP dependencies
composer install --optimize-autoloader --no-dev

# Install Node.js dependencies
npm install

# Build frontend assets
npm run build
```

## Step 5: Database Setup

1. Create database:
   ```sql
   CREATE DATABASE your_database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Run migrations:
   ```bash
   php artisan migrate --force
   ```

3. (Optional) Seed database:
   ```bash
   php artisan db:seed
   ```

## Step 6: Storage Link

```bash
php artisan storage:link
```

## Step 7: Configure Web Server

### Apache Configuration

Create or edit `.htaccess` in the public directory:

```apache
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    # Handle Authorization Header
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Redirect Trailing Slashes If Not A Folder...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    # Send Requests To Front Controller...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>
```

Virtual Host Configuration:

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com
    
    DocumentRoot /path/to/your/project/public
    
    <Directory /path/to/your/project/public>
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/yourdomain-error.log
    CustomLog ${APACHE_LOG_DIR}/yourdomain-access.log combined
</VirtualHost>
```

### Nginx Configuration

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    root /path/to/your/project/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

## Step 8: Configure SSL (HTTPS)

1. Install SSL certificate (Let's Encrypt recommended):
   ```bash
   certbot --apache -d yourdomain.com -d www.yourdomain.com
   # or for Nginx:
   certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

2. Update `.env`:
   ```env
   APP_URL=https://yourdomain.com
   SESSION_SECURE=true
   ```

3. Update `config/session.php`:
   ```php
   'secure' => env('SESSION_SECURE', true),
   ```

## Step 9: Set Up WebSocket Server

1. Install PM2 (process manager):
   ```bash
   npm install -g pm2
   ```

2. Start WebSocket server:
   ```bash
   cd /path/to/your/project
   pm2 start websocket-server.cjs --name websocket-server
   pm2 save
   pm2 startup
   ```

3. Or use systemd (see `PRODUCTION_WEBSOCKET_SETUP.md` for details)

## Step 10: Configure CORS and Sanctum

1. Update `config/cors.php`:
   ```php
   'paths' => ['api/*', 'sanctum/csrf-cookie'],
   'allowed_origins' => ['https://yourdomain.com'],
   'allowed_origins_patterns' => [],
   'allowed_headers' => ['*'],
   'exposed_headers' => [],
   'max_age' => 0,
   'supports_credentials' => true,
   ```

2. Update `config/sanctum.php`:
   ```php
   'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
       '%s%s',
       'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1',
       env('APP_URL') ? ','.parse_url(env('APP_URL'), PHP_URL_HOST) : ''
   ))),
   ```

## Step 11: Update Frontend Configuration

1. Update `resources/js/bootstrap.js` if needed:
   - WebSocket host should use your domain
   - Or keep `127.0.0.1:6001` if WebSocket server is on same server

2. Rebuild assets:
   ```bash
   npm run build
   ```

## Step 12: Set Permissions

```bash
# Storage and cache directories
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# Application files
chmod -R 755 .
chown -R www-data:www-data .
```

## Step 13: Optimize Application

```bash
# Cache configuration
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Optimize autoloader
composer install --optimize-autoloader --no-dev
```

## Step 14: Test Installation

1. Visit `https://yourdomain.com`
2. Create an account or login
3. Create a room
4. Join the virtual office
5. Test WebSocket connection (check browser console)
6. Test audio/video functionality

## Troubleshooting

### "Unauthenticated" Error

1. Check `SESSION_DOMAIN` in `.env` matches your domain
2. Check `SANCTUM_STATEFUL_DOMAINS` includes your domain
3. Ensure cookies are being set (check browser DevTools)
4. Verify `APP_URL` matches your actual domain
5. Check CORS configuration
6. Ensure `SESSION_SECURE=true` only if using HTTPS

### WebSocket Connection Issues

1. Check WebSocket server is running:
   ```bash
   pm2 list
   ```

2. Check firewall allows port 6001:
   ```bash
   sudo ufw allow 6001
   ```

3. Update `resources/js/bootstrap.js` with correct WebSocket host

### "Go Back to Rooms" Button Not Working

- Ensure `/rooms` route exists and is accessible
- Check browser console for JavaScript errors
- Verify user is authenticated

## Security Checklist

- [ ] `APP_DEBUG=false` in production
- [ ] Strong database passwords
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] File permissions set correctly
- [ ] `.env` file not publicly accessible
- [ ] Regular backups configured
- [ ] WebSocket server secured (if exposed)

## Maintenance

1. **Regular Updates:**
   ```bash
   composer update
   npm update
   npm run build
   php artisan migrate
   ```

2. **Clear Caches:**
   ```bash
   php artisan cache:clear
   php artisan config:clear
   php artisan route:clear
   php artisan view:clear
   ```

3. **Monitor Logs:**
   ```bash
   tail -f storage/logs/laravel.log
   pm2 logs websocket-server
   ```

## Support

For issues, check:
- `storage/logs/laravel.log` for application errors
- Browser console for JavaScript errors
- WebSocket server logs for connection issues
- `PRODUCTION_WEBSOCKET_SETUP.md` for WebSocket server details

