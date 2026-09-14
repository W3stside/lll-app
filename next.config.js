/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [{
            protocol: 'https',
            hostname: '*.supabase.co',
            port: '',
            pathname: '/**'
        }]
    },
    async headers() {
        return [
            {
                // Browsers must always re-check the service worker, otherwise a
                // cached copy can pin users to old notification logic
                source: '/sw.js',
                headers: [
                    { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
                    { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
