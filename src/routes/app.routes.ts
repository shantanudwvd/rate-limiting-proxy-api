import express from 'express';
import appController from '../controllers/app.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
    appRegistrationValidation,
    appUpdateValidation,
    appIdValidation,
    searchQueryValidation
} from '../utils/validator';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Register a new app
router.post('/register', appRegistrationValidation, appController.registerApp);

// Get all apps for a user
router.get('/', appController.getUserApps);

// Search apps
router.get('/search', searchQueryValidation, appController.searchApps);

// Get app by ID
router.get('/:id', appIdValidation, appController.getAppById);

// Update app
router.put('/:id', appUpdateValidation, appController.updateApp);

// Delete app
router.delete('/:id', appIdValidation, appController.deleteApp);

export default router;