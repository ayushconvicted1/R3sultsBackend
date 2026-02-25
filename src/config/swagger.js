const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'R3sults API',
      version: '1.0.0',
      description: 'R3sults — Disaster Preparedness & Community Safety Platform API',
      contact: { name: 'R3sults Team' },
    },
    servers: [
      { url: '/api', description: 'API Base' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication & registration' },
      { name: 'User', description: 'User profile & settings' },
      { name: 'Property', description: 'User property & photos' },
      { name: 'Group', description: 'Family group management' },
      { name: 'Admin', description: 'Admin roles, permissions & user management' },
      { name: 'Admin Volunteers', description: 'Admin volunteer management' },
      { name: 'Tracking', description: 'Location tracking & sharing' },
      { name: 'Geofence', description: 'Geofence CRUD & events' },
      { name: 'Products', description: 'Product catalog' },
      { name: 'Cart', description: 'Shopping cart' },
      { name: 'Orders', description: 'Order management' },
      { name: 'Mobile', description: 'Mobile volunteer tasks & alerts' },
      { name: 'Weather', description: 'Weather & air quality' },
      { name: 'Disasters', description: 'Disaster alerts & data' },
      { name: 'Notifications', description: 'Push notifications' },
      { name: 'Upload', description: 'CSV upload & parsing' },
      { name: 'Vendor', description: 'Vendor auth & profile' },
      { name: 'Volunteer', description: 'Volunteer auth & profile' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
