# Correcciones para Errores 404 en Google Search Console

## Cambios Realizados

### 1. Rutas Explícitas Agregadas en server.js
Se agregaron rutas explícitas para todos los archivos HTML:
- `/donation` → donation.html
- `/donation-select` → donation-select.html
- `/payment` → payment.html
- `/transfer` → transfer.html

### 2. Archivos SEO Creados
- **robots.txt**: Indica a los bots qué páginas pueden indexar
- **sitemap.xml**: Mapa del sitio con todas las URLs públicas

### 3. Middleware de Redirección Mejorado
Se actualizó el middleware para excluir archivos estáticos y SEO de las redirecciones:
- robots.txt
- sitemap.xml
- Archivos CSS, JS, imágenes

## Próximos Pasos

### 1. Desplegar los Cambios
```bash
git add .
git commit -m "Fix: Add explicit routes for HTML pages and SEO files to resolve 404 errors"
git push origin main
```

### 2. Verificar en Google Search Console
Después del despliegue:
1. Ve a Google Search Console
2. Navega a "Cobertura" o "Páginas"
3. Haz clic en "Validar corrección" para las URLs con error 404
4. Google volverá a rastrear las páginas en 1-2 días

### 3. Enviar Sitemap
1. En Google Search Console, ve a "Sitemaps"
2. Agrega: `https://www.cadencewave.io/sitemap.xml`
3. Haz clic en "Enviar"

### 4. Probar URLs Manualmente
Verifica que estas URLs funcionen correctamente:
- https://www.cadencewave.io/
- https://www.cadencewave.io/donation
- https://www.cadencewave.io/donation-select
- https://www.cadencewave.io/payment
- https://www.cadencewave.io/transfer
- https://www.cadencewave.io/robots.txt
- https://www.cadencewave.io/sitemap.xml

## Posibles Causas de los 404

1. **Rutas no definidas**: Las páginas HTML no tenían rutas explícitas en Express
2. **Redirecciones agresivas**: El middleware de redirección podía interferir con archivos estáticos
3. **Falta de sitemap**: Google no sabía qué páginas indexar

## Monitoreo

Revisa Google Search Console en 7-14 días para confirmar que:
- Los errores 404 han disminuido
- Las páginas se están indexando correctamente
- El sitemap se procesó sin errores
