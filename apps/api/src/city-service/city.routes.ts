import { Router, Request, Response } from 'express';
import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler';
import validate from '../middlewares/validateResource';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { CREATED, OK } from '../utils/httpStatusCodes';
import * as cityService from './city.service';
import { SUPPORTED_COUNTRY_CODES } from '../country-service/country.codes';

const countryCode = z.enum(SUPPORTED_COUNTRY_CODES);

const router = Router();

const searchSchema = z.object({
    query: z.object({
        q: z.string().max(100).optional(),
        limit: z.coerce.number().int().min(1).max(50).default(20),
        country: countryCode.optional(),
    }),
});

const addSchema = z.object({
    body: z.object({
        name: z.string().trim().min(2).max(80),
        state: z.string().trim().min(2).max(80),
        country: countryCode.default('IND'),
    }),
});

// Public: used by the city dropdown on onboarding and profile forms
router.get('/', validate(searchSchema), asyncHandler(async (req: Request, res: Response) => {
    // validate() only checks; it does not write the coerced values back to req.query
    const { q, limit, country } = searchSchema.shape.query.parse(req.query);
    res.json({ success: true, data: await cityService.searchCities(q ?? '', limit, country) });
}));

// Signed-in doctors and patients can add a city that is missing from the list
router.post('/', authenticateJWT, validate(addSchema), asyncHandler(async (req: Request, res: Response) => {
    const { city, created } = await cityService.addCity(req.body.name, req.body.state, req.body.country);
    res.status(created ? CREATED : OK).json({ success: true, data: city });
}));

export default router;
