# Invictus Mall Server - Java Spring Boot Microservice

This is a Java Spring Boot microservice that provides the same API endpoints and features as the Node.js/Express server.

## Features

- RESTful API endpoints matching the Node.js server
- JWT-based authentication
- MySQL database integration
- Spring Data JPA for data access
- Spring Security for security
- Swagger/OpenAPI documentation
- CORS support
- File upload support

## Prerequisites

- Java 17 or higher
- Maven 3.6+
- MySQL 8.0+

## Configuration

1. Create a `.env` file or set environment variables:
   - `DB_USER`: MySQL username (default: root)
   - `DB_PASSWORD`: MySQL password
   - `JWT_SECRET`: Secret key for JWT tokens
   - `PORT`: Server port (default: 3001)

2. Update `application.yml` with your database configuration

## Running the Application

```bash
# Build the project
mvn clean install

# Run the application
mvn spring-boot:run
```

The server will start on http://localhost:3001

## API Documentation

Once the server is running, access Swagger UI at:
http://localhost:3001/swagger-ui.html

## Endpoints

All endpoints match the Node.js server:
- `/api/auth/*` - Authentication endpoints
- `/api/stores/*` - Store management
- `/api/products/*` - Product management
- `/api/orders/*` - Order management
- `/api/users/*` - User management
- And more...

## Project Structure

```
src/main/java/com/invictusmall/
├── config/          # Configuration classes
├── controller/      # REST controllers
├── model/          # Entity models
├── repository/     # JPA repositories
├── service/        # Business logic
├── dto/            # Data transfer objects
├── security/       # Security configuration
└── util/           # Utility classes
```


