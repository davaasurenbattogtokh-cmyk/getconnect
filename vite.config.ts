import vinext from 'vinext';
import {cloudflare} from '@cloudflare/vite-plugin';
import {defineConfig} from 'vite';

// Local development bindings only. Production uses the resources provided to
// scripts/prepare-cloudflare-deploy.mjs; this is not a production database ID.
export default defineConfig({
  plugins:[
    vinext(),
    cloudflare({
      viteEnvironment:{name:'rsc',childEnvironments:['ssr']},
      inspectorPort:false,
      config:{
        name:'getconnect-business',
        main:'./worker/index.ts',
        compatibility_date:'2026-05-15',
        compatibility_flags:['nodejs_compat'],
        d1_databases:[{binding:'DB',database_name:'getconnect-business-local',database_id:'00000000-0000-4000-8000-000000000000'}],
        r2_buckets:[{binding:'BUCKET',bucket_name:'getconnect-business-logos-local'}],
      },
    }),
  ],
});
