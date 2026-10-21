import express from 'express';
import { 
    getAssignmentReport,
    getWeeklyTestReports, // ✅ Added missing import
    getAcademicAnalytics, 
    getTeacherPerformance, 
    translateForHeadmaster 
} from '../controllers/headmasterController.js';

const router = express.Router();

// 👨‍🏫 Headmaster Dashboard Routes
// ALL changed to POST to support DB Usage Logging via req.body.userInfo
router.post('/assignment-report', getAssignmentReport); 
router.post('/weekly-test-report', getWeeklyTestReports); // ✅ Added missing route
router.post('/academic-analytics', getAcademicAnalytics); 
router.post('/teacher-performance', getTeacherPerformance); 
router.post('/translate', translateForHeadmaster); 

export default router;