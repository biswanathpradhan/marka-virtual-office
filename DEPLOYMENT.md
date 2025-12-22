# Deployment Guide

## Production Deployment

### Prerequisites
- Node.js 16+ installed
- MySQL 8.0+ installed and running
- Domain name (for HTTPS)
- SSL certificate
- PM2 (for process management)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Client URL (your domain)
CLIENT_URL=https://yourdomain.com

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=node-office

# JWT Secret (GENERATE A STRONG RANDOM STRING!)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRE=7d

# File Upload
MAX_FILE_SIZE=26214400
UPLOAD_DIR=./server/uploads

# Call Recordings Directory
RECORDINGS_DIR=./server/recordings
```

### Initial Setup

1. **Install Dependencies**
   ```bash
   npm run install-all
   ```

2. **Configure MySQL**
   - Ensure MySQL is running
   - Create database user (if not using root):
     ```sql
     CREATE USER 'nodeoffice'@'localhost' IDENTIFIED BY 'your_password';
     GRANT ALL PRIVILEGES ON node_office.* TO 'nodeoffice'@'localhost';
     FLUSH PRIVILEGES;
     ```

3. **Run Database Migrations**
   ```bash
   npm run migrate
   ```
   
   This will:
   - Create the `node-office` database if it doesn't exist
   - Create all required tables (users, rooms, messages, etc.)
   - Create the super admin account:
     - **Email**: `admin@virtualoffice.com`
     - **Password**: `Admin@123`
     - **⚠️ IMPORTANT**: Change this password immediately after first login!

4. **Create Required Directories**
   ```bash
   mkdir -p server/uploads
   mkdir -p server/recordings
   chmod 755 server/uploads server/recordings
   ```

### Security Checklist

1. **Change JWT Secret**: Generate a strong random string (minimum 32 characters)
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Change Super Admin Password**: Login and change password immediately
   - Login: `admin@virtualoffice.com` / `Admin@123`
   - Go to Profile → Change Password

3. **MySQL Security**:
   - Use a strong password for MySQL root user
   - Create a dedicated database user (not root)
   - Restrict database access to application server only
   - Enable MySQL SSL connections for remote access

4. **Enable HTTPS**: Use a reverse proxy (nginx) with SSL certificate

5. **Firewall**: Only expose necessary ports (80, 443)

6. **Rate Limiting**: Already configured, but adjust as needed

7. **CORS**: Update `CLIENT_URL` to your production domain

8. **File Permissions**: Ensure upload and recording directories have proper permissions

### Build Steps

1. **Install Dependencies**
   ```bash
   npm run install-all
   ```

2. **Run Migrations** (if not done already)
   ```bash
   npm run migrate
   ```

3. **Build React App**
   ```bash
   npm run build
   ```

4. **Start Server** (using PM2)
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name virtual-office
   pm2 save
   pm2 startup
   ```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Increase timeouts for WebRTC
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;

    # API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }

    # Socket.io proxy
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Static files
    location / {
        root /path/to/node-office/client/build;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # File uploads and recordings
    client_max_body_size 25M;
    
    # Serve recordings (protected - add authentication if needed)
    location /recordings {
        alias /path/to/node-office/server/recordings;
        add_header Content-Disposition "attachment";
    }
}
```

### iframe Integration

To embed the Virtual Office in your existing application:

```html
<iframe 
  src="https://yourdomain.com" 
  width="100%" 
  height="800px"
  allow="camera; microphone; fullscreen; autoplay"
  frameborder="0"
  style="border: none;">
</iframe>
```

**Important**: Ensure your parent application allows iframe embedding by setting proper CSP headers.

### Docker Deployment (Optional)

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install MySQL client (optional, for debugging)
RUN apk add --no-cache mysql-client

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd client && npm install

# Copy application files
COPY . .

# Build React app
RUN cd client && npm run build

# Create directories
RUN mkdir -p server/uploads server/recordings

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/auth/me', (r) => {process.exit(r.statusCode === 401 ? 0 : 1)})"

# Start server
CMD ["node", "server/index.js"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - DB_HOST=db
      - DB_PORT=3306
      - DB_USER=nodeoffice
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=node-office
      - JWT_SECRET=${JWT_SECRET}
      - CLIENT_URL=${CLIENT_URL}
    volumes:
      - ./server/uploads:/app/server/uploads
      - ./server/recordings:/app/server/recordings
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=node-office
      - MYSQL_USER=nodeoffice
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./server/migrations:/docker-entrypoint-initdb.d
    ports:
      - "3306:3306"
    restart: unless-stopped
    command: --default-authentication-plugin=mysql_native_password

volumes:
  mysql_data:
```

Build and run:

```bash
docker-compose up -d
```

### Database Migrations

**Run Migrations**:
```bash
npm run migrate
```

**Rollback Migrations** (if needed):
```bash
npm run migrate:rollback
```

**Migration Files**:
- `001_create_users_table.js` - Creates users table
- `002_create_rooms_table.js` - Creates rooms table
- `003_create_room_participants_table.js` - Creates room participants table
- `004_create_messages_table.js` - Creates messages table
- `005_create_calls_table.js` - Creates calls table
- `006_create_call_participants_table.js` - Creates call participants table
- `007_create_room_invitations_table.js` - Creates room invitations table and super admin user
- `008_create_call_recordings_table.js` - Creates call recordings table
- `009_add_soft_delete_to_rooms.js` - Adds soft delete support to rooms

### Super Admin Account

After running migrations, the super admin account is automatically created:

- **Email**: `admin@virtualoffice.com`
- **Password**: `Admin@123`
- **Role**: `superadmin`

**⚠️ CRITICAL**: Change this password immediately after first login!

### User Management

**Super Admin Capabilities**:
- Create and delete all rooms
- Remove any user (hard delete - user cannot login after)
- View all chat messages (including deleted rooms)
- View all shared files
- Invite new users
- Manage room invitations

**Regular User Capabilities**:
- View only rooms they're invited to or created
- Create new rooms
- Delete their own rooms (soft delete)
- Change password in profile
- Update profile information

### Monitoring

1. **PM2 Monitoring**:
   ```bash
   pm2 monit
   pm2 logs virtual-office
   pm2 status
   ```

2. **MySQL Monitoring**:
   ```bash
   mysql -u root -p -e "SHOW PROCESSLIST;"
   mysql -u root -p -e "SHOW TABLE STATUS FROM \`node-office\`;"
   ```

3. **Disk Space** (for uploads and recordings):
   ```bash
   du -sh server/uploads server/recordings
   ```

4. **Error Tracking**: Consider Sentry or similar for production error tracking

### Backup Strategy

1. **Database Backup**:
   ```bash
   # Full backup
   mysqldump -u root -p node-office > backup_$(date +%Y%m%d_%H%M%S).sql
   
   # Automated daily backup (add to crontab)
   0 2 * * * mysqldump -u root -p'password' node-office | gzip > /backups/node-office_$(date +\%Y\%m\%d).sql.gz
   ```

2. **File Uploads Backup**:
   ```bash
   tar -czf uploads_backup_$(date +%Y%m%d).tar.gz server/uploads/
   ```

3. **Call Recordings Backup**:
   ```bash
   tar -czf recordings_backup_$(date +%Y%m%d).tar.gz server/recordings/
   ```

4. **Automated Backup Script** (create `backup.sh`):
   ```bash
   #!/bin/bash
   BACKUP_DIR="/backups/node-office"
   DATE=$(date +%Y%m%d_%H%M%S)
   
   mkdir -p $BACKUP_DIR
   
   # Database backup
   mysqldump -u root -p'password' node-office | gzip > $BACKUP_DIR/db_$DATE.sql.gz
   
   # Files backup
   tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz server/uploads/
   tar -czf $BACKUP_DIR/recordings_$DATE.tar.gz server/recordings/
   
   # Keep only last 30 days
   find $BACKUP_DIR -type f -mtime +30 -delete
   ```

### Scaling

For high traffic:

1. **Load Balancing**: Use nginx as load balancer
2. **Multiple Instances**: Run multiple Node.js instances with PM2 cluster mode
   ```bash
   pm2 start server/index.js -i max --name virtual-office
   ```
3. **Redis**: Use Redis for Socket.io adapter (for multiple servers)
   ```bash
   npm install @socket.io/redis-adapter redis
   ```
4. **CDN**: Serve static files via CDN
5. **Database**: Use MySQL replication or read replicas
6. **File Storage**: Consider cloud storage (S3, Azure Blob) for uploads and recordings

### Performance Optimization

1. **MySQL Optimization**:
   - Enable query cache
   - Optimize indexes
   - Use connection pooling (already implemented)

2. **Node.js Optimization**:
   - Use PM2 cluster mode
   - Enable gzip compression (already implemented)
   - Cache static assets

3. **WebRTC Optimization**:
   - Use TURN servers for NAT traversal
   - Configure STUN servers properly
   - Monitor bandwidth usage

### Troubleshooting

**Common Issues**:

1. **Port already in use**: Change PORT in .env
   ```bash
   lsof -i :5000
   kill -9 <PID>
   ```

2. **MySQL connection error**: 
   - Check MySQL service: `systemctl status mysql`
   - Verify credentials in .env
   - Check MySQL user permissions

3. **Migration errors**:
   - Check MySQL version (8.0+ required)
   - Verify database user has CREATE privileges
   - Check migration logs

4. **CORS errors**: Update CLIENT_URL in .env

5. **File upload fails**: 
   - Check uploads directory permissions: `chmod 755 server/uploads`
   - Verify disk space: `df -h`
   - Check MAX_FILE_SIZE in .env

6. **WebRTC not working**: 
   - Ensure HTTPS is enabled (required for WebRTC)
   - Check browser console for errors
   - Verify STUN/TURN server configuration

7. **Socket.io connection issues**:
   - Check nginx proxy configuration
   - Verify WebSocket upgrade headers
   - Check firewall rules

8. **Call recordings not saving**:
   - Check recordings directory exists: `mkdir -p server/recordings`
   - Verify directory permissions: `chmod 755 server/recordings`
   - Check disk space

### Security Hardening

1. **MySQL**:
   ```sql
   -- Remove anonymous users
   DELETE FROM mysql.user WHERE User='';
   
   -- Remove remote root access
   DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
   
   -- Flush privileges
   FLUSH PRIVILEGES;
   ```

2. **File Permissions**:
   ```bash
   chmod 600 .env
   chmod 755 server/uploads server/recordings
   ```

3. **Firewall** (UFW example):
   ```bash
   ufw allow 22/tcp
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```

4. **Fail2Ban** (for SSH protection):
   ```bash
   apt-get install fail2ban
   ```

### Post-Deployment Checklist

- [ ] Changed super admin password
- [ ] Changed JWT_SECRET
- [ ] Updated CLIENT_URL to production domain
- [ ] Enabled HTTPS with valid SSL certificate
- [ ] Configured nginx reverse proxy
- [ ] Set up automated database backups
- [ ] Configured file upload/recording directories
- [ ] Tested user registration (invitation system)
- [ ] Tested room creation and deletion
- [ ] Tested video/audio calls
- [ ] Tested file uploads
- [ ] Tested call recording
- [ ] Verified WebRTC works over HTTPS
- [ ] Set up monitoring and logging
- [ ] Configured firewall rules
- [ ] Tested iframe integration (if applicable)

### Support

For issues or questions:
1. Check server logs: `pm2 logs virtual-office`
2. Check MySQL logs: `/var/log/mysql/error.log`
3. Check nginx logs: `/var/log/nginx/error.log`
4. Review browser console for client-side errors
