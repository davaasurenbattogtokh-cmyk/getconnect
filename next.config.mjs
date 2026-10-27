/** @type {import('next').NextConfig} */
const config={
 poweredByHeader:false,
 serverExternalPackages:['mysql2'],
 // Keep build concurrency within managed hosting process limits.
 experimental:{cpus:2},
};
export default config;
