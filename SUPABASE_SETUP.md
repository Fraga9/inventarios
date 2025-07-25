# Guía de Configuración de Supabase

Esta guía te ayudará a configurar la aplicación de inventario para conectarse con tu base de datos Supabase.

## Paso 1: Configurar Variables de Entorno

1. Copia el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edita el archivo `.env` con las credenciales de tu proyecto Supabase:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto-id.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anonima-aqui
   ```

### ¿Dónde encontrar estas credenciales?

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **Settings** > **API**
3. Copia la **URL** y la **anon public key**

## Paso 2: Configurar la Sucursal por Defecto

En el archivo `src/config/supabase.js`, ajusta el `DEFAULT_SUCURSAL_ID`:

```javascript
export const APP_CONFIG = {
  // Cambia este ID por el de tu sucursal principal
  DEFAULT_SUCURSAL_ID: 1,
  
  // Usuario que aparecerá en los movimientos
  DEFAULT_USER: 'Sistema_Inventario',
  
  HISTORY_LIMIT: 10,
};
```

## Paso 3: Verificar Datos de Prueba

Asegúrate de que tienes datos en las siguientes tablas:

### Tabla `sucursales`
```sql
INSERT INTO sucursales (id_sucursal, "Sucursal", "Región", "Dirección") 
VALUES (1, 'Sucursal Principal', 'Centro', 'Av. Principal 123');
```

### Tabla `productos` (ejemplos)
```sql
INSERT INTO productos (id_producto, codigo_mrp, codigo_truper, marca, descripcion) VALUES 
(1, '123456789012', NULL, 'HP', 'Laptop Gaming ROG Strix'),
(2, '7898357410015', NULL, 'Samsung', 'Smartphone Galaxy S24'),
(3, '987654321098', NULL, 'Apple', 'Tablet iPad Pro'),
(4, 'ABC123DEF456', NULL, 'Apple', 'Audífonos AirPods Pro');
```

## Paso 4: Configurar Políticas RLS (Row Level Security)

Si tienes RLS habilitado, asegúrate de crear políticas que permitan:

```sql
-- Política para permitir SELECT en productos
CREATE POLICY "Allow read productos" ON productos
FOR SELECT USING (true);

-- Política para permitir todas las operaciones en inventarios
CREATE POLICY "Allow all inventarios" ON inventarios
FOR ALL USING (true);

-- Política para permitir todas las operaciones en movimientos
CREATE POLICY "Allow all movimientos" ON movimientos
FOR ALL USING (true);

-- Política para permitir SELECT en sucursales
CREATE POLICY "Allow read sucursales" ON sucursales
FOR SELECT USING (true);
```

## Paso 5: Probar la Conexión

1. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Abre la aplicación en tu navegador
3. Intenta escanear un código que exista en tu tabla `productos`
4. Verifica que aparezcan los datos reales en el historial

## Funcionalidades Implementadas

### 🔍 Búsqueda de Productos
- Busca productos por `codigo_mrp` o `codigo_truper`
- Maneja productos no encontrados creando registros genéricos

### 📊 Registro de Movimientos
- Registra cada conteo en la tabla `movimientos`
- Actualiza o crea registros en la tabla `inventarios`
- Calcula diferencias automáticamente

### 📋 Historial
- Muestra los últimos movimientos de la sucursal
- Incluye información del producto relacionado
- Actualiza en tiempo real después de cada operación

### 📈 Estadísticas
- Cuenta total de productos únicos en inventario
- Suma total de unidades contadas
- Precisión fija al 100% (personalizable)

## Estructura de Datos

### Flujo de un Escaneo
1. **Escaneo** → Busca producto en `productos`
2. **Conteo** → Usuario ingresa cantidad
3. **Guardado** → 
   - Crea registro en `movimientos`
   - Actualiza/crea registro en `inventarios`
   - Actualiza UI con nuevos datos

### Tipos de Movimiento Soportados
- `conteo`: Conteo regular (por defecto)
- `conteo_inicial`: Primer conteo de un producto
- `ajuste`: Ajuste manual
- `entrada`: Mercancía que llega
- `salida`: Mercancía que sale
- `merma`: Producto dañado/vencido
- `devolucion`: Devolución de cliente

## Troubleshooting

### Error: "Cannot connect to Supabase"
- Verifica que las credenciales en `.env` sean correctas
- Asegúrate de que el proyecto Supabase esté activo

### Error: "Product not found"
- Verifica que el código escaneado exista en la tabla `productos`
- La app creará un producto genérico si no se encuentra

### Error: "Permission denied"
- Revisa las políticas RLS en Supabase
- Asegúrate de que las tablas tengan permisos de lectura/escritura

### Error: "Default sucursal not found"
- Verifica que el `DEFAULT_SUCURSAL_ID` exista en la tabla `sucursales`
- Crea la sucursal o cambia el ID en la configuración