# Storage Setup Instructions

To enable image uploads for user profiles, you need to create a symbolic link:

```bash
php artisan storage:link
```

This creates a link from `public/storage` to `storage/app/public`, allowing uploaded images to be accessible via the web.

After running this command, uploaded avatars will be accessible at `/storage/avatars/filename.jpg`

