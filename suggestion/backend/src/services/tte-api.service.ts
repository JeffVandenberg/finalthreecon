import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

interface TTEConfig {
  apiUrl: string;
  conventionId: string;
  apiKey: string;
  username: string;
  password: string;
}

interface TTESession {
  id: string;
  expiresAt: Date;
}

interface TTEPaginatedResponse<T> {
  result: {
    items: T[];
    paging: {
      page_number: number;
      total_pages: number;
      total_items: number;
      items_per_page: number;
    };
  };
}

export class TTEApiService {
  private client: AxiosInstance;
  private config: TTEConfig;
  private session: TTESession | null = null;

  constructor() {
    this.config = {
      apiUrl: process.env.TTE_API_URL || 'https://tabletop.events/api',
      conventionId: process.env.TTE_CONVENTION_ID || '',
      apiKey: process.env.TTE_API_KEY || '',
      username: process.env.TTE_API_USER || '',
      password: process.env.TTE_API_PASSWORD || '',
    };

    if (!this.config.conventionId || !this.config.apiKey || !this.config.username || !this.config.password) {
      throw new Error('TTE API credentials not configured. Please set TTE_CONVENTION_ID, TTE_API_KEY, TTE_API_USER, and TTE_API_PASSWORD in environment variables.');
    }

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: 30000,
      paramsSerializer: {
        serialize: (params) => {
          // Custom serialization to match TTE API expectations
          // Arrays should be sent as repeated keys WITHOUT brackets: _include=hosts&_include=multi_spaces
          const parts: string[] = [];
          Object.entries(params).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach(item => {
                parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
              });
            } else if (value !== undefined && value !== null) {
              parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
            }
          });
          return parts.join('&');
        }
      }
    });
  }

  /**
   * Authenticate with TTE API and create a session
   */
  async authenticate(): Promise<string> {
    // Check if we have a valid session
    if (this.session && this.session.expiresAt > new Date()) {
      return this.session.id;
    }

    try {
      logger.info('Authenticating with Tabletop.Events API');

      const response = await this.client.post('/session', new URLSearchParams({
        username: this.config.username,
        password: this.config.password,
        api_key_id: this.config.apiKey,
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const sessionId = response.data.result.id;

      // Store session with 1-hour expiry (TTE sessions typically last longer, but we refresh to be safe)
      this.session = {
        id: sessionId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      };

      logger.info('Successfully authenticated with TTE API');
      return sessionId;
    } catch (error: any) {
      logger.error('Failed to authenticate with TTE API', { error: error.message });
      throw new Error(`TTE authentication failed: ${error.message}`);
    }
  }

  /**
   * Fetch all pages of data from a TTE API endpoint
   */
  async fetchAllPages<T>(
    endpoint: string,
    options: {
      include?: string[]; // Fields to include (e.g., ['hosts', 'multi_spaces'])
      includeRelationships?: boolean;
      itemsPerPage?: number;
      onProgress?: (page: number, totalPages: number) => void;
      rateLimit?: number; // Delay in ms between requests
    } = {}
  ): Promise<T[]> {
    const {
      include,
      includeRelationships = true,
      itemsPerPage = 100,
      onProgress,
      rateLimit = 250, // Default 250ms delay to be nice to the API
    } = options;

    const sessionId = await this.authenticate();
    const allItems: T[] = [];
    let page = 1;
    let totalPages = 1;

    try {
      do {
        logger.debug(`Fetching page ${page}/${totalPages} from ${endpoint}`);

        const params = {
          session_id: sessionId,
          ...(include && { _include: include }),
          _include_relationships: includeRelationships ? 1 : 0,
          _items_per_page: itemsPerPage,
          _page_number: page,
        };

        // Log the params to see what's being sent
        logger.info(`TTE API Request: GET /convention/${this.config.conventionId}/${endpoint}`, {
          params,
          serialized: this.serializeParams(params)
        });

        const response = await this.client.get<TTEPaginatedResponse<T>>(`/convention/${this.config.conventionId}/${endpoint}`, {
          params,
        });

        const { items, paging } = response.data.result;

        // Log first item to see what fields are actually returned
        if (page === 1 && items.length > 0) {
          logger.info(`TTE API Response - First item from ${endpoint}:`, {
            itemKeys: Object.keys(items[0] as object),
            sampleItem: items[0]
          });
        }

        allItems.push(...items);

        totalPages = paging.total_pages;

        if (onProgress) {
          onProgress(page, totalPages);
        }

        // Rate limiting - be nice to the API
        if (page < totalPages && rateLimit > 0) {
          await this.delay(rateLimit);
        }

        page++;
      } while (page <= totalPages);

      logger.info(`Fetched ${allItems.length} items from ${endpoint}`);
      return allItems;
    } catch (error: any) {
      logger.error(`Failed to fetch data from ${endpoint}`, { error: error.message, page });
      throw new Error(`TTE API fetch failed: ${error.message}`);
    }
  }

  /**
   * Fetch a single page of data
   */
  async fetchPage<T>(
    endpoint: string,
    page: number,
    options: {
      include?: string[]; // Fields to include (e.g., ['hosts', 'multi_spaces'])
      includeRelationships?: boolean;
      itemsPerPage?: number;
    } = {}
  ): Promise<TTEPaginatedResponse<T>> {
    const {
      include,
      includeRelationships = true,
      itemsPerPage = 100,
    } = options;

    const sessionId = await this.authenticate();

    try {
      const response = await this.client.get<TTEPaginatedResponse<T>>(`/convention/${this.config.conventionId}/${endpoint}`, {
        params: {
          session_id: sessionId,
          ...(include && { _include: include }),
          _include_relationships: includeRelationships ? 1 : 0,
          _items_per_page: itemsPerPage,
          _page_number: page,
        },
      });

      return response.data;
    } catch (error: any) {
      logger.error(`Failed to fetch page ${page} from ${endpoint}`, { error: error.message });
      throw new Error(`TTE API fetch failed: ${error.message}`);
    }
  }

  /**
   * Fetch data from a custom endpoint (e.g., relationship endpoints)
   */
  async fetchCustomEndpoint<T>(
    url: string,
    options: {
      itemsPerPage?: number;
    } = {}
  ): Promise<T[]> {
    const { itemsPerPage = 100 } = options;
    const sessionId = await this.authenticate();

    try {
      const response = await this.client.get<TTEPaginatedResponse<T>>(url, {
        params: {
          session_id: sessionId,
          _items_per_page: itemsPerPage,
        },
      });

      return response.data.result.items;
    } catch (error: any) {
      logger.error(`Failed to fetch from custom endpoint ${url}`, { error: error.message });
      throw new Error(`TTE API fetch failed: ${error.message}`);
    }
  }

  /**
   * Check in a badge
   */
  async checkInBadge(badgeId: string): Promise<any> {
    const sessionId = await this.authenticate();

    try {
      logger.info(`Checking in badge ${badgeId} on TTE API`);

      const response = await this.client.put(
        `/badge/${badgeId}/check-in`,
        new URLSearchParams({
          session_id: sessionId
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      logger.info(`Successfully checked in badge ${badgeId} on TTE API`);
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to check in badge ${badgeId} on TTE API`, {
        error: error.message,
        statusCode: error.response?.status,
        responseData: error.response?.data
      });

      const errorMessage = error.response?.data?.error?.message ||
                          error.response?.data?.message ||
                          error.message;
      throw new Error(`TTE API check-in failed: ${errorMessage}`);
    }
  }

  /**
   * Reverse check-in for a badge
   */
  async reverseCheckInBadge(badgeId: string): Promise<any> {
    const sessionId = await this.authenticate();

    try {
      logger.info(`Reversing check-in for badge ${badgeId} on TTE API`);

      const response = await this.client.put(
        `/badge/${badgeId}/reverse-check-in`,
        new URLSearchParams({
          session_id: sessionId
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      logger.info(`Successfully reversed check-in for badge ${badgeId} on TTE API`);
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to reverse check-in for badge ${badgeId} on TTE API`, {
        error: error.message,
        statusCode: error.response?.status,
        responseData: error.response?.data
      });

      const errorMessage = error.response?.data?.error?.message ||
                          error.response?.data?.message ||
                          error.message;
      throw new Error(`TTE API reverse check-in failed: ${errorMessage}`);
    }
  }

  /**
   * Clear the current session
   */
  clearSession(): void {
    this.session = null;
  }

  /**
   * Serialize params for logging (uses same logic as axios serializer)
   */
  private serializeParams(params: Record<string, any>): string {
    const parts: string[] = [];
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(item => {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
        });
      } else if (value !== undefined && value !== null) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    });
    return parts.join('&');
  }

  /**
   * Helper to add delay between requests
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const tteApiService = new TTEApiService();
