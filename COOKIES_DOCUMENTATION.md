# Sistema de Gestión de Cookies

## 📋 Descripción General

Sistema completo de gestión de consentimiento de cookies conforme a GDPR/CCPA que permite a los usuarios:
- ✅ Aceptar todas las cookies
- ❌ Rechazar cookies no esenciales
- ⚙️ Configurar preferencias individuales por categoría

## 🎯 Características Principales

### 1. **Banner de Cookies**
- Aparece automáticamente en la primera visita
- Diseño moderno con glassmorphism
- Responsive para todos los dispositivos
- Animación suave de entrada desde abajo

### 2. **Categorías de Cookies**

#### 🛡️ **Cookies Estrictamente Necesarias**
- **Estado**: Siempre activas (no se pueden desactivar)
- **Propósito**: Funcionalidad esencial del sitio
- **Ejemplos**: Sesión, autenticación, preferencias de idioma

#### 📊 **Cookies de Análisis**
- **Estado**: Opcional
- **Propósito**: Entender cómo los usuarios interactúan con el sitio
- **Ejemplos**: Google Analytics, métricas de rendimiento

#### 📢 **Cookies de Marketing**
- **Estado**: Opcional
- **Propósito**: Rastrear visitantes para publicidad personalizada
- **Ejemplos**: Facebook Pixel, Google Ads

#### 🎨 **Cookies de Preferencias**
- **Estado**: Opcional
- **Propósito**: Recordar preferencias del usuario
- **Ejemplos**: Tema oscuro/claro, configuración de idioma

### 3. **Modal de Configuración**
- Interfaz detallada para cada categoría
- Toggles interactivos con animaciones
- Descripciones claras de cada tipo de cookie
- Iconos visuales para mejor comprensión

## 🔧 Implementación Técnica

### Archivos Creados

```
js/cookies.js          - Lógica de gestión de cookies
css/cookies.css        - Estilos del banner y modal
```

### Integración en HTML

```html
<!-- En el <head> -->
<link rel="stylesheet" href="css/cookies.css">

<!-- Antes de </body> -->
<script src="js/cookies.js"></script>
```

## 💾 Almacenamiento de Preferencias

### Cookie de Consentimiento
- **Nombre**: `cadencewave_cookie_consent`
- **Formato**: JSON
- **Duración**: 365 días
- **Ejemplo**:
```json
{
  "necessary": true,
  "analytics": true,
  "marketing": false,
  "preferences": true
}
```

## 🎨 Diseño UI/UX

### Principios Aplicados

1. **Transparencia**: Información clara sobre cada tipo de cookie
2. **Control**: Usuario tiene control total sobre sus preferencias
3. **Accesibilidad**: Diseño responsive y fácil de usar
4. **No Intrusivo**: Banner discreto pero visible
5. **Cumplimiento Legal**: Conforme a GDPR y CCPA

### Colores y Estilos

- **Banner**: Fondo blanco semi-transparente con backdrop-filter
- **Botón Aceptar**: Gradiente azul (color corporativo)
- **Botón Rechazar**: Blanco con borde gris
- **Botón Configurar**: Blanco con borde azul
- **Toggles**: Azul cuando activo, gris cuando inactivo

## 🔌 Integración con Servicios

### Google Analytics (Ejemplo)

```javascript
enableAnalytics() {
    if (this.preferences.analytics) {
        // Cargar Google Analytics
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'GA_MEASUREMENT_ID');
    }
}
```

### Otros Servicios

Puedes agregar integraciones en los métodos:
- `enableAnalytics()` - Para herramientas de análisis
- `enableMarketing()` - Para píxeles de marketing
- `enablePreferences()` - Para cookies de preferencias

## 📱 Responsive Design

### Breakpoints

- **Desktop** (>992px): Layout horizontal
- **Tablet** (768px-992px): Layout vertical con botones en fila
- **Mobile** (<768px): Layout completamente vertical
- **Small Mobile** (<480px): Tamaños de fuente reducidos

## 🧪 Testing

### Probar el Banner

1. Abre el sitio en modo incógnito
2. El banner debe aparecer automáticamente
3. Prueba cada botón:
   - "Accept All" → Todas las cookies activadas
   - "Reject All" → Solo cookies necesarias
   - "Cookie Settings" → Abre modal de configuración

### Verificar Persistencia

1. Acepta/rechaza cookies
2. Recarga la página
3. El banner NO debe aparecer
4. Abre DevTools → Application → Cookies
5. Verifica que existe `cadencewave_cookie_consent`

### Resetear Preferencias

```javascript
// En la consola del navegador
document.cookie = "cadencewave_cookie_consent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
location.reload();
```

## 🔒 Seguridad y Privacidad

### Buenas Prácticas Implementadas

✅ Cookie con `SameSite=Lax` para protección CSRF
✅ Expiración de 365 días (renovable)
✅ Almacenamiento solo de preferencias (no datos personales)
✅ Validación de JSON al leer cookies
✅ Manejo de errores en parsing

## 📊 Cumplimiento Legal

### GDPR (Europa)
✅ Consentimiento explícito requerido
✅ Opción de rechazar cookies no esenciales
✅ Información clara sobre el propósito de cada cookie
✅ Fácil acceso a configuración

### CCPA (California)
✅ Opción de opt-out
✅ Transparencia en el uso de datos
✅ Control granular sobre categorías

## 🎯 Próximos Pasos

### Integraciones Recomendadas

1. **Google Analytics 4**
   - Agregar tracking code en `enableAnalytics()`
   - Configurar eventos personalizados

2. **Facebook Pixel**
   - Agregar en `enableMarketing()`
   - Solo cargar si usuario acepta marketing

3. **Hotjar / Clarity**
   - Agregar en `enableAnalytics()`
   - Para mapas de calor y grabaciones

4. **Cookie Policy Page**
   - Crear página `/cookie-policy`
   - Enlazar desde el banner

## 🛠️ Personalización

### Cambiar Duración de Cookies

```javascript
// En cookies.js, línea 7
this.cookieExpiry = 365; // Cambiar a días deseados
```

### Modificar Textos

Edita el HTML en `cookies.js`:
- Banner: Línea 35-50
- Modal: Línea 65-140

### Cambiar Colores

Edita `cookies.css`:
- Variables CSS en `:root` (si las agregas)
- Clases `.cookie-btn-*` para botones
- `.cookie-toggle-slider` para toggles

## 📞 Soporte

Para dudas o problemas:
1. Revisa la consola del navegador
2. Verifica que los archivos CSS y JS estén cargando
3. Comprueba que no hay conflictos con otros scripts

## 📝 Changelog

### v1.0.0 (2025-10-05)
- ✨ Implementación inicial
- 🎨 Diseño moderno con glassmorphism
- 📱 Responsive design completo
- ⚙️ 4 categorías de cookies configurables
- 🔒 Cumplimiento GDPR/CCPA
