import { Request, Response, NextFunction } from 'express';
import { AppError, errorHandler } from '../../../src/middleware/errorHandler';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      originalUrl: '/test',
      method: 'GET',
      ip: '127.0.0.1',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AppError', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test error', 400);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    it('should default to status code 500', () => {
      const error = new AppError('Test error');

      expect(error.statusCode).toBe(500);
    });
  });

  describe('errorHandler', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError('Test error', 400);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Test error',
      });
    });

    it('should handle generic errors in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Generic error');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Generic error',
      });
    });

    it('should hide error details in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Sensitive error');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
      });
    });

    it('should handle errors with different status codes', () => {
      const error401 = new AppError('Unauthorized', 401);
      const error403 = new AppError('Forbidden', 403);
      const error404 = new AppError('Not found', 404);

      errorHandler(
        error401,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
      expect(mockResponse.status).toHaveBeenCalledWith(401);

      errorHandler(
        error403,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
      expect(mockResponse.status).toHaveBeenCalledWith(403);

      errorHandler(
        error404,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });
});
