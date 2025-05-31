const config = {
    development: {
      port: process.env.PORT || 8080,
      cors: {
        origin: '*',
        credentials: true
      },
      websocket: {
        maxConnections: 100,
        heartbeatInterval: 30000
      }
    },
    production: {
      port: process.env.PORT || 8080,
      cors: {
        origin: process.env.CORS_ORIGIN || 'https://yourdomain.com',
        credentials: true
      },
      websocket: {
        maxConnections: 500,
        heartbeatInterval: 30000
      }
    }
  };
  
  module.exports = config[process.env.NODE_ENV || 'development'];