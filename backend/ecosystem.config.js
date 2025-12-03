module.exports = {
    apps: [
        {
            name: 'pdv-master-backend',
            script: 'dist/server.js',
            instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
            exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',

            // Environment variables
            env: {
                NODE_ENV: 'development',
                PORT: 3001,
                LOG_LEVEL: 'debug'
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3001,
                LOG_LEVEL: 'info'
            },

            // Logging
            log_file: './logs/combined.log',
            out_file: './logs/out.log',
            error_file: './logs/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,

            // Process management
            max_memory_restart: '1G',
            autorestart: true,
            restart_delay: 4000,
            max_restarts: 10,

            // Time management
            timezone: 'America/Sao_Paulo',

            // Environment file
            env_file: '.env',

            // Watch for development
            watch: process.env.NODE_ENV !== 'production' ? ['src'] : false,
            ignore_watch: [
                'node_modules',
                'logs',
                'uploads',
                '*.log'
            ],

            // Reload management
            reload_timeout: 10000,

            // Health check
            health_check: {
                enabled: true,
                url: 'http://localhost:3001/health',
                timeout: 3000
            }
        },
        {
            name: 'pdv-master-dev',
            script: 'src/server.ts',
            interpreter: 'tsx',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'development',
                PORT: 3001,
                LOG_LEVEL: 'debug'
            },

            // Development specific settings
            watch: ['src'],
            ignore_watch: [
                'node_modules',
                'logs',
                '*.log',
                'uploads'
            ],

            // Environment file
            env_file: '.env',

            // Logging
            log_file: './logs/dev.log',
            out_file: './logs/dev-out.log',
            error_file: './logs/dev-error.log',

            // Process management
            autorestart: true,
            max_memory_restart: '500M',
        }
    ],

    deploy: {
        production: {
            user: 'node',
            host: 'your-server.com',
            ref: 'origin/main',
            repo: 'git@github.com:your-organization/pdv-master.git',
            path: '/home/node/apps/pdv-master-backend',
            'pre-deploy-local': '',
            'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
            'pre-setup': '',
            env: {
                NODE_ENV: 'production'
            }
        }
    }
};
