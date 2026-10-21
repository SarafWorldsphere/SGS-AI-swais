// ✅ 1. Import withClient instead of the raw pool
import { withClient } from "../config/db.js";

// ✅ 2. Added 'req' as the first parameter so withClient can resolve the tenant
export const logAIUsage = async (req, userInfo = {}, moduleName, featureName, usageMetadata = {}) => {
    // Get User Email and Name safely
    const email = userInfo.email || 'unknown@user.local';
    const name = userInfo.name || 'System User';
    
    // ✅ 3. Removed hardcoded 'SGS' default fallback
    const clientName = process.env.CLIENT_NAME || 'School'; 

    // Extract Tokens safely from Gemini's response object
    const promptTokens = usageMetadata?.promptTokenCount || 0;
    const completionTokens = usageMetadata?.candidatesTokenCount || 0;
    const totalTokens = usageMetadata?.totalTokenCount || (promptTokens + completionTokens);

    // Generate exact IST Time & Date
    const istTime = new Date().toLocaleString("en-US", { 
        timeZone: "Asia/Kolkata",
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    try {
        // ✅ 4. Wrap the insert in withClient and remove the sgs_ prefix
        await withClient(req, async (client) => {
            await client.query(
                `INSERT INTO ai_usage_logs 
                (client_name, user_email, module_name, feature_used, prompt_tokens, completion_tokens, total_tokens, created_at_ist) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [clientName, email, moduleName, featureName, promptTokens, completionTokens, totalTokens, istTime]
            );
        });
    } catch (err) {
        console.error("🚨 Failed to log AI usage to database:", err.message);
    }
};