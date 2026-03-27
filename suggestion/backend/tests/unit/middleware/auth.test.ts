import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize, AuthRequest } from '../../../src/middleware/auth';
import { AppError } from '../../../src/middleware/errorHandler';

jest.mock('jsonwebtoken');

describe('Authentication Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {};
    nextFunction = jest.fn();
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token', () => {
      const token = 'valid-token';
      const decoded = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'user',
      };

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      (jwt.verify as jest.Mock).mockReturnValue(decoded);

      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockRequest.user).toEqual(decoded);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should throw error if no token provided', () => {
      mockRequest.headers = {};

      expect(() => {
        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      }).toThrow(AppError);

      expect(() => {
        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      }).toThrow('No token provided');
    });

    it('should throw error if token is invalid', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => {
        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      }).toThrow(AppError);

      expect(() => {
        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      }).toThrow('Invalid token');
    });

    it('should throw error if authorization header format is wrong', () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token',
      };

      expect(() => {
        authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      }).toThrow('No token provided');
    });
  });

  describe('authorize', () => {
    it('should allow access for authorized role', () => {
      mockRequest.user = {
        id: 'user-1',
        email: 'admin@example.com',
        role: 'admin',
      };

      const middleware = authorize('admin', 'staff');
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', () => {
      mockRequest.user = {
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      };

      const middleware = authorize('admin', 'staff');

      expect(() => {
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      }).toThrow(AppError);

      expect(() => {
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      }).toThrow('Forbidden');
    });

    it('should throw error if user not authenticated', () => {
      mockRequest.user = undefined;

      const middleware = authorize('admin');

      expect(() => {
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      }).toThrow('Unauthorized');
    });
  });
});
