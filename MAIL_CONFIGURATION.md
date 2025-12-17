# Mail Configuration for Invite Feature

## Add these settings to your `.env` file:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=salonplusdev@gmail.com
MAIL_PASSWORD=yalqyaxxsjzkrfni
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@garaageplus.com
MAIL_FROM_NAME=RedFox
```

## Steps to Configure:

1. Open your `.env` file in the root directory of the project
2. Add or update the mail configuration settings above
3. Save the file
4. **Restart your Laravel server** for the changes to take effect

## Testing the Invite Feature:

1. Log in to the application
2. Join a virtual office room
3. Click the "Invite" button (or use the invite icon)
4. Enter an email address
5. Click "Send Invite"
6. The recipient will receive an email with a link to join the room

## Troubleshooting:

- **Email not sending?** Check that:
  - The mail settings in `.env` are correct
  - The server has been restarted after updating `.env`
  - Gmail allows "less secure apps" or you're using an App Password
  - Check `storage/logs/laravel.log` for error messages

- **Gmail App Password:**
  - If using Gmail, you may need to generate an App Password instead of your regular password
  - Go to Google Account → Security → 2-Step Verification → App Passwords
  - Use the generated App Password in `MAIL_PASSWORD`

## Note:

The invite link will direct users to `/virtual-office/{room_id}`. Users will need to be logged in to access the room.

