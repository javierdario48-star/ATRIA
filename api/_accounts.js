import {getCache} from '@vercel/functions';
import {createV5QaSocialServer} from '../src/v5/social/room-membership-store.js';
import {createSupabaseAccountStore,createPersistentSocialStorage} from '../src/v5/server/supabase-account-store.js';
import {createAccountGateway} from '../src/v5/server/account-gateway.js';

const cache=getCache(undefined,'atria-social-qa-v1',':');
// Existing Preview-only gate: stable V4 and the main deployment keep their
// original transport and cannot claim identities through experimental code.
export const accountsEnabled=process.env.VERCEL_ENV==='preview'&&process.env.ATRIA_DURABLE_COOP_ENABLED==='1'&&!!process.env.SUPABASE_URL&&!!process.env.SUPABASE_SECRET_KEY;
export const accountBackend=accountsEnabled?createSupabaseAccountStore({url:process.env.SUPABASE_URL,secretKey:process.env.SUPABASE_SECRET_KEY}):null;
const storage=accountBackend?createPersistentSocialStorage({backend:accountBackend,cache}):cache;
const legacy=createV5QaSocialServer(storage);
export const socialService=accountBackend?createAccountGateway({backend:accountBackend,legacy,storage}):legacy;
export const accountGateway=accountBackend?socialService:null;
