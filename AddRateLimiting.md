# Rate Limiting with Upstash Redis

## Quick Setup

### 1. Create Upstash Database

- Login to [Upstash Console](https://console.upstash.com/redis?teamid=0)
- Create new Redis database
- Copy REST keys (URL and Token)

### 2. Environment Variables

Add to `.env.local` and Convex dashboard:

```bash
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### 3. Install Dependencies

```bash
npm install @upstash/ratelimit @upstash/redis
```

## Implementation

### Step 1: Redis Client

**File:** `convex/redis.ts`

```typescript
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
```

### Step 2: Rate Limiter

**File:** `convex/ratelimit.ts`

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

export const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(3, "60 s"), // 3 requests per 60 seconds
});
```

### Step 3: Use in Functions

**File:** `convex/stripe.ts`

```typescript
import { ratelimit } from "./ratelimit";

export const createCheckoutSession = action({
  handler: async (ctx, args) => {
    // ... authentication ...

    // Rate limiting
    const rateLimitKey = `checkout-rate-limit:${user._id}`;
    const { success, reset } = await ratelimit.limit(rateLimitKey);

    if (!success) {
      throw new ConvexError(
        `Rate limit exceeded. Try again in ${reset} seconds.`
      );
    }

    // ... rest of function ...
  },
});
```

## Configuration

| Setting           | Value                           | Description            |
| ----------------- | ------------------------------- | ---------------------- |
| **Rate Limit**    | 3 requests per 60 seconds       | Per user limit         |
| **Key Pattern**   | `checkout-rate-limit:${userId}` | Unique per user        |
| **Error Message** | Includes reset time             | User-friendly feedback |

## Benefits

- 🛡️ **Prevents spam attacks** on checkout
- 🔒 **Protects Stripe API** from abuse
- 👤 **User-specific** rate limiting
- ⏰ **Automatic reset** after time window
- 📊 **Real-time monitoring** via Upstash dashboard

## Troubleshooting

### Common Issues

- **Rate limit too strict**: Adjust `3, "60 s"` to higher values
- **Redis connection failed**: Check environment variables
- **Key conflicts**: Use unique key patterns per feature

### Testing

```typescript
// Test rate limiting
const { success, reset } = await ratelimit.limit("test-key");
console.log(success, reset);
```
