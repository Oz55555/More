# Tarjetas de Prueba de Stripe

Para probar los pagos con Stripe, usa estas tarjetas de prueba válidas:

## ✅ Tarjetas que FUNCIONAN

### Visa
- **Número**: `4242424242424242`
- **Fecha**: Cualquier fecha futura (ej: `12/25`)
- **CVV**: Cualquier 3 dígitos (ej: `123`)

### Visa (Debit)
- **Número**: `4000056655665556`
- **Fecha**: Cualquier fecha futura
- **CVV**: Cualquier 3 dígitos

### Mastercard
- **Número**: `5555555555554444`
- **Fecha**: Cualquier fecha futura
- **CVV**: Cualquier 3 dígitos

### American Express
- **Número**: `378282246310005`
- **Fecha**: Cualquier fecha futura
- **CVV**: Cualquier 4 dígitos (ej: `1234`)

## ❌ Tarjetas que FALLAN (para probar errores)

### Tarjeta Rechazada
- **Número**: `4000000000000002`
- **Error**: `card_declined`

### Fondos Insuficientes
- **Número**: `4000000000009995`
- **Error**: `insufficient_funds`

### Tarjeta Expirada
- **Número**: `4000000000000069`
- **Error**: `expired_card`

### CVC Incorrecto
- **Número**: `4000000000000127`
- **Error**: `incorrect_cvc`

## 🔧 Configuración Requerida

Para que funcione, necesitas claves de Stripe válidas en tu archivo `.env`:

```
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 📝 Notas Importantes

1. **Usa solo tarjetas de prueba** en modo test
2. **Nunca uses tarjetas reales** en desarrollo
3. **Cualquier fecha futura** es válida para expiración
4. **Cualquier CVV** funciona para tarjetas de prueba
5. **El nombre puede ser cualquiera**

## 🌐 Más información

- [Documentación oficial de Stripe](https://stripe.com/docs/testing)
- [Lista completa de tarjetas de prueba](https://stripe.com/docs/testing#cards)
