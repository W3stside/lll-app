/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [{
            protocol: 'https',
            hostname: 'mcvuagpkcgjesgzmheac.supabase.co',
            port: '',
            pathname: '/**'
        }]
    }
};

module.exports = nextConfig;
