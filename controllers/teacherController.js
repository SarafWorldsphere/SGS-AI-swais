import { logAIUsage } from '../utils/aiTracker.js';
import model from '../config/aiConfig.js';
import { withClient } from "../config/db.js";
import textToSpeech from '@google-cloud/text-to-speech'; 

// Google Cloud TTS Client Initialize using your API KEY from .env
const ttsClient = new textToSpeech.TextToSpeechClient({
    apiKey: process.env.GOOGLE_TTS_API_KEY
});

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
// Reference: "PT2 Exam Question paper pattern (1).pdf" & "PT1 and PT3 patterns.pdf"
// =========================================================================
const schoolExamBlueprints = {
    // -----------------------------------------------------------------------
    // PT-1 & PT-3 PATTERNS (50 MARKS TOTAL)
    // -----------------------------------------------------------------------
    "PT1_PT3": {
        "Maths": {
            "default": `Blueprint (50 Marks):
- Section I: Multiple Choice Questions (MCQs) [10 x 1M = 10 Marks]
- Section II: Short Problems (2 Marks) [5 x 2M = 10 Marks]
- Section III: Short Problems (3 Marks) [4 x 3M = 12 Marks]
- Section IV: Long Problems (5 Marks) [2 x 5M = 10 Marks]
- Section V: Case Study Questions [2 x 4M = 8 Marks]`
        },
        "Science": {
            "Class 6": `Blueprint (50 Marks):
- Section I: MCQs [10 x 1M = 10 Marks]
- Section II: Fill in the Blanks [5 x 1M = 5 Marks]
- Section III: Picture Identification / Observation [5 x 1M = 5 Marks]
- Section IV: Short Answer Questions [5 x 2M = 10 Marks]
- Section V: Long Answer Questions [2 x 5M = 10 Marks]
- Section VI: Case Study [1 x 5M = 5 Marks]
- Section VII: Diagram / Drawing based question [1 x 5M = 5 Marks]`,
            "Class 7": `Blueprint (50 Marks):
- Section I: MCQs [10 x 1M = 10 Marks]
- Section II: Fill in the Blanks [5 x 1M = 5 Marks]
- Section III: Case Study [1 x 5M = 5 Marks]
- Section IV: Picture Identification [5 x 1M = 5 Marks]
- Section V: Short Answer Questions [5 x 2M = 10 Marks]
- Section VI: Long Answer Questions [2 x 5M = 10 Marks]
- Section VII: Diagram / Labeling [1 x 5M = 5 Marks]`,
            "default": `Blueprint (50 Marks split Biology, Chemistry, Physics):
Section A (Biology - ~17M): MCQs (4x1M), Assertion-Reason (2x1M), 2-Mark SAQ (2x2M), 3-Mark SAQ (1x3M), Case Study (4x1M)
Section B (Chemistry - ~16M): MCQs (4x1M), Assertion-Reason (1x1M), 2-Mark SAQ (2x2M), 3-Mark SAQ (1x3M), Case Study (4x1M)
Section C (Physics - ~17M): MCQs (4x1M), Assertion-Reason (2x1M), 2-Mark SAQ (2x2M), 3-Mark SAQ (1x3M), Case Study (4x1M)`
        },
        "Hindi": {
            "Class 6": `Blueprint (50 Marks):
खण्ड - क (30 Marks): शब्दार्थ [5M], विलोम शब्द [5M], वचन [5M], सत्य / असत्य [5M], खाली स्थान भरिए [5M], अपठित गद्यांश [5M]
खण्ड - ख (20 Marks): लघु उत्तरीय प्रश्न [10x1M], दीर्घ उत्तरीय प्रश्न [5x2M]`,
            "Class 7": `Blueprint (50 Marks):
खण्ड - क (30 Marks): शब्दार्थ [5M], विलोम [5M], सत्य/असत्य [4M], वचन [4M], रिक्त स्थान [4M], वाक्य प्रयोग [3M], अपठित गद्यांश [5M]
खण्ड - ख (20 Marks): लघु उत्तरीय प्रश्न [10x1M], दीर्घ उत्तरीय प्रश्न [5x2M]`,
            "Class 8": `Blueprint (50 Marks):
खण्ड - क (30 Marks): शब्दार्थ [4M], विलोम [3M], रिक्त स्थान [4M], वचन [3M], शब्द बनाइए [4M], वाक्य बनाइए [3M], मिलान कीजिए [4M], अपठित गद्यांश [5M]
खण्ड - ख (20 Marks): लघु उत्तरीय प्रश्न [10x1M], दीर्घ उत्तरीय प्रश्न [5x2M]`,
            "default": `Blueprint (50 Marks):
खण्ड - क (30 Marks): शब्दार्थ [5M], विलोम शब्द [5M], वचन [5M], सत्य / असत्य [5M], खाली स्थान भरिए [5M], अपठित गद्यांश [5M]
खण्ड - ख (20 Marks): लघु उत्तरीय प्रश्न [10x1M], दीर्घ उत्तरीय प्रश्न [5x2M]`
        },
        "Telugu": {
            "Class 6": `Blueprint (50 Marks):
- అపరిచిత గద్యం: 4M | లేఖ: 4M | వ్యాసం: 4M
- ఛందస్సు: 4M | సంధులు: 4M | సమాసములు/అలంకారాలు: 4M | జాతీయాలు: 2M | సామెతలు: 2M
- వ్యతిరేక పదాలు: 2M | ప్రకృతి-వికృతులు: 2M | పర్యాయపదాలు: 2M
- 2 మార్కుల ప్రశ్నలు: 2M | సందర్భ వాక్యాలు: 6M | 1 మార్కు ప్రశ్నలు: 4M | ప్రతిపదార్థ భావాలు: 4M`,
            "default": `Blueprint (50 Marks):
- అపరిచిత గద్యం: 5M | వ్యాసం: 5M | లేఖ: 5M
- వ్యాకరణం (అర్థాలు, వ్యతిరేక పదాలు, ప్రకృతి-వికృతులు, సంధి, సమాసం, జాతీయాలు): 15M
- సందర్భ వాక్యాలు: 6M | ఒక్క మార్కు ప్రశ్నలు: 5M | మూడు మార్కుల ప్రశ్నలు: 6M | ఉపవాచకం: 3M`
        },
        "English": {
            "default": `Blueprint (50 Marks):
- Section A (Reading): Unseen Passage 1 [5M] + Unseen Passage 2 [5M] = 10 Marks
- Section B (Writing Skills): Notice, Diary Entry, Letter/Email [12 Marks]
- Section C (Grammar): Parts of speech, Tenses, Determiners, Editing [8 Marks]
- Section D (Literature): Extracts [4 Marks] + Short Answer Questions [10 Marks] + Long Answer Question [6 Marks]`
        }
    },

    // -----------------------------------------------------------------------
    // PT-2 & PT-4 PATTERNS (80 MARKS TOTAL)
    // -----------------------------------------------------------------------
    "PT2_PT4": {
        "Maths": {
            "default": `Blueprint (80 Marks):
- Section I: MCQs [20 x 1M = 20 Marks]
- Section II: Short Answer Type I [5 x 2M = 10 Marks]
- Section III: Short Answer Type II [6 x 3M = 18 Marks]
- Section IV: Long Answer Questions [4 x 5M = 20 Marks]
- Section V: Case Study Based Questions [3 x 4M = 12 Marks]`
        },
        "Science": {
            "Class 6": `Blueprint (80 Marks):
- MCQs [10x1M], Match the following [2x5M], Identify Pictures [5x1M], Fill in the Blanks [5x1M], True or False [5x1M], Case Study [1x5M], One Word [5x1M], 2-Mark QA [5x2M], Long Answer [4x5M], Diagram [1x5M]`,
            "Class 7": `Blueprint (80 Marks):
- MCQs [10x1M], Match the Following [2x5M], Picture ID [5x1M], Fill in the Blanks [5x1M], True or False [5x1M], Case Study [1x5M], One Word [5x1M], Short QA [5x2M], Long Answer [4x5M], Diagram [1x5M]`,
            "default": `Blueprint (80 Marks across Bio, Chem, Phys):
Each Section contains ~26-27 Marks: MCQs (6x1M), Assertion-Reason (1x1M), Short Answer (2M), Short Answer (3M), Long Answer (4M/5M), Case Study (5M)`
        },
        "Social Studies": {
            "default": `Blueprint (80 Marks):
- Section A (20M Objective): Fill in the Blanks (4M), MCQs (4M), True/False (2M), Assertion-Reason (2M), Matching (4M), Picture ID (4M)
- Section B (48M Descriptive): Very Short QA [4x2M], Short QA [5x3M], Long QA [5x5M]
- Section C (12M Applied): Case Study Passages [3x4M]`
        },
        "English": {
            "default": `Blueprint (80 Marks):
- Section A (Reading - 22M): Unseen Passage 1 (12M), Unseen Passage 2 (10M)
- Section B (Writing - 22M): Short Task (5M), Letter/Email (5M), Article/Essay (6M), Picture Composition (6M)
- Section C (Grammar - 10M): Fill in blanks/Editing/Tenses
- Section D (Literature - 26M): 2 Extracts (8M), 5 Short QA (10M), 2 Long QA (8M)`
        },
        "Hindi": {
            "Class 6": `Blueprint (80 Marks): गिनती 1-20 [10M], शब्दार्थ [6M], विलोम [5M], वचन [5M], लिंग [5M], खाली स्थान [5M], सत्य/असत्य [5M], द्वित्वाक्षर [5M], मिलान [5M], अपठित गद्यांश [5M], पठित गद्यांश [5M], लघु उत्तर [10M], दीर्घ उत्तर [10M]`,
            "Class 7": `Blueprint (80 Marks): शब्दार्थ [5M], वचन [5M], गिनती [5M], विलोम [5M], खाली स्थान [5M], सत्य/असत्य [5M], वाक्य बनाइए [5M], द्वित्वाक्षर [5M], अपठित गद्यांश [5M], पठित गद्यांश [5M], लघु उत्तर [10M], दीर्घ उत्तर [10M], पाँच वाक्य लिखिए [5M]`,
            "default": `Blueprint (80 Marks):
खण्ड-क (35M): शब्दार्थ, वचन, विलोम, सत्य/असत्य, वाक्य प्रयोग, रिक्त स्थान, शब्द बनाइए (5M each)
खण्ड-ख (15M): वाक्यांश के लिए एक शब्द, पठित गद्यांश, अपठित गद्यांश (5M each)
खण्ड-ग (30M): लघु उत्तरीय (10M), दीर्घ उत्तरीय (12M), व्याख्या (8M)`
        },
        "Telugu": {
            "Class 6": `Blueprint (80 Marks): అపరిచిత గద్యం (5M), లేఖ (5M), వ్యాసం (6M), వ్యాకరణం (5M), అర్థాలు/వ్యతిరేక/ప్రకృతి-వికృతులు (12M), సొంత వాక్యాలు (6M), సందర్భ వాక్యాలు (6M), ప్రతిపదార్థ భావం (6M), 1M/2M/3M ప్రశ్నలు (22M), ఉపవాచకం (6M)`,
            "Class 7": `Blueprint (80 Marks): అపరిచిత గద్యం (5M), లేఖ (5M), వ్యాసం (5M), వ్యాకరణం (5M), అర్థాలు/వ్యతిరేక/ప్రకృతి-వికృతులు (9M), పర్యాయపదాలు (4M), సొంత వాక్యాలు/జాతీయాలు (8M), సందర్భ వాక్యాలు/ప్రతిపదార్థం (12M), 1M/2M/3M ప్రశ్నలు (22M), ఉపవాచకం (6M)`,
            "default": `Blueprint (80 Marks): లేఖలు/అపరిచిత గద్యం/వ్యాసాలు (15M), ఛందస్సు/అలంకారాలు/సంధులు/సమాసాలు (15M), అర్థాలు/ప్రకృతి-వికృతులు/పర్యాయపదాలు (8M), జాతీయాలు/సామెతలు (6M), 1M/2M/3M ప్రశ్నలు (16M), సందర్భ వాక్యాలు/ప్రతిపదార్థం (12M), ఉపవాచకం (8M)`
        },
        "Computer": {
            "default": `Blueprint (80 Marks):
- Section A (30M Objective): MCQs, Fill Blanks, True/False, Matching, Assertion/Task ID
- Section B (44M Descriptive): Very Short, Short, Long, Very Long Questions
- Section C (6M): Case Study / Diagram`
        }
    }
};

/**
 * Standardize subject names for dictionary matching
 */
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

/**
 * Retrieve the exact blueprint pattern based on requested parameters
 */
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
    } = req.body;

    const teacherId = userInfo?.id || 3;

    if (!chapterId) return res.status(400).json({ error: "Chapter ID is required" });

    try {
        const result = await withClient(req, async (client) => {
            return await client.query(
                'SELECT chapter_name, full_text_content FROM chapter_content WHERE chapter_id = $1', 
                [chapterId]
            );
        });

        if (result.rows.length === 0) return res.status(404).json({ error: "Chapter not found in database" });
        
        const { chapter_name, full_text_content } = result.rows[0];
        const finalTopic = topic && topic.trim() !== '' ? topic : chapter_name;

        const prompt = `
You are an expert school teacher. Create a day-wise lesson plan for the chapter "${finalTopic}".
You have exactly ${noOfPeriods} days (periods) to complete this chapter.

TEXTBOOK CONTENT:
"""
${full_text_content}
"""

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

        const aiResult = await model.generateContent(prompt);
        
        let cleanedText = aiResult.text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) throw new Error("Failed to parse AI output into valid JSON.");
        const structuredPlan = JSON.parse(jsonMatch[0]);

        await logAIUsage(
            userInfo, 
            "Teacher Dashboard", 
            "Generate Day-wise Lesson Plan", 
            aiResult.usageMetadata || aiResult.response?.usageMetadata
        );

        await withClient(req, async (client) => {
            await client.query(
                `INSERT INTO lesson_plans (teacher_id, title, chapter_id, chapter_text, duration_minutes, created_at)
                 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
                [teacherId, `Day-wise Plan: ${finalTopic}`, chapterId, chapter_name, durationMinutes]
            );
        });

        res.json({ lessonPlan: structuredPlan });
    } catch (err) {
        console.error("🚨 LESSON PLAN CRASH:", err);
        res.status(500).json({ error: "Failed to generate lesson plan.", details: err.message });
    }
};

// ==========================================
// 2. AUTO QUESTION PAPER GENERATOR (CONSTRAINED, TIERED & BLUEPRINT)
// ==========================================
export const generateQuestionPaper = async (req, res) => {
    try {
        const body = req.body || {};
        const { 
            chapterId, 
            difficulty = 'Core', 
            taughtTopics = [], 
            examType = 'PT2',     
            questionType = 'All', 
            totalMarks = 80,
            classLevel = 'Class 8', 
            subject = 'Select',
            userInfo 
        } = body;

        if (!chapterId || chapterId === 'Select chapter first' || String(chapterId).includes('Select')) {
            return res.status(400).json({ error: "Please select a valid Class, Subject, and Chapter before generating." });
        }

        const validDifficulties = ['Foundational', 'Core', 'Advanced'];
        const validatedDifficulty = validDifficulties.includes(difficulty) ? difficulty : 'Core';

        const result = await withClient(req, async (client) => {
            return await client.query(
                'SELECT chapter_name, full_text_content FROM chapter_content WHERE chapter_id = $1', 
                [chapterId]
            );
        });
        
        if (result.rows.length === 0) return res.status(404).json({ error: "Chapter not found in database" });
        const { chapter_name, full_text_content } = result.rows[0];

        const topicInstruction = taughtTopics && taughtTopics.length > 0 
            ? `CRITICAL SYLLABUS CONSTRAINT: You MUST ONLY generate questions from the following CBSE syllabus taught topics: ${taughtTopics.join(', ')}. DO NOT generate questions from any other part of the chapter or outside the syllabus.`
            : `CRITICAL SYLLABUS CONSTRAINT: Generate questions ONLY from the provided CBSE textbook content. Do not include out-of-syllabus topics.`;

        const matchedBlueprint = getSchoolBlueprint(examType, classLevel, subject);
        let patternInstruction = "";

        if (matchedBlueprint) {
            patternInstruction = `
CRITICAL OFFICIAL SCHOOL BLUEPRINT:
You MUST strictly model this paper according to the official Godavari Devi Saraf School Pattern for ${classLevel} - ${subject} (${examType}):
"""
${matchedBlueprint}
"""
Organize your questions to reflect these exact marks and sectional structures. Map the "section" key in the JSON appropriately (e.g., "Section A - MCQs" or "खण्ड - क").`;
        } else {
            const isSpecificType = questionType && questionType !== 'All';
            patternInstruction = isSpecificType 
                ? `CRITICAL: Generate ONLY "${questionType}" questions. The entire paper MUST consist exclusively of ${questionType} questions.`
                : `Generate a balanced mix of objective, short answer, and long answer questions.`;
        }

        const prompt = `
You are an expert school exam paper setter for SMT. GODAVARI DEVI SARAF SENIOR SECONDARY SCHOOL.
Create a highly accurate, structured Question Paper based STRICTLY on the provided textbook content.

EXAM PARAMETERS:
Class: ${classLevel}
Subject: ${subject}
Chapter: "${chapter_name}"
Exam Name: ${examType}
Difficulty Tier: ${validatedDifficulty} (Adjust complexity accordingly)
Target Total Marks: ${totalMarks}

TEXTBOOK CONTENT:
"""
${full_text_content}
"""

INSTRUCTIONS:
1. ${topicInstruction}
2. ${patternInstruction}
3. The sum of all question marks MUST add up exactly to ${totalMarks}.
4. Return STRICTLY a valid JSON array of objects. Do not include markdown code block formatting outside the array.

Ensure the output EXACTLY matches this schema:
[
  {
    "section": "Section Name / Heading (e.g., Section A, खण्ड - क, or I అపరిచిత గద్యం)",
    "questionNumber": 1,
    "question": "The question text",
    "type": "MCQ | Short Answer | Long Answer | Fill in the Blanks | True/False | Matching | Case Study | Diagram",
    "options": ["Option A", "Option B", "Option C", "Option D"], // Array of strings for MCQs or Matching pairs; otherwise null
    "answer": "The correct answer and marking scheme explanation",
    "marks": 1
  }
]
`;

        const aiResult = await model.generateContent(prompt);
        
        let cleanedText = aiResult.text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
        
        if (!jsonMatch) {
            throw new Error("Failed to parse AI output into valid JSON array structure.");
        }
        const structuredQuestions = JSON.parse(jsonMatch[0]);

        await logAIUsage(
            userInfo, 
            "Teacher Dashboard - Auto Test", 
            `Generate School Paper (${examType} - ${subject} - ${classLevel} - ${validatedDifficulty})`, 
            aiResult.usageMetadata || aiResult.response?.usageMetadata
        );

        res.json({ questions: structuredQuestions });

    } catch (err) {
        console.error("🚨 QUESTION PAPER CRASH:", err);
        res.status(500).json({ error: "Failed to generate question paper.", details: err.message });
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

Question
"${question}"

Maximum Marks
${maxMarks}

Teacher Rubric
"${rubric}"

Student Answer
"${studentAnswer}"

Evaluate fairly.
Award partial marks where appropriate.

Return ONLY valid JSON.
Do NOT return markdown.
Do NOT use backticks.

Return
{
   "awardedMarks":0,
   "feedback":"..."
}
`;

        const aiResult = await model.generateContent(prompt);
        
        await logAIUsage(userInfo, "Teacher Dashboard", "Auto Answer Sheet Corrector", aiResult.usageMetadata || aiResult.response?.usageMetadata);

        let cleanedText = aiResult.text.replace(/```json/gi, '').replace(/```/g, '').trim();
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
        const dbResult = await withClient(req, async (client) => {
            return await client.query(`
                SELECT s.full_name AS student, a.title AS task, a.assessment_date AS due
                FROM assessment_results ar
                JOIN assessments a ON ar.assessment_id = a.assessment_id
                JOIN student_master s ON ar.student_id = s.student_id
                WHERE ar.is_absent = true OR ar.marks_obtained IS NULL
                LIMIT 5;
            `);
        });

        const missingAssignments = dbResult.rows;

        const prompt = `
Write a professional email reminder for parents.

Requirements
- Maximum 3 short paragraphs.
- Friendly.
- Professional.
- Encouraging.
- Mention assignment submission politely.
- Use placeholder [Student Name].
- Use placeholder [Assignment Name].

Do not use markdown.
Do not use HTML.
Do not use code blocks.
`;

        const aiResult = await model.generateContent(prompt);
        
        await logAIUsage(userInfo, "Teacher Dashboard", "Assignment Due Date Alerts", aiResult.usageMetadata || aiResult.response?.usageMetadata);

        res.json({ reminderEmail: aiResult.text, list: missingAssignments });
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
        const dbResult = await withClient(req, async (client) => {
            return await client.query(`
                SELECT a.title AS task, COUNT(ar.student_id) as total_submitted, ROUND(AVG(ar.percentage), 2) as avg_score
                FROM assessment_results ar
                JOIN assessments a ON ar.assessment_id = a.assessment_id
                WHERE a.teacher_id = $1 AND ar.marks_obtained IS NOT NULL
                GROUP BY a.title
                ORDER BY a.assessment_date DESC
                LIMIT 5;
            `, [teacherId]);
        });

        const completions = dbResult.rows;

        const prompt = `
You are an AI teaching assistant.

Review the following assignment statistics.
${JSON.stringify(completions)}

Generate a short report.
Include:
- Submission trend
- Average performance
- Students requiring attention

Maximum 3 bullet points.
No markdown.
No HTML.
No LaTeX.
Plain text only.
`;
        
        const aiResult = await model.generateContent(prompt);
        
        await logAIUsage(userInfo, "Teacher Dashboard", "Assignment Completion Alerts", aiResult.usageMetadata || aiResult.response?.usageMetadata);

        res.json({ completionAlert: aiResult.text, data: completions });
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

Teacher's rough notes:
"${rawText}"

Task
${instruction}

Formatting Rules
- Create clean notes.
- Use headings.
- Use bullet points.
- Do not use markdown code blocks.
- Do not use HTML.
- Do not use ASCII art.
- Do not use LaTeX.
- Do not use $.
- Make notes suitable for classroom teaching.
`;

        const aiResult = await model.generateContent(prompt);
        
        await logAIUsage(userInfo, "Teacher Dashboard", `Virtual Slate (${action})`, aiResult.usageMetadata || aiResult.response?.usageMetadata);

        res.json({ processedContent: aiResult.text });
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

        const studentData = await withClient(req, async (client) => {
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
            
            const dbResult = await client.query(query, params);
            return dbResult.rows;
        });

        if (studentData.length === 0) {
            return res.json({ 
                analysis: "• Overall Performance: No academic data found for this student in your assessments.\nStrengths: Cannot be determined.\nWeaknesses: Cannot be determined.\nOne Recommendation: Conduct and grade an assessment to establish a performance baseline.", 
                chartData: [] 
            });
        }
        
        const prompt = `
You are helping a teacher analyse student performance.

Student Name
${studentName || 'the student'}

Performance Data
${JSON.stringify(studentData)}

Generate
1. Overall Performance
2. Strengths
3. Weaknesses
4. One Recommendation

Maximum 4 bullet points.
Plain text only.
No markdown.
No HTML.
No LaTeX.
No $ symbols.
`;

        const aiResult = await model.generateContent(prompt);
        
        await logAIUsage(userInfo, "Teacher Dashboard", `Student Analytics (${subject})`, aiResult.usageMetadata || aiResult.response?.usageMetadata);

        res.json({ analysis: aiResult.text, chartData: studentData });
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
        const classData = await withClient(req, async (client) => {
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
            
            const dbResult = await client.query(query, params);
            return dbResult.rows;
        });

        if (classData.length === 0) {
            return res.json({ 
                analysis: "• Overall class performance: No academic data found for this class in your assessments.\nStrong performers: Cannot be determined.\nStudents needing attention: Cannot be determined.\nTeaching recommendation: Conduct and grade an assessment to establish a performance baseline.", 
                chartData: [] 
            });
        }

        const prompt = `
You are analysing an entire classroom.

Data
${JSON.stringify(classData)}

Generate
- Overall class performance
- Strong performers
- Students needing attention
- Teaching recommendation

Maximum 5 bullet points.
Plain text only.
No markdown.
No HTML.
No LaTeX.
No $.
`;
    
        const aiResult = await model.generateContent(prompt);
        
        await logAIUsage(userInfo, "Teacher Dashboard", `Class Analytics (${subject})`, aiResult.usageMetadata || aiResult.response?.usageMetadata);

        res.json({ analysis: aiResult.text, chartData: classData });
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
        const prompt = `
Translate the following text into ${targetLanguage}.

Requirements
- Return ONLY the translated text.
- Do not explain.
- Do not add quotation marks.
- Preserve formatting.
- Preserve bullet points if present.
- Do not use markdown.

Text
"${text}"
`;
        
        const aiResult = await model.generateContent(prompt);
        
        await logAIUsage(userInfo, "Teacher Dashboard", `Language Translator`, aiResult.usageMetadata || aiResult.response?.usageMetadata);

        res.json({ translation: aiResult.text.trim() });
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
        const chatHistory = await withClient(req, async (client) => {
            const historyResult = await client.query(
                `SELECT role, message_content FROM (
                    SELECT role, message_content, created_at 
                    FROM ai_chat_messages 
                    WHERE student_id = $1 
                    ORDER BY created_at DESC 
                    LIMIT 10
                ) sub ORDER BY created_at ASC`,
                [userId]
            );

            return historyResult.rows.map(row => ({
                role: row.role === 'ai' ? 'model' : 'user', 
                parts: [{ text: row.message_content }]
            }));
        });

        const prompt = `
You are an AI Teacher Assistant.

You help teachers with
- Lesson Planning
- Question Papers
- Student Assessment
- Classroom Management
- Curriculum Design
- Translation
- Parent Communication

Conversation History
${chatHistory
    .map(chat => `${chat.role === "model" ? "Assistant" : "Teacher"}: ${chat.parts[0].text}`)
    .join("\n")}

Teacher's latest question:
"${message}"

IMPORTANT RESPONSE RULES:
- AUTO-LANGUAGE DETECTION: Analyze the language and script of the Teacher's latest question. You MUST reply entirely in that exact same language and script. (e.g., if the question is in Hindi, reply in Hindi; if Telugu, reply in Telugu; if English, reply in English).
- Be concise but complete.
- Never use Markdown tables.
- Never use Markdown code blocks.
- Never use HTML.
- Never use ASCII diagrams.
- Never use LaTeX.
- Never use $ or $$.
- Write mathematical expressions in plain text.
- Use headings and bullet points where helpful.
`;
    
        await withClient(req, async (client) => {
            await client.query(
                `INSERT INTO ai_chat_messages (student_id, role, message_content, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
                [userId, 'user', message]
            );
        });

        const aiResult = await model.generateContent(prompt);
        const aiReply = aiResult.text;

        await logAIUsage(userInfo, "Teacher Dashboard", "Teacher AI Chatbot", aiResult.usageMetadata || aiResult.response?.usageMetadata);

        await withClient(req, async (client) => {
            await client.query(
                `INSERT INTO ai_chat_messages (student_id, role, message_content, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
                [userId, 'ai', aiReply]
            );
        });

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

    if (!text) {
        return res.status(400).json({ error: "Text is required for speech synthesis" });
    }

    try {
        let finalLangCode = "en-IN";
        let finalVoiceName = "en-IN-Neural2-B"; 

        if (/[\u0C00-\u0C7F]/.test(text)) { 
            finalLangCode = "te-IN"; finalVoiceName = "te-IN-Standard-A"; 
        } else if (/[\u0C80-\u0CFF]/.test(text)) { 
            finalLangCode = "kn-IN"; finalVoiceName = "kn-IN-Standard-A"; 
        } else if (/[\u0D00-\u0D7F]/.test(text)) { 
            finalLangCode = "ml-IN"; finalVoiceName = "ml-IN-Standard-A"; 
        } else if (/[\u0980-\u09FF]/.test(text)) { 
            finalLangCode = "bn-IN"; finalVoiceName = "bn-IN-Standard-A"; 
        } else if (/[\u0B80-\u0BFF]/.test(text)) { 
            finalLangCode = "ta-IN"; finalVoiceName = "ta-IN-Standard-A"; 
        } else if (/[\u0900-\u097F]/.test(text)) { 
            if (language === "Marathi") {
                finalLangCode = "mr-IN"; finalVoiceName = "mr-IN-Standard-A";
            } else {
                finalLangCode = "hi-IN"; finalVoiceName = "hi-IN-Neural2-A";
            }
        }

        const request = {
            input: { text: text },
            voice: { languageCode: finalLangCode, name: finalVoiceName }, 
            audioConfig: { audioEncoding: 'MP3' },
        };

        const [response] = await ttsClient.synthesizeSpeech(request);
        
        await logAIUsage(userInfo, "Teacher Dashboard", "Text-to-Speech (Listen)", null);

        res.json({
            status: "success",
            audioData: response.audioContent.toString('base64')
        });

    } catch (err) {
        console.error("🚨 GOOGLE TTS CRASH:", err);
        res.status(500).json({ error: "Voice generation failed", details: err.message });
    }
};

// ==========================================
// 13. COMPETITIVE EXAM PREP MODULE
// ==========================================
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

export const generateCompetitiveContent = async (req, res) => {
    const { 
        examTarget, 
        subject, 
        topic, 
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
        
        let trackInfo = "";
        const classNum = parseInt(classLevel.replace(/\D/g, '')) || 8;

        if (classNum >= 1 && classNum <= 5) {
            trackInfo = "Spark Junior Track: +2 Marks, NO Negative Marking.";
        } else if (classNum >= 6 && classNum <= 8) {
            trackInfo = "Pre-Foundation Spark / CEAM: +4 Marks, -1 Negative Marking.";
        } else if (classNum >= 9 && classNum <= 10) {
            trackInfo = "Cream Specialized Track: Heavy execution testing. +4 Marks, -1 Negative Marking.";
        } else if (classNum >= 11 && classNum <= 12) {
            trackInfo = "Target Elite Track: Strict national patterns (+4/-1).";
        }

        const classGuardrail = `
🚨 CRITICAL AGE, SYLLABUS & AP CBSE BLUEPRINT CONSTRAINT 🚨
Target Exam: ${examTarget}
Student Class: ${classLevel} (Approx age: ${classNum + 5} years old)
Institutional Track Guidelines: ${trackInfo}`;

        // Example competitive implementation logic (Placeholder structure to match current controller)
        res.json({ message: "Competitive module initialized with parameters.", guardrail: classGuardrail });

    } catch (err) {
        console.error("🚨 COMPETITIVE EXAM CRASH:", err);
        res.status(500).json({ error: "Failed to generate competitive content.", details: err.message });
    }
};