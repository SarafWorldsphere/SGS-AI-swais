import express from 'express';
import { 
    generateLessonPlan, 
    generateQuestionPaper,
    rewriteOrReplaceQuestion,
    saveQuestionPaper,
    getSavedQuestionPapers,
    autoCorrectAnswer,
    generateAssignmentReminders,
    getAssignmentCompletionAlerts, 
    getSingleStudentAnalytics,   
    getClassAnalytics, 
    translateText,
    teacherChatbot,
    processVirtualSlateContent,
    handleTextToSpeech
} from '../controllers/teacherController.js';

import { generateCompetitiveContent } from '../controllers/competitiveController.js';
import { postDoubt, getCommunityDoubts, answerDoubt } from '../controllers/communityController.js';

const router = express.Router();

// ==========================================
// 1. Auto Content Generation (Lesson Plan & Question Paper)
// ==========================================
router.post('/lesson-plan', generateLessonPlan);
router.post('/question-paper', generateQuestionPaper);
router.post('/generate-question-paper', generateQuestionPaper);
router.post('/correct-answer', autoCorrectAnswer);

// ==========================================
// 1B. Auto Test - Rewrite & Replace Question (Supports POST, PUT, PATCH)
// ==========================================
const handleRewrite = (req, res) => {
    req.body = { ...(req.body || {}), action: req.body?.action || 'rewrite' };
    return rewriteOrReplaceQuestion(req, res);
};

const handleReplace = (req, res) => {
    req.body = { ...(req.body || {}), action: req.body?.action || 'replace' };
    return rewriteOrReplaceQuestion(req, res);
};

router.all('/question-paper/rewrite', handleRewrite);
router.all('/question-paper/replace', handleReplace);
router.all('/rewrite-question', handleRewrite);
router.all('/replace-question', handleReplace);
router.all('/question/rewrite', handleRewrite);
router.all('/question/replace', handleReplace);

// ==========================================
// 1C. Auto Test - Save & Retrieve Question Papers
// ==========================================
router.post('/question-paper/save', saveQuestionPaper);
router.post('/save-question-paper', saveQuestionPaper);
router.get('/question-paper/saved', getSavedQuestionPapers);
router.get('/saved-question-papers', getSavedQuestionPapers);
router.get('/question-papers', getSavedQuestionPapers);

// ==========================================
// 2. Alerts & Reminders
// ==========================================
router.post('/assignment-reminders', generateAssignmentReminders); 
router.post('/completion-alerts', getAssignmentCompletionAlerts); 

// ==========================================
// 3. Analytics (Supports subject filtering in the controller)
// ==========================================
router.post('/student-analytics', getSingleStudentAnalytics);    
router.post('/class-analytics', getClassAnalytics);

// ==========================================
// 4. Utilities & Tools
// ==========================================
router.post('/translate', translateText);
router.post('/chat', teacherChatbot); 
router.post('/virtual-slate', processVirtualSlateContent); 

// ==========================================
// 5. Speech Services
// ==========================================
router.post('/speak', handleTextToSpeech);

// ==========================================
// 6. Competitive Exam Route (Used by both Student and Teacher dashboards)
// ==========================================
router.post('/competitive/generate', generateCompetitiveContent);

// ==========================================
// 7. Community Doubt Forum Routes
// ==========================================
router.post('/community/doubt', postDoubt);          // Ask a doubt
router.get('/community/doubts', getCommunityDoubts); // View all doubts feed
router.post('/community/answer', answerDoubt);       // Answer a doubt

export default router;