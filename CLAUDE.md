# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` - Starts Vite development server with HMR
- **Build**: `npm run build` - Creates production build
- **Lint**: `npm run lint` - Runs ESLint on all files
- **Preview**: `npm run preview` - Preview production build locally

## Architecture Overview

This is a React inventory management application for "Promexma Control Interno" built with Vite, using a modern glassmorphism design system with Tailwind CSS.

### Core Application Structure

**Main App (`src/App.jsx`)**: 
- Central state management with `useState` for scanned items, current screen, and product data
- Contains hardcoded product database for simulation
- Handles barcode scanning workflow and navigation between screens
- Uses a glassmorphism design with corporate red (#DA2C27) color scheme

**Screen Management**:
- `home`: Main dashboard with scanning interface and inventory history
- `productCount`: Product counting screen triggered after barcode scan
- `admin`: Admin dashboard for multi-sucursal analytics (admin users only)

**Key Components**:

1. **BarcodeCard** (`src/components/Card/BarcodeCard.jsx`):
   - Camera-based barcode scanning using QuaggaJS library
   - Loads QuaggaJS dynamically from CDN
   - Includes simulation mode for development
   - Handles camera permissions and error states

2. **ProductCountScreen** (`src/components/ProductCountScreen/ProductCountScreen.jsx`):
   - Product quantity input interface with increment/decrement controls
   - Quick increment buttons (+5, +10, +25, +50)
   - Responsive design for mobile and desktop

3. **Card** (`src/components/Card/Card.jsx`):
   - Reusable glassmorphism card component with three variants: `default`, `primary`, `secondary`
   - Supports icons, titles, children content, and action buttons
   - Consistent styling and hover effects

4. **Login/Register** (`src/components/Auth/`):
   - Login component with email/password authentication
   - Register component with sucursal selection
   - Error handling and loading states
   - Responsive glassmorphism design

5. **AdminDashboard** (`src/components/Admin/AdminDashboard.jsx`):
   - Multi-sucursal analytics and statistics
   - User management with role updates
   - Global inventory overview with filtering
   - Admin-only access with role verification

### Styling System

**Tailwind Configuration**: 
- Extended with corporate colors (`rojo`, `davys-gray`, `battleship-gray`)
- Custom nordic color palette (50-900 scale)
- Glassmorphism utilities (`glass-effect`, `glass-effect-strong`)
- Custom animations (slide-in-up, float, glow, pulse-soft)
- Responsive design with mobile-first approach

**Design Language**:
- Glassmorphism with backdrop-blur effects
- Corporate red primary color (#DA2C27)
- Dark slate background with subtle gradients
- Rounded corners (xl to 3xl)
- Subtle animations and hover states

### Data Flow

1. **Product Database**: Products stored in Supabase `productos` table, queried by barcode via InventoryService
2. **Barcode Scanning**: BarcodeCard → App.handleBarcodeScanning → InventoryService.findProductByBarcode → sets scannedProduct
3. **Product Counting**: ProductCountScreen → App.handleSaveCount → InventoryService.registerMovement → updates database and UI
4. **State Management**: Local state with useState, recent movements loaded from database via InventoryService.getRecentMovements

### Authentication System

**Supabase Authentication**:
- Full authentication system with Supabase Auth
- Client configured in `src/config/supabase.js` with persistent sessions
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Row Level Security (RLS) policies for data access control

**User Management**:
- `users` table extends `auth.users` with business logic
- Two user roles: `sucursal` (branch users) and `admin` (administrators)
- Branch users limited to their assigned sucursal data
- Admins have access to all sucursales and user management

**Authentication Service** (`src/services/authService.js`):
- `signIn()`, `signUp()`, `signOut()` methods
- `getUserProfile()`, `updateUserProfile()` for extended user data
- `getSucursales()` for branch selection during registration
- `getAllUsers()`, `updateUserRole()` for admin user management
- `onAuthStateChange()` for real-time auth state updates

**Authentication Context** (`src/contexts/AuthContext.jsx`):
- React context for global auth state management
- Provides `user`, `session`, `profile`, `isAuthenticated`, `isAdmin`, `sucursal`
- Auto-initialization of auth state on app startup
- Auth state persistence across browser sessions

### Database Integration

**Service Layer** (`src/services/inventoryService.js`):
- `findProductByBarcode()`: Searches productos table by codigo_mrp or codigo_truper
- `registerMovement()`: Records movement and updates inventory in a transaction (requires user and sucursal)
- `getCurrentInventory()`: Gets current stock for a product/sucursal (requires sucursal ID)
- `getRecentMovements()`: Fetches recent movements with product info (requires sucursal ID)
- `getInventoryStats()`: Calculates inventory statistics (requires sucursal ID)
- All methods now enforce sucursal-based access control

**Database Tables**:
- `users`: Extended user profiles with sucursal assignment and roles
- `productos`: Product catalog with MRP/Truper codes
- `inventarios`: Current stock levels per product/sucursal
- `movimientos`: Audit trail of all inventory changes (includes user tracking)
- `sucursales`: Branch/location information

**Data Flow**:
1. Barcode scan → Query productos table
2. User enters count → Create movimientos record
3. Update/create inventarios record
4. Refresh UI with latest data

**Movement Types**: conteo, conteo_inicial, ajuste, entrada, salida, merma, devolucion

### Development Notes

- Uses QuaggaJS for barcode scanning (loaded via CDN)
- Includes fallback simulation mode when QuaggaJS unavailable
- Mobile-responsive with touch-friendly controls
- Camera access requires HTTPS in production
- ESLint configured for React with hooks and refresh plugins
- No TypeScript - uses plain JavaScript with JSX
- Async/await pattern for all database operations
- Global error handling with toast notifications
- Loading states with overlay spinner

### Security & Access Control

- Row Level Security (RLS) policies enforce data isolation by sucursal
- Branch users can only access their assigned sucursal data
- Admin users have global access to all sucursales
- User authentication required for all operations
- Secure password handling through Supabase Auth
- Real-time session management with auto-refresh tokens

### Setup Requirements

1. **Database Setup**: Run `/database/users_setup.sql` to create user tables and RLS policies
2. **Environment Variables**: Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. **Initial Admin**: Create first admin user manually in Supabase Auth, then update role in users table
4. **Sucursales Data**: Populate sucursales table with branch information