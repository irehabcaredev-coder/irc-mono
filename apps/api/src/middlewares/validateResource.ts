
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const validate = (schema: z.ZodObject<any, any>) => (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        // Keep only the fields the schema declares: anything else in the body must never reach the database
        if (parsed.body !== undefined) req.body = parsed.body;
        next();
    } catch (e: any) {
        return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: e.errors.map((err: any) => ({
                path: err.path.join('.'),
                message: err.message
            }))
        });
    }
};

export default validate;
