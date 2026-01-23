module.exports = {
  apps: [
    {
      name: 'workplan-backend',
      script: 'server.js',
      cwd: './backend',
      instances: 'max', // หรือระบุจำนวน เช่น 2
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3109
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3109,
        DB_HOST: process.env.DB_HOST,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_NAME: process.env.DB_NAME,
        DB_PORT: Number(process.env.DB_PORT || 3306),
        API_RATE_LIMIT: Number(process.env.API_RATE_LIMIT || 100),
        PRODUCTION_HOST: process.env.PRODUCTION_HOST,
        CORS_ORIGINS: process.env.CORS_ORIGINS
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024'
    },
    {
      name: 'workplan-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      env: {
        NODE_ENV: 'development',
        PORT: 3019
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.FRONTEND_PORT || 3019,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || 'production',
        NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
      },
      error_file: './logs/frontend-err.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      max_memory_restart: '1G'
    }
  ],

  deploy: {
    production: {
      user: 'your-username',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'https://github.com/iTjitdhana/WorkplanV5.git',
      path: '/var/www/workplan',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
}; 