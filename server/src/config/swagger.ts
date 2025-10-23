import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Invictus Mall API',
      version: '1.0.0',
      description: 'API documentation for Invictus Mall store management system',
      contact: {
        name: 'Invictus Mall Team',
        email: 'support@invictusmall.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
        Location: {
          type: 'object',
          required: ['streetAddress', 'city', 'stateProvince', 'zipCode', 'country'],
          properties: {
            streetAddress: {
              type: 'string',
              description: 'Street address of the location'
            },
            aptNumber: {
              type: 'string',
              description: 'Apartment or suite number (optional)'
            },
            city: {
              type: 'string',
              description: 'City name'
            },
            stateProvince: {
              type: 'string',
              description: 'State or province'
            },
            zipCode: {
              type: 'string',
              description: 'ZIP or postal code'
            },
            country: {
              type: 'string',
              description: 'Country name'
            }
          }
        },
        Membership: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['basic', 'premium', 'platinum'],
              description: 'Membership tier level'
            },
            benefits: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'List of membership benefits'
            },
            discountPercentage: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description: 'Discount percentage for members'
            },
            prioritySupport: {
              type: 'boolean',
              description: 'Whether the store has priority support'
            }
          }
        },
        Store: {
          type: 'object',
          required: ['id', 'name', 'description', 'category', 'rating', 'reviewCount', 'imageUrl', 'isVerified', 'location', 'productsCount', 'establishedYear'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the store'
            },
            name: {
              type: 'string',
              description: 'Name of the store'
            },
            description: {
              type: 'string',
              description: 'Description of the store'
            },
            category: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Categories the store belongs to'
            },
            rating: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 5,
              description: 'Store rating (0-5)'
            },
            reviewCount: {
              type: 'integer',
              minimum: 0,
              description: 'Number of reviews'
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              description: 'URL of the store image'
            },
            isVerified: {
              type: 'boolean',
              description: 'Whether the store is verified'
            },
            location: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Location'
              },
              description: 'Store locations'
            },
            productsCount: {
              type: 'integer',
              minimum: 0,
              description: 'Number of products in the store'
            },
            establishedYear: {
              type: 'integer',
              minimum: 1900,
              description: 'Year the store was established'
            },
            discount: {
              type: 'string',
              description: 'Current discount offer'
            },
            membership: {
              $ref: '#/components/schemas/Membership'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Store creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Store last update timestamp'
            }
          }
        },
        CreateStoreRequest: {
          type: 'object',
          required: ['name', 'description', 'category', 'rating', 'reviewCount', 'imageUrl', 'isVerified', 'location', 'productsCount', 'establishedYear'],
          properties: {
            name: {
              type: 'string',
              description: 'Name of the store'
            },
            description: {
              type: 'string',
              description: 'Description of the store'
            },
            category: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Categories the store belongs to'
            },
            rating: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 5,
              description: 'Store rating (0-5)'
            },
            reviewCount: {
              type: 'integer',
              minimum: 0,
              description: 'Number of reviews'
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              description: 'URL of the store image'
            },
            isVerified: {
              type: 'boolean',
              description: 'Whether the store is verified'
            },
            location: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Location'
              },
              description: 'Store locations'
            },
            productsCount: {
              type: 'integer',
              minimum: 0,
              description: 'Number of products in the store'
            },
            establishedYear: {
              type: 'integer',
              minimum: 1900,
              description: 'Year the store was established'
            },
            discount: {
              type: 'string',
              description: 'Current discount offer'
            },
            membership: {
              $ref: '#/components/schemas/Membership'
            }
          }
        },
        UpdateStoreRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the store'
            },
            description: {
              type: 'string',
              description: 'Description of the store'
            },
            category: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Categories the store belongs to'
            },
            rating: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 5,
              description: 'Store rating (0-5)'
            },
            reviewCount: {
              type: 'integer',
              minimum: 0,
              description: 'Number of reviews'
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              description: 'URL of the store image'
            },
            isVerified: {
              type: 'boolean',
              description: 'Whether the store is verified'
            },
            location: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Location'
              },
              description: 'Store locations'
            },
            productsCount: {
              type: 'integer',
              minimum: 0,
              description: 'Number of products in the store'
            },
            establishedYear: {
              type: 'integer',
              minimum: 1900,
              description: 'Year the store was established'
            },
            discount: {
              type: 'string',
              description: 'Current discount offer'
            },
            membership: {
              $ref: '#/components/schemas/Membership'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful'
            },
            message: {
              type: 'string',
              description: 'Response message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            },
            count: {
              type: 'integer',
              description: 'Number of items returned'
            },
            error: {
              type: 'string',
              description: 'Error message if any'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            error: {
              type: 'string',
              description: 'Detailed error information'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/index.ts']
};

export const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  const swaggerUi = require('swagger-ui-express');
  
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Invictus Mall API Documentation'
  }));
};
