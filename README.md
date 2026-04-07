# SpaceHub 🏢

Marketplace de alquiler de espacios por horas. Inspirado en Peerspace / Airbnb, construido con Next.js 14, Prisma, PostgreSQL y Stripe.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router), React, TypeScript, Tailwind CSS |
| UI Components | shadcn/ui, Framer Motion, Lucide |
| Backend | Next.js API Routes, TypeScript |
| ORM | Prisma |
| Base de datos | PostgreSQL |
| Autenticación | Auth.js v5 (NextAuth) |
| Pagos | Stripe |
| Mapas | Mapbox GL |
| Imágenes | Cloudinary |
| Email | Resend |
| Validación | Zod |
| Estado cliente | TanStack Query, Zustand |

---

## Instalación y configuración

### 1. Clonar y preparar

```bash
git clone <repo>
cd spacehub
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales reales. Las mínimas para arrancar en local:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/spacehub"
NEXTAUTH_SECRET="genera-con-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Stripe (test keys)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN="pk.eyJ1..."

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# Resend (opcional en desarrollo)
RESEND_API_KEY="re_..."
```

### 3. Base de datos

```bash
# Crear la base de datos PostgreSQL
createdb spacehub

# Generar el cliente Prisma
npm run db:generate

# Aplicar migraciones
npm run db:migrate

# Cargar datos de ejemplo
npm run db:seed
```

### 4. Arrancar el servidor

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Credenciales de demo

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | admin@spacehub.app | Password123! |
| Propietario | propietario1@demo.com | Password123! |
| Cliente | cliente@demo.com | Password123! |

---

## Estructura del proyecto

```
spacehub/
├── prisma/
│   ├── schema.prisma          # Modelo de datos completo
│   └── seed.ts                # Datos de ejemplo
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login, Register
│   │   ├── (public)/          # Home, Search, Venue detail, Checkout
│   │   ├── (dashboard)/
│   │   │   ├── admin/         # Panel administrador
│   │   │   ├── owner/         # Panel propietario
│   │   │   └── tenant/        # Panel cliente
│   │   └── api/               # API Routes
│   │       ├── auth/
│   │       ├── venues/
│   │       ├── bookings/
│   │       ├── availability/
│   │       ├── checkout/
│   │       ├── webhooks/stripe/
│   │       ├── reviews/
│   │       ├── favorites/
│   │       ├── notifications/
│   │       ├── admin/
│   │       └── owner/
│   ├── components/
│   │   ├── booking/           # BookingWidget, checkout components
│   │   ├── dashboard/         # KPIs, tables, charts, sidebars
│   │   ├── map/               # VenueMap (Mapbox)
│   │   ├── search/            # SearchPageClient, SearchFilters
│   │   ├── shared/            # Header, Footer, Hero, HowItWorks...
│   │   ├── venue/             # VenueCard, Gallery, Reviews...
│   │   └── ui/                # shadcn/ui primitives
│   ├── lib/
│   │   ├── auth.ts            # Auth.js configuration
│   │   ├── auth-middleware.ts # withAuth, withAdmin, withOwner
│   │   ├── db.ts              # Prisma singleton
│   │   ├── api-response.ts    # Typed responses + AppError
│   │   └── validations/       # Zod schemas
│   ├── services/
│   │   ├── venue.service.ts   # Venue business logic
│   │   ├── booking.service.ts # Availability + pricing + booking
│   │   ├── payment.service.ts # Stripe integration
│   │   ├── notification.service.ts
│   │   └── email.service.ts   # Resend transactional emails
│   ├── middleware.ts           # Route protection
│   └── utils/
│       ├── format.ts          # Currency, date, number formatters
│       ├── slugify.ts
│       └── venue-completeness.ts
```

---

## Flujos principales implementados

### 🔐 Autenticación
- Registro con email/contraseña (roles: TENANT / OWNER)
- Login con credenciales o Google OAuth
- Protección de rutas por rol via middleware
- JWT sessions

### 🏢 Publicación de espacios
- Creación y edición de anuncios
- Gestión de imágenes
- Geocodificación de dirección
- Sistema de completeness scoring
- Revisión por admin antes de publicar

### 🔍 Búsqueda
- Filtros: ciudad, fecha, precio, capacidad, tipo, amenities
- Resultados en lista + mapa sincronizado (Mapbox)
- Marcadores interactivos con precio
- Ordenación por relevancia, precio, valoración

### 📅 Reservas
- Comprobación de disponibilidad en tiempo real
- Prevención de overbooking server-side
- Cálculo dinámico de precio (tarifas estacionales)
- Buffers entre reservas
- Flujo: PENDING → AWAITING_PAYMENT → CONFIRMED → COMPLETED

### 💳 Pagos (Stripe)
- PaymentIntent con Stripe Elements
- Webhook handler verificado
- Reembolsos
- Recibos automáticos

### 📊 Dashboards
- **Admin**: KPIs globales, moderación, métricas de plataforma
- **Owner**: Ingresos, ocupación, gestión de espacios y reservas
- **Tenant**: Reservas, favoritos, historial

---

## Webhooks de Stripe en local

```bash
# Instala Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Escucha webhooks y redirige a tu servidor
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copia el webhook secret que te da y ponlo en STRIPE_WEBHOOK_SECRET
```

---

## Despliegue en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Variables de entorno en producción
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
# ... resto de variables
```

**Base de datos recomendada en producción**: [Neon](https://neon.tech) o [Supabase](https://supabase.com) (PostgreSQL serverless)

**Redis opcional**: [Upstash](https://upstash.com) para rate limiting y caché de sesiones

---

## Roadmap de próximas features

### Corto plazo
- [ ] Formulario completo de creación/edición de espacio con subida de imágenes a Cloudinary
- [ ] Panel de mensajería owner ↔ tenant
- [ ] Calendario visual de disponibilidad (para propietario)
- [ ] Sistema de reseñas completo con respuestas del propietario
- [ ] Exportación de reservas a CSV

### Medio plazo
- [ ] Payouts automáticos a propietarios (Stripe Connect)
- [ ] Sistema de cupones y descuentos
- [ ] Multiidioma (i18n) con next-intl
- [ ] Push notifications (web push)
- [ ] Facturación automatizada (facturas PDF)
- [ ] Panel financiero avanzado

### Largo plazo
- [ ] App móvil React Native
- [ ] Chat en tiempo real (WebSockets / Socket.io)
- [ ] IA para sugerencia de precios
- [ ] IA para clasificación automática de anuncios
- [ ] Sistema de afiliados
- [ ] Multi-moneda
- [ ] Expansión internacional

---

## Modelo de negocio

- **Comisión de plataforma**: 10% sobre cada reserva (configurable)
- **Espacios destacados**: fee mensual para aparecer en home y resultados
- **Plan premium propietario**: features avanzadas de analítica y gestión
- **Expansión geográfica**: modelo replicable a cualquier ciudad/país

---

## Licencia

Propietario. Todos los derechos reservados.
