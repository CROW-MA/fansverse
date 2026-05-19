# 🚀 FanVerse — Guía de Instalación Completa

Plataforma de contenido exclusivo para creadores. Competencia directa a OnlyFans con pagos en **horas**, no en 7 días.

---

## 📁 Estructura del Proyecto

```
fanverse/
├── backend/                 ← API Node.js + Express
│   ├── src/
│   │   ├── index.js         ← Punto de entrada
│   │   ├── config/          ← DB, Redis
│   │   ├── routes/          ← Todos los endpoints
│   │   ├── middleware/      ← Auth JWT
│   │   └── services/        ← Socket.IO, Email
│   ├── uploads/             ← Media subido por creadores
│   ├── schema.sql           ← Estructura de la BD
│   └── .env.example         ← Variables de entorno
│
├── frontend/                ← React 18
│   ├── src/
│   │   ├── pages/           ← Home, Dashboard, Payouts, etc.
│   │   ├── components/      ← Layout, Navbar
│   │   ├── context/         ← Auth, Socket
│   │   └── services/api.js  ← Cliente Axios
│   └── public/
│
├── nginx.conf               ← Configuración Nginx + Cloudflare
├── pm2.config.js            ← Gestión de procesos
├── deploy.sh                ← Instalación automática
└── update.sh                ← Actualización sin downtime
```

---

## ⚡ Instalación Rápida en Ubuntu

### Requisitos
- Ubuntu 22.04 / 24.04
- Mínimo 2GB RAM, 2 CPU cores, 20GB disco
- Un dominio (ej: fanverse.com)
- Cuenta Cloudflare (gratis)

### Paso 1 — Subir el código al servidor

```bash
# Desde tu máquina local, sube el proyecto:
scp -r ./fanverse/ usuario@IP_TU_SERVER:/tmp/fanverse

# O si usas git:
ssh usuario@IP_TU_SERVER
git clone https://github.com/tuusuario/fanverse /tmp/fanverse
```

### Paso 2 — Correr el script de instalación

```bash
ssh root@IP_TU_SERVER
chmod +x /tmp/fanverse/deploy.sh
bash /tmp/fanverse/deploy.sh
```

El script instala automáticamente:
- Node.js 20, npm, PM2
- PostgreSQL 16, Redis
- Nginx
- Certbot (SSL gratis)
- UFW firewall
- fail2ban (protección brute-force)

---

## ☁️ Configurar Cloudflare (sin acceso al router)

Esta es la parte clave para que funcione sin tocar el router.

### Paso 1 — Agregar tu dominio a Cloudflare
1. Ve a [cloudflare.com](https://cloudflare.com) → Add Site
2. Ingresa tu dominio (ej: `fanverse.com`)
3. Elige el plan **Free**
4. Cloudflare te dará 2 nameservers — configúralos en tu registrador de dominio

### Paso 2 — Configurar DNS en Cloudflare

| Tipo | Nombre | Contenido         | Proxy |
|------|--------|-------------------|-------|
| A    | @      | IP_DE_TU_SERVER   | ✅ Proxied |
| A    | www    | IP_DE_TU_SERVER   | ✅ Proxied |
| A    | api    | IP_DE_TU_SERVER   | ✅ Proxied |

> El ícono naranja ☁️ = Cloudflare actúa de proxy. Tu IP real queda oculta.

### Paso 3 — SSL/TLS en Cloudflare

Ve a **SSL/TLS → Overview**:
- Selecciona **Full (strict)** ← muy importante

Ve a **SSL/TLS → Edge Certificates**:
- ✅ Always Use HTTPS
- ✅ Automatic HTTPS Rewrites
- Minimum TLS Version: TLS 1.2

### Paso 4 — Reglas de seguridad recomendadas

En **Security → WAF** (Web Application Firewall):
- Activa el modo **Managed** para protección automática

En **Security → Bots**:
- Activa **Bot Fight Mode**

En **Speed → Optimization**:
- ✅ Auto Minify (JS, CSS, HTML)
- ✅ Brotli compression

---

## 🔑 Variables de entorno requeridas

Edita `/var/www/fanverse/backend/.env`:

```env
# STRIPE (consíguelas en dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# EMAIL (configura en Gmail: Seguridad → Contraseñas de app)
SMTP_USER=noreply@fanverse.com
SMTP_PASS=tu_app_password_de_gmail

# AWS S3 (opcional — para almacenamiento de media en la nube)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=fanverse-media
```

Edita `/var/www/fanverse/frontend/.env`:

```env
REACT_APP_STRIPE_PUBLIC_KEY=pk_live_...
```

Después de editar:
```bash
pm2 restart fanverse-api
```

---

## 💳 Integraciones de Pago para Colombia/LATAM

### Stripe (tarjetas internacionales)
1. Crea cuenta en [stripe.com](https://stripe.com)
2. Activa pagos para Colombia en el dashboard
3. Copia `sk_live_...` y `pk_live_...` al `.env`

### Nequi (pagos instantáneos Colombia)
- Integrar via API de Nequi para Empresas: [developers.nequi.com.co](https://developers.nequi.com.co)

### PSE / Bancolombia
- Integrar via **PayU Colombia** o **Wompi**: [dev.wompi.co](https://dev.wompi.co)

### USDT (cripto)
- Integrar via **Binance Pay** o **TRC20** directo

---

## 🛠️ Comandos útiles del día a día

```bash
# Ver estado de la app
pm2 status

# Ver logs en tiempo real
pm2 logs fanverse-api

# Monitor de CPU/RAM
pm2 monit

# Reiniciar sin downtime
pm2 reload fanverse-api

# Reiniciar Nginx
systemctl reload nginx

# Ver estado base de datos
sudo -u postgres psql -d fanverse_db -c "\dt"

# Backup de la BD
pg_dump -U fanverse_user fanverse_db > backup_$(date +%Y%m%d).sql

# Ver espacio en disco
df -h

# Ver conexiones activas
ss -tulnp

# Actualizar la app
bash /var/www/fanverse/update.sh
```

---

## 📊 Comisiones y modelo de negocio

| Concepto | Porcentaje |
|----------|------------|
| Comisión plataforma | 15% |
| Creador recibe | 85% |
| Retiro instantáneo (< 30min) | +1.5% extra |
| Retiro en 2h (Bancolombia/PSE) | 0% extra |
| Retiro en 24h (internacional) | 0% extra |

**Ventaja vs OnlyFans:**
- OnlyFans cobra 20% → nosotros 15% (5% más para el creador)
- OnlyFans paga en 7 días → nosotros en 2 horas
- OnlyFans no acepta PSE ni Nequi → nosotros sí

---

## 🔒 Seguridad implementada

- ✅ JWT con refresh tokens automáticos
- ✅ Rate limiting por IP (Auth: 5/min, API: 30/s)
- ✅ Contraseñas hasheadas con bcrypt (12 rounds)
- ✅ Helmet.js (headers de seguridad HTTP)
- ✅ CORS configurado solo para tu dominio
- ✅ Validación de tipos de archivo en uploads
- ✅ SQL parametrizado (sin SQL injection)
- ✅ fail2ban contra brute-force SSH/Nginx
- ✅ UFW firewall (solo puertos 80, 443, 22)
- ✅ IP real de Cloudflare correctamente configurada

---

## 📞 Soporte y próximas mejoras sugeridas

- [ ] Verificación KYC de identidad (Jumio o Onfido)
- [ ] Lives con WebRTC (Agora.io)
- [ ] App móvil (React Native)
- [ ] Sistema de referidos para creadores
- [ ] Descuentos automáticos por volumen de fans
- [ ] Panel admin de moderación de contenido
- [ ] Integración con Binance Pay para cripto

---

*FanVerse v1.0.0 — Construido para creadores latinoamericanos 🇨🇴🇲🇽🇦🇷*
