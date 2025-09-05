export const productionConfig = {
  port: process.env.PORT || 3001,
  nodeEnv: 'production',
  cors: {
    origin: [
      'https://network-crm-frontend.vercel.app',
      'https://network-crm.vercel.app',
      'https://your-custom-domain.com' // Update with your domain
    ],
    credentials: true
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }
};