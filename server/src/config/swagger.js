const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Waste Collection API',
      version: '1.0.0',
      description: 'Backend API for the Akure smart waste collection system',
    },
    servers: [
      {
        url: 'https://akureclean.onrender.com',
        description: 'Production Server',
      },
      {
        url: `http://localhost:${process.env.PORT || 5001}`,
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './routes/*.js'], // files containing annotations as it is started from root
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
