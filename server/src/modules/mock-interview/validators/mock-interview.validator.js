import { body, param, validationResult } from 'express-validator';

export const createSessionRules = [
  body('role')
    .notEmpty()
    .withMessage('Job role is required.')
    .isIn([
      'software-engineer',
      'data-analyst',
      'product-manager',
      'ux-designer',
      'marketing-specialist',
      'sales-representative',
      'customer-support',
      'business-analyst',
    ])
    .withMessage('Invalid job role.'),
  body('type')
    .notEmpty()
    .withMessage('Interview type is required.')
    .isIn(['hr', 'behavioral', 'technical'])
    .withMessage('Interview type must be hr, behavioral, or technical.'),
  body('language')
    .optional()
    .isIn(['en', 'ms'])
    .withMessage('Language must be en or ms.'),
  body('persona')
    .optional()
    .isIn(['neutral', 'friendly', 'strict'])
    .withMessage('Persona must be neutral, friendly, or strict.'),
];

export const answerRules = [
  param('sessionId').isUUID().withMessage('Invalid session id.'),
  body('answer').optional().isString().trim().isLength({ max: 5000 }).withMessage('Answer too long.'),
  body('transcript').optional().isString().trim().isLength({ max: 5000 }),
];

export const sessionIdRules = [param('sessionId').isUUID().withMessage('Invalid session id.')];

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}
