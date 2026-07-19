import { config } from "dotenv";

// Loads .env.local (same file Next.js reads) so integration tests can reach
// a real Supabase project without duplicating credentials.
config({ path: ".env.local" });
