1. Copy the stripe secret key to .env.local locally and convex environment environment
2. npm install stripe
3. Create a stripe.ts inside the convex folder (because convex need to access it, only files inside the convex folder are the only files runs on the convex servers)
4. To implement the payment, we need to update schema, aka add subscriptions and purchases tables
