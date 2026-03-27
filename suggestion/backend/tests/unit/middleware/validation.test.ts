import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { validate } from '../../../src/middleware/validation';
import { AppError } from '../../../src/middleware/errorHandler';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
    };
    mockResponse = {};
    nextFunction = jest.fn();
  });

  describe('validate', () => {
    it('should pass validation with valid data', () => {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
      });

      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      const middleware = validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should throw error with invalid data', () => {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
      });

      mockRequest.body = {
        email: 'invalid-email',
        password: '123',
      };

      const middleware = validate(schema);

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      }).toThrow(AppError);
    });

    it('should throw error with missing required fields', () => {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
      });

      mockRequest.body = {
        email: 'test@example.com',
      };

      const middleware = validate(schema);

      expect(() => {
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      }).toThrow(AppError);
    });

    it('should include all validation errors', () => {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        name: Joi.string().required(),
      });

      mockRequest.body = {};

      const middleware = validate(schema);

      try {
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        const appError = error as AppError;
        expect(appError.message).toContain('email');
        expect(appError.message).toContain('password');
        expect(appError.message).toContain('name');
      }
    });
  });
});
