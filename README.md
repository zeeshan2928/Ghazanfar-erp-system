# ERP Backend API

A modular NestJS API for enterprise resource planning with PostgreSQL and Prisma ORM.

## Project Structure

```
src/
├── main.ts                    # Application entry point
├── app.module.ts             # Root application module
├── modules/                  # Feature modules
│   └── users/               # Users module
│       ├── users.controller.ts
│       ├── users.module.ts
│       ├── dto/
│       │   ├── login.dto.ts
│       │   └── create-user.dto.ts
│       ├── entities/
│       │   └── user.entity.ts
│       ├── services/
│       │   ├── users.service.ts
│       │   └── auth.service.ts
│       └── strategies/
│           └── jwt.strategy.ts
├── common/                   # Shared utilities
│   ├── guards/
│   │   ├── jwt.guard.ts
│   │   └── roles.guard.ts
│   └── decorators/
│       └── roles.decorator.ts
└── database/                 # Database configuration
    ├── database.module.ts
    └── prisma.service.ts

prisma/
└── schema.prisma            # Database schema

```

## Setup

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your database credentials:
```
DATABASE_URL="postgresql://user:password@localhost:5432/erp_db"
JWT_SECRET="your-super-secret-key"
```

4. Run Prisma migrations:
```bash
npx prisma migrate dev
```

### Running the Application

**Development mode:**
```bash
npm run start:dev
```

**Production build:**
```bash
npm run build
npm run start:prod
```

## User Roles

- `ADMIN` - Full system access
- `SALESMAN` - Sales operations
- `WAREHOUSE` - Inventory management
- `ACCOUNTANT` - Financial operations

## API Endpoints

### Authentication

- `POST /users/register` - Register a new user
- `POST /users/login` - Login and get JWT token

### Users (Protected)

- `GET /users` - List all active users
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user (Admin only)
- `DELETE /users/:id` - Soft delete user (Admin only)

## Authentication

Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## Development

### Database Migrations

Create a new migration:
```bash
npx prisma migrate dev --name migration_name
```

View database:
```bash
npx prisma studio
```

### Testing

```bash
npm run test
npm run test:watch
```

### Linting

```bash
npm run lint
npm run format
```

## License

MIT
