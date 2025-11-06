import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

export const validateStore = [
  body('name').notEmpty().withMessage('Name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').isArray().withMessage('Category must be an array'),
  body('category.*').isString().withMessage('Each category must be a string'),
  body('rating').isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5'),
  body('reviewCount').isInt({ min: 0 }).withMessage('Review count must be a positive integer'),
  body('imageUrl').isURL().withMessage('Image URL must be a valid URL'),
  body('isVerified').isBoolean().withMessage('isVerified must be a boolean'),
  body('location').isArray().withMessage('Location must be an array'),
  body('location.*.streetAddress').notEmpty().withMessage('Street address is required'),
  body('location.*.city').notEmpty().withMessage('City is required'),
  body('location.*.stateProvince').notEmpty().withMessage('State/Province is required'),
  body('location.*.zipCode').notEmpty().withMessage('ZIP code is required'),
  body('location.*.country').notEmpty().withMessage('Country is required'),
  body('productsCount').isInt({ min: 0 }).withMessage('Products count must be a positive integer'),
  body('establishedYear').isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Established year must be between 1900 and current year'),
  body('discount').optional().isString().withMessage('Discount must be a string'),
  body('membership.type').optional().isIn(['basic', 'premium', 'platinum']).withMessage('Membership type must be basic, premium, or platinum'),
  body('membership.benefits').optional().isArray().withMessage('Membership benefits must be an array'),
  body('membership.benefits.*').optional().isString().withMessage('Each benefit must be a string'),
  body('membership.discountPercentage').optional().isInt({ min: 0, max: 100 }).withMessage('Discount percentage must be between 0 and 100'),
  body('membership.prioritySupport').optional().isBoolean().withMessage('Priority support must be a boolean')
];

export const validateUpdateStore = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty'),
  body('category').optional().isArray().withMessage('Category must be an array'),
  body('category.*').optional().isString().withMessage('Each category must be a string'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5'),
  body('reviewCount').optional().isInt({ min: 0 }).withMessage('Review count must be a positive integer'),
  body('imageUrl').optional().isURL().withMessage('Image URL must be a valid URL'),
  body('isVerified').optional().isBoolean().withMessage('isVerified must be a boolean'),
  body('location').optional().isArray().withMessage('Location must be an array'),
  body('location.*.streetAddress').optional().notEmpty().withMessage('Street address cannot be empty'),
  body('location.*.city').optional().notEmpty().withMessage('City cannot be empty'),
  body('location.*.stateProvince').optional().notEmpty().withMessage('State/Province cannot be empty'),
  body('location.*.zipCode').optional().notEmpty().withMessage('ZIP code cannot be empty'),
  body('location.*.country').optional().notEmpty().withMessage('Country cannot be empty'),
  body('productsCount').optional().isInt({ min: 0 }).withMessage('Products count must be a positive integer'),
  body('establishedYear').optional().isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Established year must be between 1900 and current year'),
  body('discount').optional().isString().withMessage('Discount must be a string'),
  body('membership.type').optional().isIn(['basic', 'premium', 'platinum']).withMessage('Membership type must be basic, premium, or platinum'),
  body('membership.benefits').optional().isArray().withMessage('Membership benefits must be an array'),
  body('membership.benefits.*').optional().isString().withMessage('Each benefit must be a string'),
  body('membership.discountPercentage').optional().isInt({ min: 0, max: 100 }).withMessage('Discount percentage must be between 0 and 100'),
  body('membership.prioritySupport').optional().isBoolean().withMessage('Priority support must be a boolean')
];

export const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

export const validateSignup = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('phoneNumber').isLength({ min: 10 }).withMessage('Phone number must be at least 10 characters long')
];

export const validateSetupPassword = [
  body('token').notEmpty().withMessage('Verification token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

export const validateCreateShippingAddress = [
  body('label').optional().isString().withMessage('Label must be a string'),
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('phoneNumber').isLength({ min: 10 }).withMessage('Phone number must be at least 10 characters long'),
  body('streetAddress').notEmpty().withMessage('Street address is required'),
  body('aptNumber').optional().isString().withMessage('Apt number must be a string'),
  body('city').notEmpty().withMessage('City is required'),
  body('stateProvince').notEmpty().withMessage('State/Province is required'),
  body('zipCode').notEmpty().withMessage('ZIP code is required'),
  body('country').notEmpty().withMessage('Country is required'),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean')
];

export const validateUpdateShippingAddress = [
  body('label').optional().isString().withMessage('Label must be a string'),
  body('fullName').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('phoneNumber').optional().isLength({ min: 10 }).withMessage('Phone number must be at least 10 characters long'),
  body('streetAddress').optional().notEmpty().withMessage('Street address cannot be empty'),
  body('aptNumber').optional().isString().withMessage('Apt number must be a string'),
  body('city').optional().notEmpty().withMessage('City cannot be empty'),
  body('stateProvince').optional().notEmpty().withMessage('State/Province cannot be empty'),
  body('zipCode').optional().notEmpty().withMessage('ZIP code cannot be empty'),
  body('country').optional().notEmpty().withMessage('Country cannot be empty'),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean')
];

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  return next();
};
