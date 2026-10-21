import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

// Initialize the database pool using environment variables.
// Per SaaS rules: No hardcoded fallback credentials are allowed here.
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  max: 5,

  // ✅ SSL ADDED: AWS RDS strictly requires encrypted connections
  ssl: {
    rejectUnauthorized: false
  },
  
  // ✅ Stability settings to prevent timeouts on big AI requests
  connectionTimeoutMillis: 15000, 
  idleTimeoutMillis: 30000,       
  keepAlive: true                
});

// Handle unexpected errors on idle clients
pool.on('error', (err) => {
  console.error('🚨 Unexpected DB error:', err);
});

// ✅ SAAS MULTI-TENANCY IMPLEMENTATION
// The header where the Express middleware or reverse proxy sets the resolved school ID
const TENANT_HEADER = "x-saraswati-tenant-id";

/**
 * Binds the PostgreSQL connection session to a specific school (tenant).
 * This function enforces Row-Level Security (RLS) so queries only see one school's data.
 * 
 * @param {PoolClient} client - The active database client
 * @param {Request} req - The Express request object containing the tenant header
 */
async function bindTenant(client, req) {
  const tenantId = req.headers[TENANT_HEADER];
  
  // Fail closed: If no school is resolved, block database access
  if (!tenantId) {
    throw new Error("School was not resolved for this request. Missing tenant ID.");
  }
  
  // Start a transaction so the tenant context stays isolated to this request
  await client.query("BEGIN");
  
  // Apply RLS setting for this specific transaction ('true' means transaction-local)
  await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
}

/**
 * Main wrapper for executing tenant-isolated database queries.
 * Use this in your controllers instead of calling pool.query() directly.
 * 
 * @example
 * // Inside a controller:
 * const users = await withClient(req, async (client) => {
 *   const res = await client.query('SELECT * FROM users_masters');
 *   return res.rows;
 * });
 * 
 * @param {Request} req - The Express request object
 * @param {Function} callback - The function containing your actual SQL queries
 */
export async function withClient(req, callback) {
  const client = await pool.connect();
  try {
    // 1. Inject the tenant context into the PostgreSQL session
    await bindTenant(client, req);
    
    // 2. Execute the controller's specific database logic
    const result = await callback(client);
    
    // 3. Commit the transaction if successful
    await client.query("COMMIT");
    return result;
    
  } catch (error) {
    // Rollback the transaction on any failure
    await client.query("ROLLBACK");
    throw error;
  } finally {
    // Always release the connection back to the pool
    client.release();
  }
}

// Export the raw pool only for server startup checks, use withClient for actual API queries
export default pool;