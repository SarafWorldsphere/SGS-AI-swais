// ✅ 1. Import withClient instead of raw pool
import { withClient } from "../config/db.js";
import { logAIUsage } from '../utils/aiTracker.js'; 

// ==========================================
// A. POST A NEW DOUBT (Student Dashboard)
// ==========================================
export const postDoubt = async (req, res) => {
    const { studentId, classLevel, subject, doubtText, imageUrl = null, userInfo } = req.body;

    if (!studentId || !doubtText) return res.status(400).json({ error: "Student ID and Doubt Text are required." });

    try {
        // ✅ 2. Wrap query in withClient and remove sgs_ prefix
        const result = await withClient(req, async (client) => {
            return await client.query(
                `INSERT INTO community_doubts (student_id, class_level, subject, doubt_text, image_url, status, created_at) 
                 VALUES ($1, $2, $3, $4, $5, 'Unresolved', CURRENT_TIMESTAMP) RETURNING doubt_id`,
                [studentId, classLevel, subject, doubtText, imageUrl]
            );
        });

        // Log Feature Usage
        if (userInfo) {
            await logAIUsage(userInfo, "Community Forum", "Post Doubt", null);
        }

        res.json({ message: "Doubt posted successfully to the community!", doubtId: result.rows[0].doubt_id });
    } catch (err) {
        console.error("🚨 POST DOUBT CRASH:", err);
        res.status(500).json({ error: "Failed to post doubt." });
    }
};

// ==========================================
// B. GET ALL DOUBTS (For Students & Teachers to Browse)
// ==========================================
export const getCommunityDoubts = async (req, res) => {
    const { subject, classLevel, status } = req.query; 

    try {
        // ✅ 3. Wrap query in withClient and remove sgs_ prefixes
        const result = await withClient(req, async (client) => {
            let query = `
                SELECT d.doubt_id, d.doubt_text, d.image_url, d.status, d.created_at, 
                       s.full_name as asked_by, d.subject, d.class_level
                FROM community_doubts d
                JOIN student_master s ON d.student_id = s.student_id
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 1;

            if (subject) { query += ` AND d.subject = $${paramCount++}`; params.push(subject); }
            if (classLevel) { query += ` AND d.class_level = $${paramCount++}`; params.push(classLevel); }
            if (status) { query += ` AND d.status = $${paramCount++}`; params.push(status); }

            query += ` ORDER BY d.created_at DESC LIMIT 50`;

            return await client.query(query, params);
        });
        
        res.json({ doubts: result.rows });
    } catch (err) {
        console.error("🚨 GET DOUBTS CRASH:", err);
        res.status(500).json({ error: "Failed to fetch community doubts." });
    }
};

// ==========================================
// C. ANSWER A DOUBT (Teacher or Peer Student)
// ==========================================
export const answerDoubt = async (req, res) => {
    const { doubtId, answeredById, answeredByRole, answerText, userInfo } = req.body;

    if (!doubtId || !answerText || !answeredById) {
        return res.status(400).json({ error: "Missing required fields to answer doubt." });
    }

    try {
        // ✅ 4. Wrap BOTH queries in a single withClient block and remove sgs_ prefixes
        await withClient(req, async (client) => {
            // 1. Insert the answer
            await client.query(
                `INSERT INTO doubt_answers (doubt_id, answered_by_id, role, answer_text, created_at) 
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
                [doubtId, answeredById, answeredByRole, answerText]
            );

            // 2. Mark the doubt as Resolved
            await client.query(
                `UPDATE community_doubts SET status = 'Resolved' WHERE doubt_id = $1`,
                [doubtId]
            );
        });

        // Log Feature Usage 
        if (userInfo) {
            await logAIUsage(userInfo, "Community Forum", `Answer Doubt (${answeredByRole})`, null);
        }

        res.json({ message: "Answer submitted successfully! Thank you for helping the community." });
    } catch (err) {
        console.error("🚨 ANSWER DOUBT CRASH:", err);
        res.status(500).json({ error: "Failed to submit answer." });
    }
};