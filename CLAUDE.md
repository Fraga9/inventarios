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

1. **Product Database**: Hardcoded in App.jsx with sample products (laptops, phones, tablets, headphones)
2. **Barcode Scanning**: BarcodeCard → App.handleBarcodeScanning → sets scannedProduct
3. **Product Counting**: ProductCountScreen → App.handleSaveCount → updates scanned items history
4. **State Management**: Local state with useState, maintains last 10 scanned items

### Database Integration

**Supabase Configuration**:
- Client configured in `src/config/supabase.js`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Default sucursal ID and user configurable in APP_CONFIG

**Service Layer** (`src/services/inventoryService.js`):
- `findProductByBarcode()`: Searches productos table by codigo_mrp or codigo_truper
- `registerMovement()`: Records movement and updates inventory in a transaction
- `getCurrentInventory()`: Gets current stock for a product/sucursal
- `getRecentMovements()`: Fetches recent movements with product info
- `getInventoryStats()`: Calculates inventory statistics

**Database Tables**:
- `productos`: Product catalog with MRP/Truper codes
- `inventarios`: Current stock levels per product/sucursal
- `movimientos`: Audit trail of all inventory changes
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