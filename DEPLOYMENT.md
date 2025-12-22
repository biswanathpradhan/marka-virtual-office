# Deployment Guide

## Production Deployment

### Prerequisites
- Node.js 16+ installed
- MongoDB installed and running
- Domain name (for HTTPS)
- SSL certificate

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Client URL (your domain)
CLIENT_URL=https://yourdomain.com

# MongoDB
MONGODB_URI=mongodb://localhost:27017/virtual-office
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/virtual-office

# JWT Secret (GENERATE A STRONG RANDOM STRING!)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRE=7d

# File Upload
MAX_FILE_SIZE=26214400
UPLOAD_DIR=./server/uploads
```

### Security Checklist

1. **Change JWT Secret**: Generate a strong random string (minimum 32 characters)
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Enable HTTPS**: Use a reverse proxy (nginx) with SSL certificate

3. **Firewall**: Only expose necessary ports (80, 443)

4. **Database Security**: 
   - Use MongoDB authentication
   - Restrict database access to application server only
   - Use MongoDB Atlas for cloud deployment

5. **Rate Limiting**: Already configured, but adjust as needed

6. **CORS**: Update `CLIENT_URL` to your production domain

### Build Steps

1. **Install Dependencies**
   ```bash
   npm run install-all
   ```

2. **Build React App**
   ```bash
   npm run build
   ```

3. **Start Server** (using PM2)
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
    }

    # Static files
    location / {
        root /path/to/node-office/client/build;
        try_files $uri $uri/ /index.html;
    }

    # File uploads
    client_max_body_size 25M;
}
```

### iframe Integration

To embed the Virtual Office in your existing application:

```html
<iframe 
  src="https://yourdomain.com" 
  width="100%" 
  height="800px"
  allow="camera; microphone; fullscreen"
  frameborder="0"
  style="border: none;">
</iframe>
```

Or use the iframe wrapper:

```html
<iframe 
  src="https://yourdomain.com/iframe.html" 
  width="100%" 
  height="800px"
  allow="camera; microphone; fullscreen"
  frameborder="0">
</iframe>
```

### Docker Deployment (Optional)

Create `Dockerfile`:

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN cd client && npm install && npm run build

EXPOSE 5000

CMD ["node", "server/index.js"]
```

Build and run:

```bash
docker build -t virtual-office .
docker run -p 5000:5000 --env-file .env virtual-office
```

### Monitoring

- Use PM2 monitoring: `pm2 monit`
- Set up logging: `pm2 logs virtual-office`
- Monitor MongoDB: Use MongoDB Compass or Atlas dashboard
- Set up error tracking: Consider Sentry or similar

### Backup Strategy

1. **Database Backup**: Regular MongoDB backups
   ```bash
   mongodump --uri="mongodb://localhost:27017/virtual-office" --out=/backup/path
   ```

2. **File Uploads**: Backup `server/uploads` directory

3. **Automated Backups**: Set up cron jobs for regular backups

### Scaling

For high traffic:

1. **Load Balancing**: Use nginx as load balancer
2. **Multiple Instances**: Run multiple Node.js instances with PM2 cluster mode
3. **Redis**: Use Redis for Socket.io adapter (for multiple servers)
4. **CDN**: Serve static files via CDN
5. **Database**: Use MongoDB replica set or sharding

### Troubleshooting

- **Port already in use**: Change PORT in .env
- **MongoDB connection error**: Check MONGODB_URI and MongoDB service
- **CORS errors**: Update CLIENT_URL in .env
- **File upload fails**: Check uploads directory permissions
- **WebRTC not working**: Ensure HTTPS is enabled (required for WebRTC)

