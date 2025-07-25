# Solución de Problemas de Cámara

## Error: "NotReadableError: Could not start video source"

Este error es común durante el desarrollo. Significa que la cámara está siendo usada por otra aplicación.

### Posibles Causas:

1. **Otra pestaña del navegador** está usando la cámara
2. **Otra aplicación** (Zoom, Teams, Skype, etc.) tiene la cámara activa
3. **Múltiples instancias** de la aplicación están corriendo
4. **Permisos de cámara** fueron denegados previamente

### Soluciones:

#### 1. Cerrar Otras Aplicaciones
- Cierra todas las aplicaciones que puedan estar usando la cámara
- Cierra otras pestañas del navegador que puedan tener acceso a la cámara
- Verifica el administrador de tareas para aplicaciones ocultas

#### 2. Reiniciar el Navegador
```bash
# Cierra completamente el navegador y abre una nueva ventana
```

#### 3. Verificar Permisos
- Ve a configuración del navegador → Privacidad → Permisos de cámara
- Asegúrate de que `localhost` tenga permisos de cámara
- En Chrome: `chrome://settings/content/camera`
- En Firefox: `about:preferences#privacy`

#### 4. Usar HTTPS en Desarrollo
La API de cámara requiere HTTPS en muchos casos. Para Vite:

```bash
# Instalar certificado local
npm install --save-dev @vitejs/plugin-basic-ssl

# Modificar vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl()  // Agregar esta línea
  ],
  server: {
    https: true  // Agregar esta línea
  }
})

# Reiniciar servidor
npm run dev
```

#### 5. Usar Entrada Manual (Implementada)
Si la cámara no funciona, la aplicación ahora incluye:
- ✅ **Entrada manual de código de barras**
- ✅ **Detección automática de errores de cámara**
- ✅ **Botón de fallback siempre disponible**

### Desarrollo en Diferentes Navegadores

#### Chrome/Edge
- Mejor soporte para cámara
- Requiere HTTPS para producción
- Permite localhost sin HTTPS

#### Firefox
- Puede requerir permisos explícitos
- Comportamiento más estricto con permisos

#### Safari
- Solo funciona con HTTPS
- Permisos más restrictivos
- Considerar usar `facingMode: "user"` en lugar de `"environment"`

### Modo de Simulación

Para desarrollo sin cámara, la aplicación incluye simulación automática:

```javascript
// En BarcodeCard.jsx, la función simulateScan() se activa automáticamente
// cuando QuaggaJS no está disponible o la cámara falla

const simulatedCodes = ['123456789012', 'PROD123', '987654321098', 'ABC123DEF456'];
```

### Comandos Útiles para Debugging

```bash
# Verificar qué está usando la cámara (Linux/Mac)
lsof | grep -i camera

# Verificar procesos del navegador
ps aux | grep -i chrome
ps aux | grep -i firefox

# Matar procesos del navegador (si es necesario)
pkill chrome
pkill firefox
```

### Configuración Recomendada para Desarrollo

1. **Usar un puerto específico**:
```javascript
// vite.config.js
export default defineConfig({
  server: {
    port: 3000,
    host: true
  }
})
```

2. **Configurar hosts file** (opcional):
```bash
# /etc/hosts (Linux/Mac) o C:\Windows\System32\drivers\etc\hosts (Windows)
127.0.0.1 inventario.local
```

3. **Acceder via**: `https://inventario.local:3000`

### Testing en Dispositivos Móviles

Para probar en móviles durante desarrollo:

```bash
# Exponer servidor en la red local
npm run dev -- --host 0.0.0.0

# Acceder desde móvil usando IP de tu computadora
# Ejemplo: https://192.168.1.100:5173
```

### Mensaje para el Usuario

La aplicación ahora muestra mensajes específicos:
- **NotReadableError**: "La cámara está siendo usada por otra aplicación"
- **NotAllowedError**: "Permisos denegados"
- **NotFoundError**: "No se encontró cámara disponible"

Cada error incluye un botón para alternar a entrada manual.

### Conclusión

Con las mejoras implementadas, la aplicación debería funcionar incluso cuando hay problemas de cámara. Los usuarios pueden:

1. **Intentar escanear** con la cámara
2. **Ver error específico** si falla
3. **Usar entrada manual** como fallback
4. **Continuar trabajando** sin interrupciones