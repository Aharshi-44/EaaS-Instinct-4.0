import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const authLoginTotal = new client.Counter({
  name: 'auth_login_total',
  help: 'Total number of login attempts',
  labelNames: ['provider', 'status'],
});

export const authSignupTotal = new client.Counter({
  name: 'auth_signup_total',
  help: 'Total number of signup attempts',
  labelNames: ['provider', 'status'],
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(authLoginTotal);
register.registerMetric(authSignupTotal);

export { register };
