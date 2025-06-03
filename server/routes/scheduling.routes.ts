import { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware'; // Assuming authentication is needed
import {
  getSessions,
  getSessionDetails,
  getSessionsByDateRange,
  getTrainers,
  getActiveTrainers,
  getStudents,
  getStudentsWithLeads
} from '../controllers/scheduling.controller';

const router = Router();

// Apply authentication middleware to all scheduling routes
router.use(isAuthenticated);

// Session Routes
router.get('/sessions', getSessions);
router.get('/sessions/details', getSessionDetails); // Specific route for detailed sessions
router.get('/sessions/range', getSessionsByDateRange); // Route for date-range filtering

// Trainer Routes
router.get('/trainers', getTrainers);
router.get('/trainers/active', getActiveTrainers); // Route for active trainers

// Student Routes
router.get('/students', getStudents);
router.get('/students/details', getStudentsWithLeads); // Route for students with lead details

export default router; 