cat << 'EOF' > /home/ubuntu/swais-backend/controllers/teacherController.js
import pool from '../config/db.js';
import model from '../config/aiConfig.js';
import { logAIUsage } from '../utils/aiTracker.js';
import textToSpeech from '@google-cloud/text-to-speech';
import axios from 'axios'; 

// Google Cloud TTS Client Initialize using your API KEY from .env
const ttsClient = new textToSpeech.TextToSpeechClient({
    apiKey: process.env.GOOGLE_TTS_API_KEY
});

// Helper to safely extract text across Gemini SDK versions
const extractAIText = (aiResult) => {
    if (typeof aiResult?.text === 'string') return aiResult.text;
    if (typeof aiResult?.text === 'function') return aiResult.text();
    if (typeof aiResult?.response?.text === 'function') return aiResult.response.text();
    if (typeof aiResult?.response?.text === 'string') return aiResult.response.text;
    return '';
};

// 🌍 Google Cloud Voice Mapping
const googleVoiceMap = {
    "English": "en-IN",
    "Hindi": "hi-IN",
    "Telugu": "te-IN",
    "Telegu": "te-IN", 
    "Kannada": "kn-IN",
    "Tamil": "ta-IN",
    "Malayalam": "ml-IN",
    "Bengali": "bn-IN",
    "Marathi": "mr-IN",
    "Oriya": "hi-IN", 
    "Sanskrit": "hi-IN" 
};

// =========================================================================
// 🏫 SMT. GODAVARIDEVI SARAF SENIOR SECONDARY SCHOOL - EXAM PATTERNS
// =========================================================================
const schoolExamBlueprints = {
    "PT1_PT3": {
        "Maths": {
            "default": `Blueprint (50 Marks):
- Section I: Multiple Choice Questions [10 x 1M = 10 Marks]
- Section II: Short Answer [5 x 2M = 10 Marks]
- Section III: Short Answer [4 x 3M = 12 Marks]
- Section IV: Long Answer [2 x 5M = 10 Marks]
- Section V: Case Study [2 x 4M = 8 Marks]`
        },
        "Science": {
            "Class 6": `Blueprint (50 Marks): MCQs (10x1M), Fill in the Blanks (5x1M), Picture ID (5x1M), Short Answer (5x2M), Long Answer (2x5M), Diagram (1x5M).`,
            "Class 7": `Blueprint (50 Marks): MCQs (10x1M), Fill in the Blanks (5x1M), Case Study (1x5M), Picture ID (5x1M), Short Answer (5x2M), Long Answer (2x5M), Diagram (1x5M).`,
            "default": `Blueprint (50 Marks split Bio, Chem, Phys): MCQs (4x1M), Assertion-Reason (2x1M), 2-Mark SAQ (2x2M), 3-Mark SAQ (1x3M), Case Study (4x1M) per section.`
        },
        "Hindi": {
            "default": `Blueprint (50 Marks):
खण्ड - क (30M): शब्दार्थ (5M), विलोम (5M), सत्य/असत्य (5M), रिक्त स्थान (5M), वचन (5M), अपठित गद्यांश (5M).
खण्ड - ख (20M): लघु उत्तरीय प्रश्न (10x1M), दीर्घ उत्तरीय प्रश्न (5x2M).`
        },
        "Telugu": {
            "default": `Blueprint (50 Marks):
- అపరిచిత గద్యం (5M), వ్యాసం (5M), లేఖ (5M).
- వ్యాకరణం (15M).
- సందర్భ వాక్యాలు (6M), 1 మార్కు ప్రశ్నలు (5M), 3 మార్కుల ప్రశ్నలు (6M), ఉపవాచకం (3M).`
        },
        "English": {
            "default": `Blueprint (50 Marks):
- Section A (Reading): Unseen Passage 1 [5M] + Unseen Passage 2 [5M] = 10 Marks
- Section B (Writing Skills): Notice, Diary Entry, Letter/Email [12 Marks]
- Section C (Grammar): Parts of speech, Tenses, Determiners, Editing [8 Marks]
- Section D (Literature): Extracts [4 Marks] + Short Answer Questions [2 x 5M = 10 Marks] + Long Answer Question [1 x 6M = 6 Marks]`
        }
    },
    "PT2_PT4": {
        "Maths": {
            "default": `Blueprint (80 Marks):
- Section I: MCQs [20 x 1M = 20M]
- Section II: Short Answer Type I [5 x 2M = 10M]
- Section III: Short Answer Type II [6 x 3M = 18M]
- Section IV: Long Answer Questions [4 x 5M = 20M]
- Section V: Case Study Based Questions [3 x 4M = 12M]`
        },
        "Science": {
            "Class 6": `Blueprint (80 Marks): MCQs (10x1M), Match the following (2x5M), Picture ID (5x1M), Fill in the Blanks (5x1M), True/False (5x1M), Case Study (1x5M), One Word (5x1M), 2-Mark Questions (5x2M), Long Answer (4x5M), Diagram (1x5M).`,
            "Class 7": `Blueprint (80 Marks): MCQs (10x1M), Match the Following (2x5M), Picture ID (5x1M), Fill in the Blanks (5x1M), True/False (5x1M), Case Study (1x5M), One Word (5x1M), Short Questions (5x2M), Long Answer (4x5M), Diagram (1x5M).`,
            "default": `Blueprint (80 Marks across Bio, Chem, Phys): Each section contains ~26-27 Marks: MCQs (6x1M), Assertion & Reasoning (1x1M), Short Answer (2x2M, 2x3M), Long Answer (1x4M/5M), Case Study (1x5M).`
        },
        "Social Studies": {
            "default": `Blueprint (80 Marks):
- Section A (20M): Fill in the Blanks (4M), MCQs (4M), True/False (2M), Assertion/Reason (2M), Matching (4M), Picture ID (4M).
- Section B (48M): Very Short Answer [4x2M], Short Answer [5x3M], Long Answer [5x5M].
- Section C (12M): Case Study Passages [3x4M].`
        },
        "English": {
            "default": `Blueprint (80 Marks):
- Section A (Reading - 22M): Unseen Passage 1 (12M), Unseen Passage 2 (10M).
- Section B (Writing - 22M): Short Task (5M), Letter/Email (5M), Article/Essay (6M), Picture Composition (6M).
- Section C (Grammar - 10M): Fill in blanks/Editing/Tenses.
- Section D (Literature - 26M): 2 Extracts (8M), 5 Short QA (10M), 2 Long QA (8M).`
        },
        "Hindi": {
            "default": `Blueprint (80 Marks):
खण्ड - क (35M): शब्दार्थ, वचन, विलोम, सत्य/असत्य, वाक्य प्रयोग, रिक्त स्थान, शब्द बनाइए (5M each).
खण्ड - ख (15M): वाक्यांश के लिए एक शब्द (5M), पठित गद्यांश (5M), अपठित गद्यांश (5M).
खण्ड - ग (30M): लघु उत्तरीय प्रश्न (10M), दीर्घ उत्तरीय प्रश्न (12M), व्याख्या (8M).`
        },
        "Telugu": {
            "default": `Blueprint (80 Marks):
- అపరిచిత గద్యం (5M), లేఖ (5M), వ్యాసం (6M).
- వ్యాకరణం: 15M (సంధులు, సమాసాలు, అర్థాలు, వ్యతిరేక పదాలు, ప్రకృతి-వికృతులు).
- 1 మార్కు ప్రశ్నలు (10M), 2 మార్కుల ప్రశ్నలు (6M), 3 మార్కుల ప్రశ్నలు (6M).
- సొంత వాక్యాలు/సందర్భ వాక్యాలు/ప్రతిపదార్థ భావం/ఉపవాచకం: మిగిలిన మార్కులు.`
        },
        "Computer": {
            "default": `Blueprint (80 Marks):
- Section A (30M): MCQs (10M), Fill Blanks (5M), True/False (5M), Matching/Full Forms (5M), Task ID (5M).
- Section B (44M): Very Short (5x2M), Short (4x3M), Long (3x4M), Very Long (2x5M).
- Section C (6M): Case Study / Diagram (6M).`
        }
    }
};

function resolveSubjectCategory(subject = '') {
    const sub = subject.toLowerCase();
    if (sub.includes('math')) return 'Maths';
    if (sub.includes('sci')) return 'Science';
    if (sub.includes('social') || sub.includes('soc')) return 'Social Studies';
    if (sub.includes('eng')) return 'English';
    if (sub.includes('hin')) return 'Hindi';
    if (sub.includes('tel')) return 'Telugu';
    if (sub.includes('comp')) return 'Computer';
    return 'default';
}

function getSchoolBlueprint(examType, classLevel, subject) {
    const normExam = (examType || '').toUpperCase().trim();
    let examGroup = null;

    if (normExam === 'PT1' || normExam === 'PT3') examGroup = 'PT1_PT3';
    else if (normExam === 'PT2' || normExam === 'PT4') examGroup = 'PT2_PT4';

    if (!examGroup) return null;

    const subjectCategory = resolveSubjectCategory(subject);
    const subjectPatterns = schoolExamBlueprints[examGroup][subjectCategory];

    if (!subjectPatterns) return null;

    const cleanClass = (classLevel || '').trim();
    return subjectPatterns[cleanClass] || subjectPatterns['default'] || null;
}

const examBlueprints = {
    "6": {
        "IIT": "Class 6 IIT Track: Focus on foundational algebra, logical reasoning, and basic physics mechanics. +4 Marks, -1 Negative Marking.",
        "NEET": "Class 6 NEET Track: Focus on introductory biology, life sciences, and basic chemistry. +4 Marks, -1 Negative Marking.",
        "CEAM": "Class 6 CEAM Programme: Standardized general competitive foundation. +4 Marks, -1 Negative Marking."
    },
    "7": {
        "IIT": "Class 7 IIT Track: Focus on quadratic equations, ratios, and conceptual physics. +4 Marks, -1 Negative Marking.",
        "NEET": "Class 7 NEET Track: Focus on detailed plant/animal biology and chemical properties. +4 Marks, -1 Negative Marking.",
        "CEAM": "Class 7 CEAM Programme: Intermediate competitive foundation."
    },
    "8": {
        "IIT": "Class 8 IIT Track: Rigorous problem-solving in Math (relations, equations) and Physics (force/energy). +4 Marks, -1 Negative Marking.",
        "NEET": "Class 8 NEET Track: In-depth Biology and introductory organic Chemistry. +4 Marks, -1 Negative Marking."
    },
    "9": {
        "IIT": "Class 9 Cream Specialized IIT Track: Heavy execution testing in JEE models (coordinate geometry, advanced physics). +4 Marks, -1 Negative Marking.",
        "NEET": "Class 9 Cream Specialized NEET Track: Advanced pre-medical foundation (meristems, taxonomy). +4 Marks, -1 Negative Marking.",
        "CEAM": "Class 9 CEAM Programme: State-level talent search prep."
    }
};

// Retrieve Exam Blueprint from Database first, fallback to dictionary
async function getDynamicExamBlueprint(examType, classLevel, subject) {
    const normExam = (examType || '').toUpperCase().trim();
    const cleanClass = (classLevel || '').trim();
    const cleanClassNum = cleanClass.replace(/\D/g, '');
    const subjectCategory = resolveSubjectCategory(subject);

    const candidateQueries = [
        {
            sql: `SELECT pattern_json, blueprint_text, total_marks, sections 
                  FROM sgs_exam_patterns 
                  WHERE (UPPER(exam_type) = $1 OR UPPER(exam_name) = $1)
                    AND (LOWER(subject) ILIKE $2 OR LOWER(subject) ILIKE $3)
                    AND (class_level ILIKE $4 OR class_level = $5 OR class_level = 'default')
                  LIMIT 1`,
            params: [normExam, `%${subject}%`, `%${subjectCategory}%`, `%${cleanClass}%`, cleanClassNum]
        },
        {
            sql: `SELECT * FROM sgs_exam_blueprints 
                  WHERE UPPER(exam_type) = $1 AND LOWER(subject) ILIKE $2 LIMIT 1`,
            params: [normExam, `%${subjectCategory}%`]
        }
    ];

    for (const q of candidateQueries) {
        try {
            const dbRes = await pool.query(q.sql, q.params);
            if (dbRes.rows.length > 0) {
                const row = dbRes.rows[0];
                return row.blueprint_text || row.pattern_text || row.blueprint || JSON.stringify(row.pattern_json || row.sections || row);
            }
        } catch (_) {}
    }

    if (['IIT', 'NEET', 'CEAM', 'COMPETITIVE', 'COMPETITIVE EXAM'].some(k => normExam.includes(k))) {
        const trackKey = normExam.includes('IIT') ? 'IIT' : normExam.includes('NEET') ? 'NEET' : 'CEAM';
        return (
            examBlueprints[cleanClassNum]?.[trackKey] ||
            `Competitive Exam Pattern (${trackKey} Track): 100% Multiple Choice Questions (4 options each), single correct answer, +4 Marks for correct, -1 Negative Marking.`
        );
    }

    return getSchoolBlueprint(examType, classLevel, subject);
}

// ==========================================
// 1. AUTO LESSON PLANNER (DAY-WISE JSON)
// ==========================================
export const generateLessonPlan = async (req, res) => {
    const { 
        chapterId, 
        durationMinutes = 45, 
        userInfo,
        topic,
        noOfPeriods = 5
    } = req.body || {};

    const teacherId = userInfo?.id || 3;

    if (!chapterId) return res.status(400).json({ error: "Chapter ID is required" });

    try {
        const result = await pool.query(`
            SELECT 
                c.*, 
                m.file_url 
            FROM sgs_chapter_content c
            LEFT JOIN sgs_file_storage_metadata m ON c.chapter_id = m.chapter_id
            WHERE c.chapter_id = $1
            LIMIT 1
        `, [chapterId]);

        if (result.rows.length === 0) return res.status(404).json({ error: "Chapter not found in database" });
        
        const row = result.rows[0];
        const chapter_name = row.chapter_name || "Chapter";
        const finalTopic = topic && topic.trim() !== '' ? topic : chapter_name;
        
        const textContent = (row.text_column || row.full_text_content || '').trim();
        const isPdfFormat = row.content_format && String(row.content_format).toLowerCase().includes('pdf');
        const pdfUrl = row.file_url ? String(row.file_url).trim() : null;

        let aiParts = [];
        let contentPrompt = "";

        if ((isPdfFormat || !textContent) && pdfUrl) {
            const pdfResponse = await axios.get(pdfUrl, { responseType: 'arraybuffer', timeout: 30000 });
            aiParts.push({
                inlineData: {
                    data: Buffer.from(pdfResponse.data).toString('base64'),
                    mimeType: "application/pdf"
                }
            });
            contentPrompt = `\nTEXTBOOK CONTENT: (Please refer strictly to the attached PDF document for the chapter text).\n`;
        } else if (textContent) {
            contentPrompt = `\nTEXTBOOK CONTENT:\n"""\n${textContent}\n"""\n`;
        } else {
            return res.status(404).json({ error: "No chapter content (PDF in sgs_file_storage_metadata or text) found to generate lesson plan." });
        }

        const promptText = `
You are an expert school teacher. Create a day-wise lesson plan for the chapter "${finalTopic}".
You have exactly ${noOfPeriods} days (periods) to complete this chapter.
${contentPrompt}
CRITICAL INSTRUCTIONS:
1. Divide the chapter content logically across exactly ${noOfPeriods} days.
2. Focus ONLY on the textbook content provided. Do not invent unrelated topics.
3. You MUST return ONLY a valid JSON object matching the exact structure below. Do not include markdown blocks or plain text.

REQUIRED JSON STRUCTURE:
{
  "chapter": "${finalTopic}",
  "total_days": ${noOfPeriods},
  "days": [
    {
      "day_no": 1,
      "objectives": "Specific, measurable objective for this day",
      "activities": "Specific classroom activity",
      "tlm": "Required teaching learning materials",
      "homework": "Specific homework assignment"
    }
  ]
}
`;
        
        aiParts.unshift({ text: promptText });

        const aiResult = await model.generateContent(aiParts);
        const rawText = extractAIText(aiResult);
        
        let cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) throw new Error("Failed to parse AI output into valid JSON.");
        const structuredPlan = JSON.parse(jsonMatch[0]);

        await logAIUsage(
            userInfo, 
            "Teacher Dashboard", 
            "Generate Day-wise Lesson Plan", 
            aiResult.usageMetadata || aiResult.response?.usageMetadata
        );

        try {
            await pool.query(
                `INSERT INTO sgs_lesson_plans (teacher_id, title, chapter_id, chapter_text, duration_minutes, created_at)
                 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
                [teacherId, `Day-wise Plan: ${finalTopic}`, chapterId, chapter_name, durationMinutes]
            );
        } catch (dbErr) {
            console.warn("⚠️ Non-blocking: Could not save to sgs_lesson_plans:", dbErr.message);
        }

        res.json({ lessonPlan: structuredPlan });
    } catch (err) {
        console.error("🚨 LESSON PLAN CRASH:", err);
        res.status(500).json({ error: "Failed to generate lesson plan.", details: err.message });
    }
};

// ==========================================
// 2. AUTO QUESTION PAPER GENERATOR (MULTI-CHAPTER PDF + DB BLUEPRINT + COMPETITIVE + CLASS TEST)
// ==========================================
export const generateQuestionPaper = async (req, res) => {
    try {
        const body = req.body || {};
        const {
            chapterId,
            chapterIds,
            chapters,
            title = '',
            difficulty = 'Core',
            taughtTopics = [],
            examType = 'PT2',
            examCategory = '',
            questionType = 'All',
            totalMarks = 80,
            classLevel = 'Class 8',
            subject = 'Science',
            userInfo
        } = body;

        // Normalize single or multiple chapter IDs into a clean integer array
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

        const isClassTest = String(examType).toLowerCase().includes('class test') || String(examCategory).toLowerCase().includes('class test');
        const isCompetitive = ['iit', 'neet', 'ceam', 'competitive'].some(k =>
            String(examType).toLowerCase().includes(k) || String(examCategory).toLowerCase().includes(k)
        );

        if (parsedChapterIds.length === 0 && !isClassTest && !title) {
            return res.status(400).json({
                error: "Please select at least one valid Chapter before generating.",
                message: "Please select at least one valid Chapter before generating."
            });
        }

        const validDifficulties = ['Foundational', 'Core', 'Advanced', 'Easy', 'Medium', 'Hard'];
        const validatedDifficulty = validDifficulties.includes(difficulty) ? difficulty : 'Core';
        const targetMarks = parseInt(totalMarks, 10) || (isClassTest ? 20 : 50);

        // Fetch all selected chapters and their PDF URLs from sgs_file_storage_metadata
        let chapterRows = [];
        if (parsedChapterIds.length > 0) {
            const dbRes = await pool.query(`
                SELECT 
                    c.*, 
                    m.file_url
                FROM sgs_chapter_content c
                LEFT JOIN sgs_file_storage_metadata m ON c.chapter_id = m.chapter_id
                WHERE c.chapter_id = ANY($1::int[])
                ORDER BY c.chapter_id ASC
            `, [parsedChapterIds]);
            chapterRows = dbRes.rows;
        } else if (subject && subject !== 'Select') {
            const dbRes = await pool.query(`
                SELECT 
                    c.*, 
                    m.file_url
                FROM sgs_chapter_content c
                LEFT JOIN sgs_file_storage_metadata m ON c.chapter_id = m.chapter_id
                WHERE c.subject ILIKE $1
                ORDER BY c.chapter_id ASC
                LIMIT 3
            `, [`%${subject}%`]);
            chapterRows = dbRes.rows;
        }

        if (chapterRows.length === 0 && parsedChapterIds.length > 0) {
            return res.status(404).json({
                error: "Selected chapter(s) not found in database.",
                message: "Selected chapter(s) not found in database."
            });
        }

        const uniqueChaptersMap = new Map();
        for (const r of chapterRows) {
            if (!uniqueChaptersMap.has(r.chapter_id) || (!uniqueChaptersMap.get(r.chapter_id).file_url && r.file_url)) {
                uniqueChaptersMap.set(r.chapter_id, r);
            }
        }
        const uniqueChapters = Array.from(uniqueChaptersMap.values());

        let aiParts = [];
        let combinedTextPrompt = "";
        const chapterNames = [];

        for (const ch of uniqueChapters) {
            const chName = ch.chapter_name || `Chapter ${ch.chapter_id}`;
            chapterNames.push(chName);

            const textContent = (ch.text_column || ch.full_text_content || '').trim();
            const isPdf = ch.content_format && String(ch.content_format).toLowerCase().includes('pdf');
            const pdfUrl = ch.file_url ? String(ch.file_url).trim() : null;

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
                    combinedTextPrompt += `\n--- CHAPTER: "${chName}" (Refer to attached PDF document for "${chName}") ---\n`;
                    continue;
                } catch (pdfErr) {
                    console.warn(`⚠️ Failed to download PDF for chapter ${ch.chapter_id} (${pdfUrl}):`, pdfErr.message);
                }
            }

            if (textContent) {
                combinedTextPrompt += `\n--- CHAPTER: "${chName}" ---\n"""\n${textContent}\n"""\n`;
            }
        }

        const chapterTitleDisplay = chapterNames.length > 0
            ? chapterNames.join(', ')
            : (title || `${classLevel} ${subject} Assessment`);

        const topicInstruction = Array.isArray(taughtTopics) && taughtTopics.length > 0
            ? `CRITICAL CONSTRAINT: Generate questions ONLY from these taught topics: ${taughtTopics.join(', ')}.`
            : `Cover key concepts from the chapter(s): ${chapterTitleDisplay}.`;

        const multiChapterDistributionRule = uniqueChapters.length > 1
            ? `CRITICAL MULTI-CHAPTER DISTRIBUTION: You have been given ${uniqueChapters.length} chapters (${chapterNames.map((n, i) => `Chapter ${i + 1}: "${n}"`).join('; ')}). You MUST distribute questions and marks EVENLY across ALL ${uniqueChapters.length} chapters (~${Math.round(100 / uniqueChapters.length)}% weightage per chapter). Do NOT cluster questions only from the first chapter.`
            : '';

        const matchedBlueprint = await getDynamicExamBlueprint(examType, classLevel, subject);
        let patternInstruction = "";

        if (isCompetitive) {
            patternInstruction = `
CRITICAL COMPETITIVE EXAM PATTERN (${examType}):
- Do NOT use the school PT descriptive pattern.
- Follow the Competitive Exam Pattern strictly: ${matchedBlueprint}
- Generate ONLY Multiple Choice Questions (MCQs) with 4 distinct options ("options": ["A", "B", "C", "D"]).
- Include conceptual, analytical, and numerical application questions appropriate for ${classLevel}.
- Every question must carry equal marks adding up to ${targetMarks} total marks.`;
        } else if (isClassTest) {
            patternInstruction = `
CLASS TEST PATTERN (${targetMarks} Marks):
- Title: "${title || chapterTitleDisplay}"
- Create a concise Class Test totaling EXACTLY ${targetMarks} marks:
  * Section A: Multiple Choice Questions (MCQs) [5 x 1M = 5 Marks]
  * Section B: Very Short Answer Questions [5 x 1M = 5 Marks]
  * Section C: Short Answer Questions [3 x 2M = 6 Marks]
  * Section D: Long / Analytical Question [1 x 4M = 4 Marks]
  (Scale question counts proportionally if Target Total Marks is ${targetMarks} instead of 20).`;
        } else if (matchedBlueprint) {
            patternInstruction = `
CRITICAL OFFICIAL SCHOOL EXAM BLUEPRINT:
- Model this paper strictly according to the school pattern for ${classLevel} ${subject} (${examType}):
"""
${matchedBlueprint}
"""
- Organize questions into the exact sections and mark breakdowns above.`;
        } else {
            const isSpecificType = questionType && questionType !== 'All';
            patternInstruction = isSpecificType
                ? `CRITICAL: Generate ONLY "${questionType}" questions totaling ${targetMarks} marks.`
                : `Generate a balanced mix of MCQs, Short Answer, and Long Answer questions totaling ${targetMarks} marks.`;
        }

        const promptText = `
You are an expert exam paper setter for SMT. GODAVARI DEVI SARAF SENIOR SECONDARY SCHOOL.
Generate a complete, ready-to-print Question Paper.

EXAM DETAILS:
Title: ${title || `${examType} - ${subject}`}
Class: ${classLevel}
Subject: ${subject}
Chapters Covered: ${chapterTitleDisplay}
Exam Type: ${examType}
Difficulty Tier: ${validatedDifficulty}
Target Total Marks: ${targetMarks}

${combinedTextPrompt ? `SOURCE CONTENT:\n${combinedTextPrompt}` : ''}

STRICT QUALITY & FORMATTING RULES:
1. ${topicInstruction}
2. ${multiChapterDistributionRule}
3. ${patternInstruction}
4. DIRECT PHRASING ONLY: Frame every question as a direct, standalone exam question. NEVER use phrases like "According to the textbook", "Based on the provided text", "In the given PDF", "As mentioned in the chapter", or "According to the passage".
5. COMPLETE GENERATION: Every single question in the paper MUST be fully written by you with complete question text, options (for MCQs), and a complete answer key. NEVER leave any question blank or with placeholders like "Not Generated by AI Yet" or "Write it myself".
6. EXACT MARKS: The sum of "marks" across all questions MUST equal ${targetMarks}.
7. Return STRICTLY a valid JSON array of question objects. Do not wrap in markdown backticks.

REQUIRED JSON ARRAY SCHEMA:
[
  {
    "section": "Section A",
    "chapter": "Name of the chapter this question is from",
    "questionNumber": 1,
    "question": "Direct, complete question text here",
    "questionText": "Direct, complete question text here",
    "type": "MCQ | Short Answer | Long Answer | Fill in the Blanks | True/False | Matching | Case Study | Diagram",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Complete correct answer and marking scheme",
    "marks": 1,
    "difficulty": "${validatedDifficulty}"
  }
]
`;

        aiParts.unshift({ text: promptText });

        const aiResult = await model.generateContent(aiParts);
        const rawText = extractAIText(aiResult);

        let cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);

        if (!jsonMatch) {
            throw new Error("AI did not return a valid JSON array of questions.");
        }

        const parsedQuestions = JSON.parse(jsonMatch[0]);

        const structuredQuestions = parsedQuestions.map((q, idx) => {
            const qText = (q.question || q.questionText || q.text || '').trim()
                .replace(/^(according to the textbook,?\s*|based on the (provided )?(text|chapter|pdf),?\s*)/i, '');
            const formattedText = qText ? qText.charAt(0).toUpperCase() + qText.slice(1) : `Question ${idx + 1}`;

            return {
                id: q.id || idx + 1,
                section: q.section || "Section A",
                chapter: q.chapter || chapterNames[idx % (chapterNames.length || 1)] || chapterTitleDisplay,
                questionNumber: q.questionNumber || idx + 1,
                question: formattedText,
                questionText: formattedText,
                text: formattedText,
                type: q.type || (Array.isArray(q.options) && q.options.length > 0 ? "MCQ" : "Short Answer"),
                options: Array.isArray(q.options) ? q.options : null,
                answer: q.answer || q.correctAnswer || "",
                correctAnswer: q.answer || q.correctAnswer || "",
                marks: Number(q.marks) || 1,
                difficulty: q.difficulty || validatedDifficulty,
                isGenerated: true,
                status: "generated"
            };
        });

        await logAIUsage(
            userInfo,
            "Teacher Dashboard - Auto Test",
            `Generate School Paper (${examType} - ${subject} - ${classLevel} - ${validatedDifficulty})`,
            aiResult.usageMetadata || aiResult.response?.usageMetadata
        );

        res.json({
            status: "success",
            title: title || `${examType} - ${subject}`,
            examType,
            classLevel,
            subject,
            totalMarks: targetMarks,
            chapters: chapterNames,
            questions: structuredQuestions
        });

    } catch (err) {
        console.error("🚨 QUESTION PAPER CRASH:", err);
        res.status(500).json({
            status: "error",
            error: err.message || "Failed to generate question paper.",
            message: err.message || "Failed to generate question paper.",
            details: String(err.message || err)
        });
    }
};

// ==========================================
// 2B. REWRITE OR REPLACE SINGLE QUESTION
// ==========================================
export const rewriteOrReplaceQuestion = async (req, res) => {
    try {
        const {
            action = 'rewrite',
            question,
            questionText,
            currentQuestion,
            type = 'Short Answer',
            marks = 1,
            section = 'Section A',
            difficulty = 'Core',
            classLevel = 'Class 8',
            subject = 'Science',
            chapterId,
            chapterName = '',
            instruction = '',
            userInfo
        } = req.body || {};

        const originalQ = question || questionText || currentQuestion?.question || currentQuestion?.questionText || '';
        const qType = currentQuestion?.type || type;
        const qMarks = Number(currentQuestion?.marks || marks) || 1;
        const qSection = currentQuestion?.section || section;

        if (!originalQ && action === 'rewrite') {
            return res.status(400).json({
                error: "Original question text is required to rewrite.",
                message: "Original question text is required to rewrite."
            });
        }

        let chapterContext = "";
        if (chapterId && !isNaN(parseInt(chapterId, 10))) {
            try {
                const chRes = await pool.query(
                    `SELECT * FROM sgs_chapter_content WHERE chapter_id = $1 LIMIT 1`,
                    [parseInt(chapterId, 10)]
                );
                if (chRes.rows.length > 0) {
                    const ch = chRes.rows[0];
                    const txt = ch.text_column || ch.full_text_content || '';
                    chapterContext = `Chapter: "${ch.chapter_name}"\n${txt ? `Context:\n${txt.slice(0, 4000)}` : ''}`;
                }
            } catch (_) {}
        }

        const taskInstruction = String(action).toLowerCase() === 'replace'
            ? `Generate a BRAND NEW question testing a different concept/sub-topic from the same chapter/subject to REPLACE the current question: "${originalQ}".`
            : `REWRITE and improve the clarity, academic phrasing, and precision of this question while keeping the same core concept and mark weightage: "${originalQ}".`;

        const prompt = `
You are an expert school examiner for ${classLevel} ${subject}.
Task: ${taskInstruction}
${instruction ? `Teacher's specific instruction: ${instruction}` : ''}
${chapterName ? `Chapter: ${chapterName}` : ''}
${chapterContext}

Question Type: ${qType}
Marks: ${qMarks}
Difficulty: ${difficulty}

CRITICAL RULES:
1. Frame as a direct exam question. NEVER use phrases like "According to the textbook" or "Based on the text".
2. Return ONLY a valid JSON object matching the exact structure below (no markdown blocks):
{
  "section": "${qSection}",
  "question": "The new or rewritten question text",
  "questionText": "The new or rewritten question text",
  "type": "${qType}",
  "options": ${qType === 'MCQ' ? '["Option A", "Option B", "Option C", "Option D"]' : 'null'},
  "answer": "Complete answer and marking scheme",
  "marks": ${qMarks},
  "difficulty": "${difficulty}"
}
`;

        const aiResult = await model.generateContent(prompt);
        const rawText = extractAIText(aiResult);

        const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Failed to parse rewritten/replaced question JSON.");

        const updatedQ = JSON.parse(jsonMatch[0]);
        const finalQuestionText = (updatedQ.question || updatedQ.questionText || '').trim();

        const normalizedQuestion = {
            ...(typeof currentQuestion === 'object' ? currentQuestion : {}),
            section: updatedQ.section || qSection,
            question: finalQuestionText,
            questionText: finalQuestionText,
            text: finalQuestionText,
            type: updatedQ.type || qType,
            options: Array.isArray(updatedQ.options) ? updatedQ.options : null,
            answer: updatedQ.answer || "",
            correctAnswer: updatedQ.answer || "",
            marks: Number(updatedQ.marks) || qMarks,
            difficulty: updatedQ.difficulty || difficulty,
            isGenerated: true
        };

        await logAIUsage(
            userInfo,
            "Teacher Dashboard - Auto Test",
            `${action === 'replace' ? 'Replace' : 'Rewrite'} Question (${subject})`,
            aiResult.usageMetadata || aiResult.response?.usageMetadata
        );

        res.json({
            status: "success",
            question: normalizedQuestion,
            updatedQuestion: normalizedQuestion,
            data: normalizedQuestion
        });
    } catch (err) {
        console.error("🚨 REWRITE/REPLACE QUESTION CRASH:", err);
        res.status(500).json({
            error: err.message || "Failed to modify question.",
            message: err.message || "Failed to modify question."
        });
    }
};

// ==========================================
// 2C. SAVE GENERATED QUESTION PAPER & GET SAVED PAPERS
// ==========================================
export const saveQuestionPaper = async (req, res) => {
    try {
        const {
            title = 'Untitled Question Paper',
            examType = 'PT1',
            classLevel = 'Class 8',
            subject = 'Science',
            chapterIds = [],
            totalMarks = 50,
            difficulty = 'Core',
            questions = [],
            userInfo
        } = req.body || {};

        const teacherId = userInfo?.id || req.body?.teacherId || 3;

        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
                error: "Cannot save an empty question paper.",
                message: "Cannot save an empty question paper."
            });
        }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS sgs_question_papers (
                paper_id SERIAL PRIMARY KEY,
                teacher_id INTEGER,
                title TEXT NOT NULL,
                exam_type VARCHAR(50),
                class_level VARCHAR(50),
                subject VARCHAR(100),
                chapter_ids JSONB DEFAULT '[]'::jsonb,
                total_marks INTEGER DEFAULT 50,
                difficulty VARCHAR(50) DEFAULT 'Core',
                questions_json JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const insertRes = await pool.query(`
            INSERT INTO sgs_question_papers 
                (teacher_id, title, exam_type, class_level, subject, chapter_ids, total_marks, difficulty, questions_json, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
            RETURNING paper_id, title, exam_type, class_level, subject, total_marks, created_at;
        `, [
            teacherId,
            title,
            examType,
            classLevel,
            subject,
            JSON.stringify(chapterIds),
            parseInt(totalMarks, 10) || 50,
            difficulty,
            JSON.stringify(questions)
        ]);

        res.status(201).json({
            status: "success",
            message: "Question paper saved successfully.",
            paper: insertRes.rows[0],
            paperId: insertRes.rows[0].paper_id
        });
    } catch (err) {
        console.error("🚨 SAVE QUESTION PAPER CRASH:", err);
        res.status(500).json({
            error: err.message || "Failed to save question paper.",
            message: err.message || "Failed to save question paper."
        });
    }
};

export const getSavedQuestionPapers = async (req, res) => {
    try {
        const teacherId = req.query?.teacherId || req.body?.userInfo?.id || 3;
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sgs_question_papers (
                paper_id SERIAL PRIMARY KEY,
                teacher_id INTEGER,
                title TEXT NOT NULL,
                exam_type VARCHAR(50),
                class_level VARCHAR(50),
                subject VARCHAR(100),
                chapter_ids JSONB DEFAULT '[]'::jsonb,
                total_marks INTEGER DEFAULT 50,
                difficulty VARCHAR(50) DEFAULT 'Core',
                questions_json JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const result = await pool.query(
            `SELECT * FROM sgs_question_papers WHERE teacher_id = $1 ORDER BY created_at DESC LIMIT 50`,
            [teacherId]
        );

        res.json({ status: "success", papers: result.rows });
    } catch (err) {
        console.error("🚨 FETCH SAVED QUESTION PAPERS CRASH:", err);
        res.status(500).json({ error: err.message || "Failed to fetch saved question papers." });
    }
};

// ==========================================
// 3. AUTO ANSWER SHEET CORRECTOR
// ==========================================
export const autoCorrectAnswer = async (req, res) => {
    const { question, studentAnswer, maxMarks, rubric, userInfo } = req.body;
    if (!question || !studentAnswer || !maxMarks || !rubric) return res.status(400).json({ error: "Missing required fields" });

    try {
        const prompt = `
You are an experienced school examiner.
Question "${question}"
Maximum Marks ${maxMarks}
Teacher Rubric "${rubric}"
Student Answer "${studentAnswer}"

Evaluate fairly. Award partial marks where appropriate.
Return ONLY valid JSON. Do NOT return markdown. Do NOT use backticks.
Return {
   "awardedMarks":0,
   "feedback":"..."
}
`;
        const aiResult = await model.generateContent(prompt);
        const rawText = extractAIText(aiResult);
        await logAIUsage(userInfo, "Teacher Dashboard", "Auto Answer Sheet Corrector", aiResult.usageMetadata || aiResult.response?.usageMetadata);

        let cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        res.json(JSON.parse(jsonMatch[0]));
    } catch (err) {
        console.error("🚨 CORRECTOR CRASH:", err);
        res.status(500).json({ error: "Failed to correct answer.", details: err.message });
    }
};

// ==========================================
// 4. ASSIGNMENT DUE DATE ALERTS
// ==========================================
export const generateAssignmentReminders = async (req, res) => {
    const { userInfo } = req.body;
    try {
        const dbResult = await pool.query(`
            SELECT s.full_name AS student, a.title AS task, a.assessment_date AS due 
            FROM assessment_results ar 
            JOIN assessments a ON ar.assessment_id = a.assessment_id 
            JOIN student_master s ON ar.student_id = s.student_id 
            WHERE ar.is_absent = true OR ar.marks_obtained IS NULL 
            LIMIT 5;
        `);

        const missingAssignments = dbResult.rows;

        const prompt = `
Write a professional email reminder for parents.
Requirements:
- Maximum 3 short paragraphs.
- Friendly, Professional, Encouraging.
- Mention assignment submission politely.
- Use placeholder [Student Name] and [Assignment Name].
Do not use markdown. Do not use HTML. Do not use code blocks.
`;
        const aiResult = await model.generateContent(prompt);
        const rawText = extractAIText(aiResult);
        await logAIUsage(userInfo, "Teacher Dashboard", "Assignment Due Date Alerts", aiResult.usageMetadata || aiResult.response?.usageMetadata);

        res.json({ reminderEmail: rawText, list: missingAssignments });
    } catch (err) {
        console.error("🚨 DUE DATE ALERTS CRASH:", err);
        res.status(500).json({ error: "Failed to generate reminders.", details: err.message });
    }
};

// ==========================================
// 5. ASSIGNMENT COMPLETION ALERTS
// ==========================================
export const getAssignmentCompletionAlerts = async (req, res) => {
    const { userInfo } = req.body;
    const teacherId = userInfo?.id || 3;

    try {
        const dbResult = await pool.query(`
            SELECT a.title AS task, COUNT(ar.student_id) as total_submitted, ROUND(AVG(ar.percentage), 2) as avg_score
            FROM assessment_results ar
            JOIN assessments a ON ar.assessment_id = a.assessment_id
            WHERE a.teacher_id = $1 AND ar.marks_obtained IS NOT NULL
            GROUP BY a.title
            ORDER BY a.assessment_date DESC
            LIMIT 5;
        `, [teacherId]);

        const completions = dbResult.rows;

        const prompt = `
You are an AI teaching assistant.

Review the following assignment statistics.
${JSON.stringify(completions)}

Generate a short report. Include:
- Submission trend
- Average performance
- Students requiring attention

Maximum 3 bullet points. Plain text only.
`;
        const aiResult = await model.generateContent(prompt);
        const rawText = extractAIText(aiResult);
        
        await logAIUsage(userInfo, "Teacher Dashboard", "Assignment Completion Alerts", aiResult.usageMetadata || aiResult.response?.usageMetadata);

        res.json({ completionAlert: rawText, data: completions });
    } catch (err) {
        console.error("🚨 COMPLETION ALERTS CRASH:", err);
        res.status(500).json({ error: "Failed to fetch completion alerts.", details: err.message });
    }
};

// ==========================================
// 6. VIRTUAL SLATE AI PROCESSOR 
// ==========================================
export const processVirtualSlateContent = async (req, res) => {
    const { rawText, action = "format", userInfo } = req.body;
    
    if (!rawText) return res.status(400).json({ error: "Virtual slate text is required." });

    try {
        let instruction = action === "summarize" 
            ? "Summarize these rough virtual slate notes clearly." 
            : "Format these rough virtual slate notes into clean, structured bullet points for students.";
            
        const prompt = `
You are an AI classroom assistant.
Teacher's rough notes: "${rawText}"
Task: ${instruction}

Formatting Rules: Create clean notes, use headings, use bullet points. No markdown code blocks. Plain text format only.
`;

        const aiResult = await model.generateContent(prompt);
        const textOut = extractAIText(aiResult);
        await logAIUsage(userInfo, "Teacher Dashboard", `Virtual Slate (${action})`, aiResult.usageMetadata || aiResult.response?.usageMetadata);

        res.json({ processedContent: textOut });
    } catch (err) {
        console.error("🚨 VIRTUAL SLATE CRASH:", err);
        res.status(500).json({ error: "Failed to process virtual slate.", details: err.message });
    }
};

// ==========================================
// 7. STUDENT ANALYTICS
// ==========================================
export const getSingleStudentAnalytics = async (req, res) => {
    const { studentId, studentName, subject = "all", userInfo } = req.body;
    const teacherId = userInfo?.id || 3;
    
    try {
        if (!studentId && !studentName) {
            return res.json({ 
                analysis: "• Overall Performance: No academic data found for this student.\nStrengths: Cannot be determined.\nWeaknesses: Cannot be determined.\nOne Recommendation: Conduct and grade an assessment to establish a performance baseline.", 
                chartData: [] 
            });
        }

        let query = `
            SELECT a.title AS test_name, a.assessment_type AS type, ar.percentage AS score
            FROM assessment_results ar
            JOIN assessments a ON ar.assessment_id = a.assessment_id
            JOIN student_master s ON ar.student_id = s.student_id
            WHERE a.teacher_id = $1
        `;
        let params = [teacherId];
        
        if (studentId) {
            query += ` AND s.student_id = $${params.length + 1}`;
            params.push(studentId);
        } else {
            query += ` AND s.full_name ILIKE $${params.length + 1}`;
            params.push(`%${studentName}%`);
        }

        if (subject && subject !== "all") {
            query += ` AND a.subject ILIKE $${params.length + 1}`;
            params.push(`%${subject}%`);
        }

        query += ` ORDER BY a.assessment_date DESC LIMIT 5;`;
        
        const dbResult = await pool.query(query, params);
        const studentData = dbResult.rows;

        if (studentData.length === 0) {
            return res.json({ 
                analysis: "• Overall Performance: No academic data found for this student in your assessments.\nStrengths: Cannot be determined.\nWeaknesses: Cannot be determined.\nOne Recommendation: Conduct and grade an assessment to establish a performance baseline.", 
                chartData: [] 
            });
        }
        
        const prompt = `
You are helping a teacher analyse student performance.
Student Name: ${studentName || 'the student'}
Performance Data: ${JSON.stringify(studentData)}

Generate: 1. Overall Performance 2. Strengths 3. Weaknesses 4. One Recommendation.
Maximum 4 bullet points. Plain text only.
`;
        const aiResult = await model.generateContent(prompt);
        const rawText = extractAIText(aiResult);
        await logAIUsage(userInfo, "Teacher Dashboard", `Student Analytics (${subject})`, aiResult.usageMetadata || aiResult.response?.usageMetadata);

        res.json({ analysis: rawText, chartData: studentData });
    } catch (err) {
        console.error("🚨 STUDENT ANALYTICS CRASH:", err);
        res.status(500).json({ error: "Failed to analyze student.", details: err.message });
    }
};

// ==========================================
// 8. CLASS PERFORMANCE ANALYTICS
// ==========================================
export const getClassAnalytics = async (req, res) => {
    const { subject = "all", userInfo } = req.body;
    const teacherId = userInfo?.id || 3;

    try {
        let query = `
            SELECT s.full_name AS student, ROUND(AVG(ar.percentage), 2) AS overall_score
            FROM assessment_results ar
            JOIN student_master s ON ar.student_id = s.student_id
            JOIN assessments a ON ar.assessment_id = a.assessment_id
            WHERE a.teacher_id = $1
        `;
        let params = [teacherId];

        if (subject && subject !== "all") {
            query += ` AND a.subject ILIKE $${params.length + 1}`;
            params.push(`%${subject}%`);
        }

        query += ` GROUP BY s.full_name ORDER BY overall_score DESC;`;
        
        const dbResult = await pool.query(query, params);
        const classData = dbResult.rows;

        if (classData.length === 0) {
            return res.json({ 
                analysis: "• Overall class performance: No academic data found for this class in your assessments.\nStrong performers: Cannot be determined.\nStudents needing attention: Cannot be determined.\nTeaching recommendation: Conduct and grade an assessment to establish a performance baseline.", 
                chartData: [] 
            });
        }

        const prompt = `
You are analysing an entire classroom.
Data: ${JSON.stringify(classData)}

Generate: Overall class performance, Strong performers, Students needing attention, Teaching recommendation.
Maximum 5 bullet points. Plain text only.
`;
        const aiResult = await model.generateContent(prompt);
        const rawText = extractAIText(aiResult);
        await logAIUsage(userInfo, "Teacher Dashboard", `Class Analytics (${subject})`, aiResult.usageMetadata || aiResult.response?.usageMetadata);

        res.json({ analysis: rawText, chartData: classData });
    } catch (err) {
        console.error("🚨 CLASS ANALYTICS CRASH:", err);
        res.status(500).json({ error: "Failed to generate class analytics.", details: err.message });
    }
};

// ==========================================
// 9 & 10. LANGUAGE TRANSLATOR 
// ==========================================
export const translateText = async (req, res) => {
    const { text, targetLanguage, userInfo } = req.body;
    if (!text || !targetLanguage) return res.status(400).json({ error: "Text and target language required" });

    try {
        const prompt = `Translate the following text into ${targetLanguage}. Return ONLY the translated text. Preserve formatting. Text: "${text}"`;
        const aiResult = await model.generateContent(prompt);
        const rawText = extractAIText(aiResult);
        await logAIUsage(userInfo, "Teacher Dashboard", `Language Translator`, aiResult.usageMetadata || aiResult.response?.usageMetadata);
        res.json({ translation: rawText.trim() });
    } catch (err) {
        console.error("🚨 TRANSLATION CRASH:", err);
        res.status(500).json({ error: "Failed to translate text.", details: err.message });
    }
};

// ==========================================
// 11. UNIFIED TEACHER CHATBOT 
// ==========================================
export const teacherChatbot = async (req, res) => {
    const { message, userInfo } = req.body; 
    const userId = userInfo?.id || 3; 

    if (!message) return res.status(400).json({ error: "Message is required" });

    try {
        const historyResult = await pool.query(
            `SELECT role, message_content FROM (
                SELECT role, message_content, created_at 
                FROM ai_chat_messages 
                WHERE student_id = $1 
                ORDER BY created_at DESC 
                LIMIT 10
            ) sub ORDER BY created_at ASC`,
            [userId]
        );

        const chatHistory = historyResult.rows.map(row => ({
            role: row.role === 'ai' ? 'model' : 'user', 
            parts: [{ text: row.message_content }]
        }));

        const prompt = `
You are an AI Teacher Assistant. You help teachers with Lesson Planning, Question Papers, Assessments, and Classroom Management.
Conversation History:
${chatHistory.map(chat => `${chat.role === "model" ? "Assistant" : "Teacher"}: ${chat.parts[0].text}`).join("\n")}

Teacher's latest question: "${message}"

IMPORTANT: Analyze the language and script of the Teacher's latest question. You MUST reply entirely in that exact same language and script. Plain text only.
`;
    
        await pool.query(
            `INSERT INTO ai_chat_messages (student_id, role, message_content, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
            [userId, 'user', message]
        );

        const aiResult = await model.generateContent(prompt);
        const aiReply = extractAIText(aiResult);

        await logAIUsage(userInfo, "Teacher Dashboard", "Teacher AI Chatbot", aiResult.usageMetadata || aiResult.response?.usageMetadata);

        await pool.query(
            `INSERT INTO ai_chat_messages (student_id, role, message_content, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
            [userId, 'ai', aiReply]
        );

        res.json({ reply: aiReply });
    } catch (err) {
        console.error("🚨 CHATBOT CRASH:", err);
        res.status(500).json({ error: "Chat failed.", details: err.message });
    }
};

// ==========================================
// 12. GOOGLE CLOUD TEXT-TO-SPEECH CONTROLLER 
// ==========================================
export const handleTextToSpeech = async (req, res) => {
    const { text, language = "English", userInfo } = req.body; 
    if (!text) return res.status(400).json({ error: "Text is required for speech synthesis" });

    try {
        let finalLangCode = "en-IN";
        let finalVoiceName = "en-IN-Neural2-B"; 

        if (/[\u0C00-\u0C7F]/.test(text)) { finalLangCode = "te-IN"; finalVoiceName = "te-IN-Standard-A"; }
        else if (/[\u0C80-\u0CFF]/.test(text)) { finalLangCode = "kn-IN"; finalVoiceName = "kn-IN-Standard-A"; }
        else if (/[\u0D00-\u0D7F]/.test(text)) { finalLangCode = "ml-IN"; finalVoiceName = "ml-IN-Standard-A"; }
        else if (/[\u0980-\u09FF]/.test(text)) { finalLangCode = "bn-IN"; finalVoiceName = "bn-IN-Standard-A"; }
        else if (/[\u0B80-\u0BFF]/.test(text)) { finalLangCode = "ta-IN"; finalVoiceName = "ta-IN-Standard-A"; }
        else if (/[\u0900-\u097F]/.test(text)) { 
            if (language === "Marathi") { finalLangCode = "mr-IN"; finalVoiceName = "mr-IN-Standard-A"; }
            else { finalLangCode = "hi-IN"; finalVoiceName = "hi-IN-Neural2-A"; }
        }

        const request = {
            input: { text: text },
            voice: { languageCode: finalLangCode, name: finalVoiceName }, 
            audioConfig: { audioEncoding: 'MP3' },
        };

        const [response] = await ttsClient.synthesizeSpeech(request);
        await logAIUsage(userInfo, "Teacher Dashboard", "Text-to-Speech (Listen)", null);

        res.json({ status: "success", audioData: response.audioContent.toString('base64') });
    } catch (err) {
        console.error("🚨 GOOGLE TTS CRASH:", err);
        res.status(500).json({ error: "Voice generation failed", details: err.message });
    }
};

// ==========================================
// 13. COMPETITIVE EXAM PREP MODULE (Topic Constrained)
// ==========================================
export const generateCompetitiveContent = async (req, res) => {
    const { 
        examTarget, 
        subject, 
        topic, 
        taughtTopics = [], 
        classLevel, 
        contentType, 
        userInfo, 
        totalMarks, 
        examDifficulty = 'Medium',
        scheduledStartTime, 
        scheduledEndTime  
    } = req.body;
    
    if (!examTarget || !subject || !contentType || !classLevel) {
        return res.status(400).json({ error: "Exam target, subject, class level, and content type are required." });
    }

    const validDifficulties = ['Easy', 'Medium', 'Hard']; 
    const validatedDifficulty = validDifficulties.includes(examDifficulty) ? examDifficulty : 'Medium';

    const validMarks = [20, 30, 50, 70, 100];
    let questionCount = 0;

    if (contentType !== "PrepMaterial") {
        if (!totalMarks || !validMarks.includes(parseInt(totalMarks))) {
            return res.status(400).json({ error: "For exams, totalMarks must be exactly 20, 30, 50, 70, or 100." });
        }
        questionCount = parseInt(totalMarks);
    }

    try {
        let prompt = "";
        let isJsonExpected = false;
        
        const classNumStr = classLevel.replace(/\D/g, '') || "8"; 
        const classNum = parseInt(classNumStr);
        
        let trackInfo = "Standard Competitive Track: +4 Marks, -1 Negative Marking.";
        if (examBlueprints[classNumStr] && examBlueprints[classNumStr][examTarget]) {
            trackInfo = examBlueprints[classNumStr][examTarget];
        } else if (classNum >= 1 && classNum <= 5) {
            trackInfo = "Spark Junior Track: +2 Marks, NO Negative Marking.";
        } else if (classNum >= 11 && classNum <= 12) {
            trackInfo = "Target Elite Track: Strict national patterns (+4/-1).";
        }

        const topicInstruction = taughtTopics && taughtTopics.length > 0 
            ? `CRITICAL: You MUST ONLY generate content/questions from the following taught topics: ${taughtTopics.join(', ')}. DO NOT include concepts from any other part of the syllabus.`
            : `Generate content/questions covering the standard syllabus for "${topic}".`;

        const classGuardrail = `
🚨 CRITICAL AGE, SYLLABUS & BLUEPRINT CONSTRAINT 🚨
Target Exam: ${examTarget}
Student Class: ${classLevel} (Approx age: ${classNum + 5} years old)
Institutional Track Guidelines: ${trackInfo}

INSTRUCTIONS:
1. ${topicInstruction}
2. You MUST ONLY use concepts strictly appropriate for a Class ${classLevel} syllabus, adhering to the SGS Eduhunt micro-schedules. 
3. Difficulty Level: ${validatedDifficulty}.
`;

        if (contentType === "PrepMaterial") {
            prompt = `
You are an expert ${examTarget} faculty. Generate preparation material for Class ${classLevel}, Subject: ${subject}, Topic: "${topic}".
${classGuardrail}
Provide:
1. Key Concepts
2. Important definitions
3. Common pitfalls
`;
        } else {
            isJsonExpected = true;
            prompt = `
You are an expert ${examTarget} paper setter.
Generate EXACTLY ${questionCount} multiple-choice questions for ${subject} on "${topic}". Each question is 1 mark.

${classGuardrail}

🚨 Return ONLY valid JSON matching this exact structure. Do NOT use markdown code blocks (\`\`\`json).
{
  "exam": "${examTarget}",
  "subject": "${subject}",
  "topic": "${topic}",
  "classLevel": "${classLevel}",
  "difficulty": "${validatedDifficulty}",
  "totalMarks": ${questionCount},
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": "Exact text of the correct option",
      "marks": 1,
      "difficulty": "${validatedDifficulty}",
      "detailedSolution": "Step-by-step explanation using ONLY Class ${classLevel} logic."
    }
  ]
}
`;
        }

        const aiResult = await model.generateContent(prompt);
        const rawText = extractAIText(aiResult);
        
        await logAIUsage(
            userInfo, 
            "Competitive Prep Module", 
            `Generate Standardized ${contentType}`, 
            aiResult.usageMetadata || aiResult.response?.usageMetadata
        );

        if (isJsonExpected) {
            let cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("AI did not return a valid JSON format.");
            
            const examData = JSON.parse(jsonMatch[0]);

            return res.json({
                message: "Preview generated successfully.",
                scheduleData: {
                    startTime: scheduledStartTime || "Not set",
                    endTime: scheduledEndTime || "Not set"
                },
                previewData: examData
            });

        } else {
            return res.json({ prepMaterial: rawText });
        }

    } catch (err) {
        console.error("🚨 COMPETITIVE EXAM CRASH:", err);
        res.status(500).json({ error: "Failed to generate competitive content.", details: err.message });
    }
};
