# chat-serve

Server-only backend starter for a dating/chat app using Next.js 15 route handlers and Supabase.

## Setup

1. Copy `.env.example` to `.env.local` and fill in Supabase keys.
2. Run the migration in `supabase/migrations/0001_init.sql` using the Supabase SQL editor or CLI.
3. Create storage buckets `avatars` (public) and `media` (private) in Supabase.
4. Install dependencies and run the dev server:

```bash
pnpm install
pnpm dev
```

## API usage
All endpoints accept/return JSON. Authenticate using the `Authorization: Bearer <token>` header.

### Signup
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"an38570@gmail.com","password":"password"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"an38570@gmail.com","password":"password"}'
```

### Get profile
```bash
curl -H 'Authorization: Bearer TOKEN' http://localhost:3000/api/profile
```

### Update profile
```bash
curl -X PATCH http://localhost:3000/api/profile \
  -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"display_name":"New Name"}'
```

### List photos
```bash
curl -H 'Authorization: Bearer TOKEN' http://localhost:3000/api/photos
```

### Request signed upload URL
```bash
curl -X POST http://localhost:3000/api/photos \
  -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"contentType":"image/jpeg"}'
```

### Delete photo
```bash
curl -X DELETE 'http://localhost:3000/api/photos?id=PHOTO_ID' \
  -H 'Authorization: Bearer TOKEN'
```

### Feed
```bash
curl -H 'Authorization: Bearer TOKEN' http://localhost:3000/api/feed
```

### Like / Superlike / Pass
```bash
curl -X POST http://localhost:3000/api/like \
  -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"targetId":"TARGET_UUID","type":"like"}'
```

### Matches
```bash
curl -H 'Authorization: Bearer TOKEN' http://localhost:3000/api/matches
```

### List messages
```bash
curl -H 'Authorization: Bearer TOKEN' \
  http://localhost:3000/api/conversations/CONV_ID/messages
```

### Send message
```bash
curl -X POST http://localhost:3000/api/conversations/CONV_ID/messages \
  -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"content":"Hello"}'
```

### Notifications
```bash
curl -H 'Authorization: Bearer TOKEN' http://localhost:3000/api/notifications?unread=1
```

### Mark notifications read
```bash
curl -X PATCH http://localhost:3000/api/notifications \
  -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"ids":["UUID1"],"read":true}'
```

## Deployment
Deploy the Next.js app to Vercel and link it to your Supabase project. Ensure env vars are set in Vercel and run migrations on Supabase before deploying.
