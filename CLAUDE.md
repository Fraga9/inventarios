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
- Central state management with `useState` for current screen, scanned product, and authentication state
- Mobile-responsive header with navigation and user profile display
- Handles barcode scanning workflow and navigation between screens 
- Uses a glassmorphism design with corporate red (#DA2C27) color scheme
- Global error handling and loading states with overlay spinner

**Screen Management**:
- `scan`: Barcode scanning interface (default screen)
- `history`: Movement history display
- `inventory`: Current inventory status
- `productCount`: Product counting screen triggered after barcode scan
- `admin`: Admin dashboard for multi-sucursal analytics (admin users only)
- `reports`: Excel report generation screen

**Key Components**:

1. **Authentication Components** (`src/components/Auth/`):
   - Login component with email/password authentication via Supabase Auth
   - Register component with sucursal selection and user profile creation
   - Error handling, loading states, and responsive glassmorphism design
   - Integration with AuthContext for global state management

2. **BarcodeCard** (`src/components/Card/BarcodeCard.jsx`):
   - Camera-based barcode scanning using QuaggaJS library
   - Loads QuaggaJS dynamically from CDN
   - Includes simulation mode for development
   - Handles camera permissions and error states

3. **ProductCountScreen** (`src/components/ProductCountScreen/ProductCountScreen.jsx`):
   - Product quantity input interface with increment/decrement controls
   - Quick increment buttons (+5, +10, +25, +50)
   - Responsive design for mobile and desktop
   - Integrates with InventoryService for saving counts

4. **Inventory Screens**:
   - **ScanInventoryScreen**: Main barcode scanning interface with camera integration
   - **MovementHistoryScreen**: Displays recent inventory movements with filtering
   - **CurrentInventoryScreen**: Shows current stock levels by product
   - **ExcelReportScreen**: Generates and exports Excel reports

5. **AdminDashboard** (`src/components/Admin/AdminDashboard.jsx`):
   - Multi-sucursal analytics and statistics
   - User management with role updates (admin/sucursal)
   - Global inventory overview with filtering
   - Admin-only access with role verification

6. **Card Components** (`src/components/Card/`):
   - **Card**: Reusable glassmorphism card component with variants (`default`, `primary`, `secondary`)
   - **InventoryCard**: Specialized card for displaying inventory statistics
   - Consistent styling, hover effects, and responsive design

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

1. **Authentication Flow**: 
   - AuthContext manages global auth state with Supabase Auth
   - AuthService handles login/logout, profile management, and user role validation
   - Profile data loaded from `users` table with sucursal relationship

2. **Product Database**: Products stored in Supabase `productos` table, queried by barcode via InventoryService
3. **Barcode Scanning**: BarcodeCard → App.handleBarcodeScanning → InventoryService.findProductByBarcode → sets scannedProduct
4. **Product Counting**: ProductCountScreen → App.handleSaveCount → InventoryService.registerMovement → updates database and UI
5. **State Management**: Local state with useState, recent movements loaded from database via InventoryService.getRecentMovements
6. **Access Control**: All data operations enforce sucursal-based access control via RLS policies

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

**Service Layer**:

**InventoryService** (`src/services/inventoryService.js`):
- `findProductByBarcode()`: Searches productos table by codigo_mrp or codigo_truper
- `registerMovement()`: Records movement and updates inventory in a transaction (requires user and sucursal)
- `getCurrentInventory()`: Gets current stock for a product/sucursal (requires sucursal ID)
- `getRecentMovements()`: Fetches recent movements with product info (requires sucursal ID)
- `getInventoryStats()`: Calculates inventory statistics (requires sucursal ID)
- `formatProductForUI()`: Formats product data for UI display
- `diagnoseSupabaseConnection()`: Diagnostic tool for database connectivity
- All methods enforce sucursal-based access control

**AuthService** (`src/services/authService.js`):
- `signIn()`, `signUp()`, `signOut()`: Core authentication methods
- `getUserProfile()`, `updateUserProfile()`: Extended user data management
- `getSucursales()`: Branch selection for registration
- `getAllUsers()`, `updateUserRole()`: Admin user management functions
- `onAuthStateChange()`: Real-time auth state monitoring
- `resetPassword()`, `updatePassword()`: Password management

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

- **Technology Stack**: React 19, Vite 7, Tailwind CSS 4, Supabase client
- **Authentication**: Full Supabase Auth integration with session persistence
- **Barcode Scanning**: QuaggaJS library loaded dynamically from CDN
- **Database**: Supabase with Row Level Security (RLS) policies
- **Styling**: Custom glassmorphism design system with Tailwind extensions
- **Mobile Support**: Responsive design with touch-friendly controls and mobile navigation
- **Code Style**: Plain JavaScript with JSX (no TypeScript), ESLint configured for React
- **Error Handling**: Global error boundaries and consistent async/await patterns
- **Security**: Camera access requires HTTPS in production, RLS enforces data isolation

### Security & Access Control

- Row Level Security (RLS) policies enforce data isolation by sucursal
- Branch users can only access their assigned sucursal data
- Admin users have global access to all sucursales
- User authentication required for all operations
- Secure password handling through Supabase Auth
- Real-time session management with auto-refresh tokens

### Setup Requirements

1. **Environment Variables**: Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` file
2. **Database Setup**: 
   - Run database migrations for users, productos, inventarios, movimientos, sucursales tables
   - Configure RLS policies for data access control
   - Populate sucursales table with branch information
3. **Initial Admin**: Create first admin user manually in Supabase Auth, then update role in users table
4. **Product Data**: Import product catalog with MRP/Truper codes for barcode scanning
5. **HTTPS**: Required for camera access in production environments

### Project Structure

```
src/
├── components/
│   ├── Admin/           # Admin dashboard and user management
│   ├── Auth/           # Login and registration components
│   ├── Card/           # Reusable card components including barcode scanner
│   ├── Inventory/      # Inventory screens (scan, history, current, reports)
│   └── ProductCountScreen/ # Product counting interface
├── contexts/           # React contexts (AuthContext)
├── services/          # Business logic services (auth, inventory)
└── config/           # Supabase configuration
```