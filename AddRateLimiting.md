# Rate Limiting with Upstash Redis

## Setup

1. Login to https://console.upstash.com/redis?teamid=0

2. Create a new Redis database

3. Get your REST keys (URL and Token)

4. Add REST keys to `.env.local` and Convex dashboard:

```bash
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

5. Install dependencies:

```bash
npm install @upstash/ratelimit @upstash/redis
```

## Implementation

### 1. Create Redis client (`convex/redis.ts`):

```typescript
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
```

### 2. Create Rate Limiter (`convex/ratelimit.ts`):

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

export const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(3, "60 s"), // 3 requests per 60 seconds
});
```

### 3. Use Rate Limiting in your functions (`convex/stripe.ts`):

```typescript
import { ratelimit } from "./ratelimit";

export const createCheckoutSession = action({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args): Promise<{ checkoutUrl: string | null }> => {
    // ... authentication and user lookup ...

    // Rate limiting implementation
    const rateLimitKey = `checkout-rate-limit:${user._id}`;
    const { success, reset } = await ratelimit.limit(rateLimitKey);

    if (!success) {
      throw new ConvexError(
        `Rate limit exceeded. Try again in ${reset} seconds.`
      );
    }

    // ... rest of your function logic ...
  },
});
```

## Configuration

- **Rate Limit**: 3 requests per 60 seconds per user
- **Key Pattern**: `checkout-rate-limit:${userId}`
- **Error Message**: Includes reset time in seconds

## Benefits

- Prevents spam attacks on checkout
- Protects Stripe API from abuse
- User-specific rate limiting
- Automatic reset after time window
