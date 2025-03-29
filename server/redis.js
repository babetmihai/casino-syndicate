const redis = require("redis")

const redisClient = redis.createClient({
  // Default configuration - update if your Redis is hosted elsewhere
  host: "localhost",
  port: 6379
  // If you have authentication:
  // password: 'your_password'
})