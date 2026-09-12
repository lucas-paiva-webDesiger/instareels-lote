import { Router } from 'express';
import { getAccounts, updateAccountSettings, deleteAccount, getAvailableAccounts, selectAccount } from '../controllers/account.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { startMetaOAuth, metaOAuthCallback } from '../controllers/meta.auth.controller';

const router = Router();

// OAuth Routes
router.get('/meta', authenticate, startMetaOAuth);
router.get('/meta/callback', metaOAuthCallback); // Não usa autenticação de token pq é redirect do facebook
router.get('/meta/available', authenticate, getAvailableAccounts);
router.post('/meta/select', authenticate, selectAccount);

// Protected routes
router.use(authenticate);
router.get('/', getAccounts);
router.put('/:id/settings', updateAccountSettings);
router.delete('/:id', deleteAccount);

export default router;
