import { Router, Request, Response } from 'express';
import { COUNTRIES } from './country.service';

const router = Router();

// Public: feeds the country code picker on every phone number field
router.get('/', (_req: Request, res: Response) => {
    res.set('Cache-Control', 'public, max-age=86400');
    res.json({ success: true, data: COUNTRIES });
});

export default router;
