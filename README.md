# 🏪 InvictusMall - Full-Stack E-commerce Platform

A modern, full-stack e-commerce platform built with Next.js, React, Express.js, and MySQL. InvictusMall provides a complete shopping experience with a customer-facing store, admin dashboard, and robust backend API.

## 🌟 Features

### Customer Interface
- 🛍️ **Store Browsing**: Browse and discover stores across different categories
- 🔍 **Advanced Search**: Search stores by name, description, category, or location
- 🏷️ **Category Filtering**: Filter stores by categories (Electronics, Fashion, Home & Garden, etc.)
- ⭐ **Store Ratings**: View store ratings and review counts
- 📍 **Location-based**: Find stores by location and multiple store locations
- 🎯 **Featured Stores**: Highlighted premium stores with special offers
- 💎 **Membership Benefits**: Access to exclusive member-only stores and discounts

### Admin Dashboard
- 📊 **Dashboard Overview**: Real-time statistics and activity monitoring
- 🏪 **Store Management**: Complete CRUD operations for store management
- 📝 **Activity Logs**: Track all store-related activities and changes
- 🔔 **Notification System**: Real-time notifications for admin actions
- 📈 **Analytics**: Store performance metrics and insights
- ⚡ **Real-time Updates**: Live data synchronization across all interfaces

### Backend API
- 🔌 **RESTful API**: Comprehensive API endpoints for all operations
- 🗄️ **Database Integration**: MySQL database with proper schema design
- 🔐 **Data Validation**: Robust input validation and error handling
- 📋 **Activity Logging**: Comprehensive logging system for audit trails
- 🌐 **CORS Support**: Cross-origin resource sharing for multi-app architecture
- 📚 **API Documentation**: Swagger/OpenAPI documentation

## 🏗️ Architecture

```
InvictusMall/
├── client/          # Next.js Customer Interface (Port 3000)
├── admin/           # Vite React Admin Dashboard (Port 3002)
├── server/          # Express.js Backend API (Port 3001)
└── README.md
```

### Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | Next.js 14, TypeScript, CSS Modules | Customer shopping interface |
| **Admin** | Vite, React 18, TypeScript, CSS Modules | Store management dashboard |
| **Backend** | Express.js, TypeScript, Node.js | RESTful API server |
| **Database** | MySQL 8.0 | Data persistence and storage |
| **Real-time** | Custom polling hooks | Live data synchronization |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MySQL 8.0+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/xiaofeng19920506/InvictusMall.git
   cd InvictusMall
   ```

2. **Set up the database**
   ```sql
   CREATE DATABASE invictus_mall;
   ```

3. **Install dependencies for all applications**
   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   
   # Install admin dependencies
   cd ../admin
   npm install
   ```

4. **Configure environment variables**
   
   Create a `.env` file in the `server` directory:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=invictus_mall
   PORT=3001
   ```

### Running the Applications

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```
   Server will run on http://localhost:3001

2. **Start the client application**
   ```bash
   cd client
   npm run dev
   ```
   Client will run on http://localhost:3000

3. **Start the admin dashboard**
   ```bash
   cd admin
   npm run dev
   ```
   Admin will run on http://localhost:3002

## 📱 Applications Overview

### 🛍️ Customer Interface (Port 3000)
- **URL**: http://localhost:3000
- **Purpose**: Customer-facing store browsing and shopping interface
- **Features**: Store search, category filtering, store details, real-time updates

### 👨‍💼 Admin Dashboard (Port 3002)
- **URL**: http://localhost:3002
- **Purpose**: Administrative interface for store management
- **Features**: Store CRUD operations, activity monitoring, analytics dashboard

### 🔌 Backend API (Port 3001)
- **URL**: http://localhost:3001
- **Purpose**: RESTful API server and database management
- **Features**: Store endpoints, activity logging, data validation, CORS support

## 🗄️ Database Schema

### Core Tables

- **stores**: Store information, categories, locations, membership details
- **store_categories**: Store categorization system
- **store_locations**: Multiple locations per store
- **activity_logs**: Comprehensive activity tracking and audit trails

### Key Features
- 🏪 **Multi-location Stores**: Support for stores with multiple physical locations
- 💎 **Membership System**: Basic, Premium, and Platinum membership tiers
- 📊 **Activity Tracking**: Complete audit trail of all store operations
- 🔍 **Advanced Search**: Full-text search capabilities across store data

## 🔧 API Endpoints

### Store Management
- `GET /api/stores` - Get all stores with filtering options
- `GET /api/stores/:id` - Get specific store details
- `POST /api/stores` - Create new store
- `PUT /api/stores/:id` - Update store information
- `DELETE /api/stores/:id` - Delete store

### Search & Filtering
- `GET /api/stores?search=query` - Search stores
- `GET /api/stores?category=category` - Filter by category
- `GET /api/stores?membership=type` - Filter by membership type

### Activity Logs
- `GET /api/activity-logs` - Get recent activity logs
- `GET /api/activity-logs/store/:storeId` - Get logs for specific store
- `GET /api/activity-logs/type/:type` - Get logs by activity type

### System
- `GET /health` - Health check endpoint
- `GET /api/system/status` - System status and information

## 🔄 Real-time Features

The platform includes real-time data synchronization across all applications:

- **Live Updates**: All applications receive real-time data updates
- **Activity Monitoring**: Instant notifications for admin actions
- **Store Status**: Real-time store availability and status updates
- **Performance Metrics**: Live dashboard statistics and analytics

## 🛠️ Development

### Project Structure
```
InvictusMall/
├── client/
│   ├── src/
│   │   ├── app/           # Next.js app directory
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   └── services/      # API service layer
├── admin/
│   ├── src/
│   │   ├── components/    # Admin React components
│   │   ├── hooks/         # Custom hooks for admin
│   │   ├── services/      # Admin API services
│   │   └── types/         # TypeScript type definitions
└── server/
    ├── src/
    │   ├── config/        # Database and app configuration
    │   ├── middleware/    # Express middleware
    │   ├── models/        # Database models
    │   ├── routes/        # API route definitions
    │   ├── services/      # Business logic services
    │   └── types/         # TypeScript type definitions
```

### Key Development Features
- **TypeScript**: Full type safety across all applications
- **Error Handling**: Comprehensive error handling and logging
- **Data Validation**: Input validation using express-validator
- **Database Connection Pooling**: Efficient MySQL connection management
- **CORS Configuration**: Proper cross-origin resource sharing setup

## 📊 Performance & Monitoring

- **Database Optimization**: Efficient queries and connection pooling
- **Real-time Updates**: Optimized polling for live data synchronization
- **Error Logging**: Comprehensive error tracking and monitoring
- **Activity Auditing**: Complete audit trail for all operations

## 🔒 Security Features

- **Input Validation**: Robust validation for all API endpoints
- **Error Handling**: Secure error responses without sensitive data exposure
- **CORS Protection**: Proper cross-origin resource sharing configuration
- **Database Security**: Parameterized queries to prevent SQL injection

## 🚀 Deployment

The platform is designed for easy deployment:

1. **Environment Setup**: Configure environment variables for production
2. **Database Migration**: Set up production MySQL database
3. **Build Applications**: Build all three applications for production
4. **Reverse Proxy**: Use nginx or similar for production routing
5. **Process Management**: Use PM2 or similar for process management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Developer**: Aaron
- **Repository**: [https://github.com/xiaofeng19920506/InvictusMall](https://github.com/xiaofeng19920506/InvictusMall)

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the API documentation at http://localhost:3001/api-docs (when server is running)

---

**InvictusMall** - Empowering modern e-commerce with cutting-edge technology 🚀
