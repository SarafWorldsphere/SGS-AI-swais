import pool from '../config/db.js';
import model from '../config/aiConfig.js';
import { logAIUsage } from '../utils/aiTracker.js';
import axios from 'axios';

// Helper to safely extract text across Gemini SDK versions
const extractAIText = (aiResult) => {
    if (typeof aiResult?.text === 'string') return aiResult.text;
    if (typeof aiResult?.text === 'function') return aiResult.text();
    if (typeof aiResult?.response?.text === 'function') return aiResult.response.text();
    if (typeof aiResult?.response?.text === 'string') return aiResult.response.text;
    return '';
};

// Convert s3://bucket/key URIs into standard HTTPS S3 URLs
const normalizeStorageUrl = (rawUrl) => {
    if (!rawUrl) return null;
    const trimmed = String(rawUrl).trim();
    if (trimmed.startsWith('s3://')) {
        const withoutProto = trimmed.slice(5);
        const slashIdx = withoutProto.indexOf('/');
        if (slashIdx === -1) return null;
        const bucket = withoutProto.slice(0, slashIdx);
        const key = withoutProto.slice(slashIdx + 1);
        const region = process.env.AWS_REGION || 'ap-south-2';
        return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }
    return trimmed;
};

// ==========================================
// COMPETITIVE EXAM BLUEPRINT FALLBACK DICTIONARY
// ==========================================
const examBlueprints = {
    "6": {
        "IIT": "Class 6 IIT Track: Focus on foundational algebra, logical reasoning, and basic physics mechanics. 100% MCQs (4 options), +4 Marks for correct, -1 Negative Marking.",
        "NEET": "Class 6 NEET Track: Focus on introductory biology, life sciences, and basic chemistry. 100% MCQs (4 options), +4 Marks for correct, -1 Negative Marking.",
        "CEAM": "Class 6 CEAM Programme: Standardized general competitive foundation. 100% MCQs (4 options), +4 Marks for correct, -1 Negative Marking."
    },
    "7": {
        "IIT": "Class 7 IIT Track: Focus on quadratic equations, ratios, and conceptual physics. 100% MCQs (4 options), +4 Marks for correct, -1 Negative Marking.",
        "NEET": "Class 7 NEET Track: Focus on detailed plant/animal biology and chemical properties. 100% MCQs (4 options), +4 Marks for correct, -1 Negative Marking.",
        "CEAM": "Class 7 CEAM Programme: Intermediate competitive foundation. 100% MCQs (4 options), +4 Marks for correct, -1 Negative Marking."
    },
    "8": {
        "IIT": "Class 8 IIT Track: Rigorous problem-solving in Math (relations, equations) and Physics (force/energy). 100% MCQs (4 options), +4 Marks for correct, -1 Negative Marking.",
        "NEET": "Class 8 NEET Track: In-depth Biology and introductory organic Chemistry. 100% MCQs (4 options), +4 Marks for correct, -1 Negative Marking.",
        "CEAM": "Class 8 CEAM Programme: Advanced middle-school competitive foundation. 100% MCQs (4 options), +4 Marks for correct, -1 Negative Marking."
    },
    "9": {
        "IIT": "Class 9 Cream Specialized IIT Track: Heavy execution testing in JEE models (coordinate geometry, advanced physics). 100% MCQs (4 options), +4 Marks for correct, -1 Negative Marking.",
        "NEET": "Class 9 Cream Specialized NEET Track: Advanced pre-medical foundation (meristems, taxonomy). 100% MCQs (4 options), +4 Marks for correct, -1 Negative Marking.",
        "CEAM": "Class 9 CEAM Programme: State-level talent search prep. 100% MCQs (4 options), +4 Marks for correct, -1 Negative Marking."
    }
};

// Retrieve Competitive Blueprint from Database first, fallback to dictionary
async function getCompetitiveBlueprint(examTarget, classNumStr, subject) {
    const normTarget = String(examTarget || 'IIT').toUpperCase().trim();
    const classNum = parseInt(classNumStr, 10) || 8;

    try {
        const dbRes = await pool.query(
            `SELECT blueprint_text, pattern_json 
             FROM sgs_exam_patterns 
             WHERE UPPER(exam_type) ILIKE $1 
               AND (LOWER(subject) ILIKE $2 OR subject = 'default')
               AND (class_level ILIKE $3 OR class_level = 'default')
             LIMIT 1`,
            [`%${normTarget}%`, `%${subject}%`, `%${classNum}%`]
        );
        if (dbRes.rows.length > 0) {
            const row = dbRes.rows[0];
            return row.blueprint_text || JSON.stringify(row.pattern_json);
        }
    } catch (_) {
        // Table may not exist yet; proceed to fallback
    }

    const trackKey = normTarget.includes('NEET') ? 'NEET' : normTarget.includes('CEAM') ? 'CEAM' : 'IIT';

    if (examBlueprints[String(classNum)] && examBlueprints[String(classNum)][trackKey]) {
        return examBlueprints[String(classNum)][trackKey];
    }
    if (classNum >= 1 && classNum <= 5) {
        return "Spark Junior Track: 100% MCQs, +2 Marks for correct, NO Negative Marking.";
    }
    if (classNum >= 6 && classNum <= 8) {
        return `Pre-Foundation Spark / ${trackKey}: 100% MCQs (4 options), +4 Marks for correct, -1 Negative Marking.`;
    }
    if (classNum >= 9 && classNum <= 10) {
        return `Cream Specialized ${trackKey} Track: Heavy execution testing. 100% MCQs (4 options), +4 Marks for correct, -1 Negative Marking.`;
    }
    return `Target Elite ${trackKey} Track: Strict national competitive pattern (+4 Marks, -1 Negative Marking).`;
}

// ==========================================
// 13. COMPETITIVE EXAM PREP MODULE (Time-Scheduled + PDF + Multi-Chapter)
// ==========================================
export const generateCompetitiveContent = async (req, res) => {
    try {
        const body = req.body || {};
        const {
            examTarget = 'IIT',
            subject,
            topic = '',
            chapterId,
            chapterIds,
            chapters,
            taughtTopics = [],
            classLevel = 'Class 8',
            contentType = 'Exam',
            userInfo,
            totalMarks = 20,
            examDifficulty = 'Medium',
            difficulty,
            scheduledStartTime,
            scheduledEndTime
        } = body;

        if (!examTarget || !subject || !classLevel) {
            return res.status(400).json({
                error: "Exam target, subject, and class level are required.",
                message: "Exam target, subject, and class level are required."
            });
        }

        const effectiveDifficulty = examDifficulty || difficulty || 'Medium';
        const validDifficulties = ['Easy', 'Medium', 'Hard', 'Foundational', 'Core', 'Advanced'];
        const validatedDifficulty = validDifficulties.includes(effectiveDifficulty) ? effectiveDifficulty : 'Medium';

        const validMarks = [10, 20, 25, 30, 40, 50, 70, 80, 100];
        let questionCount = parseInt(totalMarks, 10) || 20;

        if (contentType !== "PrepMaterial") {
            if (!validMarks.includes(questionCount)) {
                questionCount = 20;
            }
        }

        // Normalize single or multiple chapter IDs if provided
        let rawChapterList = [];
        if (Array.isArray(chapterIds) && chapterIds.length > 0) rawChapterList = chapterIds;
        else if (Array.isArray(chapters) && chapters.length > 0) rawChapterList = chapters;
        else if (Array.isArray(chapterId)) rawChapterList = chapterId;
        else if (typeof chapterId === 'string' && chapterId.includes(',')) rawChapterList = chapterId.split(',');
        else if (chapterId !== undefined && chapterId !== null && chapterId !== '' && !String(chapterId).includes('Select')) {
            rawChapterList = [chapterId];
        }

        const parsedChapterIds = rawChapterList
            .map(id => (typeof id === 'object' ? (id.chapter_id || id.id || id.value) : id))
            .map(id => parseInt(String(id).trim(), 10))
            .filter(id => !isNaN(id) && id > 0);

        let aiParts = [];
        let combinedSourcePrompt = "";
        const chapterNames = [];

        // Fetch chapter PDFs from sgs_file_storage_metadata or text from sgs_chapter_content
        if (parsedChapterIds.length > 0) {
            const dbRes = await pool.query(`
                SELECT 
                    c.*, 
                    m.file_url,
                    m.file_name
                FROM sgs_chapter_content c
                LEFT JOIN sgs_file_storage_metadata m 
                    ON CAST(c.chapter_id AS TEXT) = CAST(m.entity_id AS TEXT)
                    OR CAST(c.content_format AS TEXT) = CAST(m.file_id AS TEXT)
                WHERE c.chapter_id = ANY($1::int[])
                ORDER BY c.chapter_id ASC
            `, [parsedChapterIds]);

            const uniqueChaptersMap = new Map();
            for (const r of dbRes.rows) {
                if (!uniqueChaptersMap.has(r.chapter_id) || (!uniqueChaptersMap.get(r.chapter_id).file_url && r.file_url)) {
                    uniqueChaptersMap.set(r.chapter_id, r);
                }
            }

            for (const ch of uniqueChaptersMap.values()) {
                const chName = ch.chapter_name || ch.content_title || `Chapter ${ch.chapter_id}`;
                chapterNames.push(chName);

                const textContent = (ch.text_column || ch.full_text_content || '').trim();
                const isPdf = (ch.content_format && String(ch.content_format).toLowerCase().includes('pdf')) || Boolean(ch.file_url);
                const pdfUrl = normalizeStorageUrl(ch.file_url);

                if ((isPdf || !textContent) && pdfUrl) {
                    try {
                        const pdfResponse = await axios.get(pdfUrl, {
                            responseType: 'arraybuffer',
                            timeout: 30000
                        });
                        aiParts.push({
                            inlineData: {
                                data: Buffer.from(pdfResponse.data).toString('base64'),
                                mimeType: "application/pdf"
                            }
                        });
                        combinedSourcePrompt += `\n--- CHAPTER: "${chName}" (Refer to attached PDF document for "${chName}") ---\n`;
                        continue;
                    } catch (pdfErr) {
                        console.warn(`⚠️ Competitive PDF fetch failed for chapter ${ch.chapter_id} (${pdfUrl}), falling back to text:`, pdfErr.message);
                    }
                }

                if (textContent) {
                    combinedSourcePrompt += `\n--- CHAPTER: "${chName}" ---\n"""\n${textContent}\n"""\n`;
                }
            }
        }

        const effectiveTopic = topic && topic.trim() !== ''
            ? topic.trim()
            : (chapterNames.length > 0 ? chapterNames.join(', ') : `${subject} Core Syllabus`);

        const classNumStr = String(classLevel).replace(/\D/g, '') || "8";
        const classNum = parseInt(classNumStr, 10) || 8;
        const trackInfo = await getCompetitiveBlueprint(examTarget, classNumStr, subject);

        const topicInstruction = Array.isArray(taughtTopics) && taughtTopics.length > 0
            ? `CRITICAL: You MUST ONLY generate content/questions from the following taught topics: ${taughtTopics.join(', ')}. DO NOT include concepts from any other part of the syllabus.`
            : `Cover the syllabus concepts for "${effectiveTopic}".`;

        const multiChapterInstruction = chapterNames.length > 1
            ? `CRITICAL MULTI-CHAPTER DISTRIBUTION: Distribute questions EVENLY across all ${chapterNames.length} selected chapters (${chapterNames.join(', ')}). Do NOT cluster questions only from the first chapter.`
            : '';

        const classGuardrail = `
🚨 CRITICAL COMPETITIVE EXAM, AGE & SYLLABUS CONSTRAINT 🚨
Target Competitive Exam: ${examTarget}
Student Class: ${classLevel} (Approx age: ${classNum + 5} years old)
Competitive Blueprint & Marking Scheme: ${trackInfo}

${combinedSourcePrompt ? `TEXTBOOK / CHAPTER SOURCE MATERIAL:\n${combinedSourcePrompt}` : ''}

STRICT INSTRUCTIONS:
1. ${topicInstruction}
2. ${multiChapterInstruction}
3. DO NOT use descriptive school PT patterns (no short/long answer sections). This is strictly a Competitive Exam (${examTarget}).
4. Frame every question as a direct, standalone competitive exam question. NEVER use phrases like "According to the textbook", "Based on the provided text", or "In the given PDF".
5. Difficulty Level: ${validatedDifficulty}.
`;

        let promptText = "";
        let isJsonExpected = false;

        if (contentType === "PrepMaterial") {
            promptText = `
You are an expert ${examTarget} faculty. Generate comprehensive preparation material for Class ${classLevel}, Subject: ${subject}, Topic: "${effectiveTopic}".
${classGuardrail}
Provide:
1. Key Concepts & Formulas
2. Important Definitions & Shortcuts
3. Common Pitfalls & Exam Tricks
`;
        } else {
            isJsonExpected = true;
            promptText = `
You are an expert ${examTarget} competitive exam paper setter.
Generate EXACTLY ${questionCount} single-choice Multiple Choice Questions (MCQs) for ${subject} on "${effectiveTopic}".

${classGuardrail}

🚨 Return ONLY a valid JSON object matching this exact structure. Do NOT wrap in markdown code blocks (\`\`\`json). Every single question must be completely generated by you (never leave placeholders like "Not Generated by AI Yet").
{
  "exam": "${examTarget}",
  "subject": "${subject}",
  "topic": "${effectiveTopic}",
  "classLevel": "${classLevel}",
  "difficulty": "${validatedDifficulty}",
  "markingScheme": {
    "correct": ${classNum <= 5 ? 2 : 4},
    "incorrect": ${classNum <= 5 ? 0 : -1}
  },
  "totalQuestions": ${questionCount},
  "totalMarks": ${questionCount},
  "questions": [
    {
      "section": "${examTarget} - ${subject} (Single Choice MCQs)",
      "chapter": "Chapter Name",
      "questionNumber": 1,
      "question": "Direct, complete competitive MCQ text",
      "questionText": "Direct, complete competitive MCQ text",
      "type": "MCQ",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Exact text of the correct option",
      "answer": "Exact text of the correct option",
      "marks": 1,
      "negativeMarks": ${classNum <= 5 ? 0 : 1},
      "difficulty": "${validatedDifficulty}",
      "detailedSolution": "Step-by-step explanation using Class ${classLevel} concepts."
    }
  ]
}
`;
        }

        aiParts.unshift({ text: promptText });
        const aiInput = aiParts.length === 1 && aiParts[0].text ? aiParts[0].text : aiParts;

        const aiResult = await model.generateContent(aiInput);
        const rawText = extractAIText(aiResult);

        await logAIUsage(
            userInfo,
            "Competitive Prep Module",
            `Generate Standardized ${contentType} (${examTarget} - ${subject})`,
            aiResult.usageMetadata || aiResult.response?.usageMetadata
        );

        if (isJsonExpected) {
            let cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("AI did not return a valid JSON format.");

            const examData = JSON.parse(jsonMatch[0]);
            const rawQuestions = Array.isArray(examData.questions) ? examData.questions : [];

            // Normalize questions so both Competitive Dashboard and Auto Test UI render cleanly
            const normalizedQuestions = rawQuestions.map((q, idx) => {
                const cleanQ = (q.questionText || q.question || q.text || '').trim()
                    .replace(/^(according to the textbook,?\s*|based on the (provided )?(text|chapter|pdf),?\s*)/i, '');
                const formattedText = cleanQ ? cleanQ.charAt(0).toUpperCase() + cleanQ.slice(1) : `Question ${idx + 1}`;
                const ans = q.correctAnswer || q.answer || "";

                return {
                    id: q.id || idx + 1,
                    section: q.section || `${examTarget} - ${subject}`,
                    chapter: q.chapter || chapterNames[idx % (chapterNames.length || 1)] || effectiveTopic,
                    questionNumber: q.questionNumber || idx + 1,
                    question: formattedText,
                    questionText: formattedText,
                    text: formattedText,
                    type: "MCQ",
                    options: Array.isArray(q.options) && q.options.length === 4
                        ? q.options
                        : ["Option A", "Option B", "Option C", "Option D"],
                    correctAnswer: ans,
                    answer: q.detailedSolution ? `${ans} — ${q.detailedSolution}` : ans,
                    marks: Number(q.marks) || 1,
                    negativeMarks: q.negativeMarks !== undefined ? Number(q.negativeMarks) : (classNum <= 5 ? 0 : 1),
                    difficulty: q.difficulty || validatedDifficulty,
                    detailedSolution: q.detailedSolution || "",
                    isGenerated: true,
                    status: "generated"
                };
            });

            examData.questions = normalizedQuestions;

            return res.json({
                status: "success",
                message: "Preview generated successfully.",
                scheduleData: {
                    startTime: scheduledStartTime || "Not set",
                    endTime: scheduledEndTime || "Not set"
                },
                previewData: examData,
                questions: normalizedQuestions
            });

        } else {
            return res.json({
                status: "success",
                prepMaterial: rawText
            });
        }

    } catch (err) {
        console.error("🚨 COMPETITIVE EXAM CRASH:", err);
        res.status(500).json({
            status: "error",
            error: err.message || "Failed to generate competitive content.",
            message: err.message || "Failed to generate competitive content.",
            details: String(err.message || err)
        });
    }
};