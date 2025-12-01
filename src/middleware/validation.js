// middleware/validation.js
import { body } from "express-validator";

export const validateBanner = (method) => {
  switch (method) {
    case 'create':
      return [
        body('title')
          .trim()
          .notEmpty().withMessage('Title is required')
          .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
        
        body('description')
          .optional()
          .trim()
          .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
        
        body('link')
          .optional()
          .custom((value) => {
            if (value) {
              const links = value.split(',').map(l => l.trim());
              return links.every(link => {
                try {
                  new URL(link);
                  return true;
                } catch {
                  return false;
                }
              });
            }
            return true;
          }).withMessage('Invalid URL format in links'),
        
        body('email')
          .optional()
          .trim()
          .isEmail().withMessage('Invalid email format'),
        
        body('phoneNumber')
          .optional()
          .trim()
          .matches(/^[+]?[\d\s\-()]+$/).withMessage('Invalid phone number format'),
        
        body('isActive')
          .optional()
          .isBoolean().withMessage('isActive must be a boolean value')
      ];
      
    case 'update':
      return [
        body('title')
          .optional()
          .trim()
          .notEmpty().withMessage('Title cannot be empty')
          .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
        
        body('description')
          .optional()
          .trim()
          .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
        
        body('link')
          .optional()
          .custom((value) => {
            if (value) {
              const links = value.split(',').map(l => l.trim());
              return links.every(link => {
                try {
                  new URL(link);
                  return true;
                } catch {
                  return false;
                }
              });
            }
            return true;
          }).withMessage('Invalid URL format in links'),
        
        body('email')
          .optional()
          .trim()
          .isEmail().withMessage('Invalid email format'),
        
        body('phoneNumber')
          .optional()
          .trim()
          .matches(/^[+]?[\d\s\-()]+$/).withMessage('Invalid phone number format'),
        
        body('isActive')
          .optional()
          .isBoolean().withMessage('isActive must be a boolean value')
      ];
      
    default:
      return [];
  }
};