# Fiestalo 🎉

**Marketplace de salas de fiestas infantiles y celebraciones en España.**

Plataforma completa tipo Airbnb/Peerspace especializada en salas de fiestas, salones de celebraciones y espacios temáticos. Reserva por horas o paquetes de tiempo, con gestión completa para propietarios, clientes y administradores.

> Construido con Next.js 14 App Router, Prisma, PostgreSQL, Stripe, Mapbox y Resend.

---

## Estado del proyecto

| Módulo | Estado |
|--------|--------|
| Autenticación (email + Google OAuth) | ✅ Completo |
| Publicación y gestión de espacios | ✅ Completo |
| Buscador avanzado con mapa | ✅ Completo |
| Sistema de reservas y disponibilidad | ✅ Completo |
| Pagos con Stripe + webhooks | ✅ Completo |
| Sistema de reseñas con moderación | ✅ Completo |
| Mensajería entre usuarios | ✅ Completo |
| Notificaciones in-app (25 tipos) | ✅ Completo |
| Emails transaccionales (Resend) | ✅ Completo |
| Panel admin con analítica | ✅ Completo |
| Panel propietario | ✅ Completo |
| Panel cliente | ✅ Completo |
| Edición de perfil con foto | ✅ Completo |
| Favoritos | ✅ Completo |
| Páginas legales (RGPD/LOPDGDD) | ✅ Completo |
| Recuperación de contraseña | ⏳ Pendiente DNS producción |
| Calendario visual propietario | 🔲 Por implementar |
| Analytics propietario | 🔲 Por implementar |
| Facturación/billing propietario | 🔲 Por implementar |
| Payouts automáticos (Stripe Connect) | 🔲 Futuro |

**30 páginas · 46 API routes · 62 componentes · 7 servicios · 32 modelos Prisma**

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Estilos | Tailwind CSS, shadcn/ui, Framer Motion |
| ORM | Prisma 5 |
| Base de datos | PostgreSQL |
| Autenticación | Auth.js v5 (NextAuth beta) — email + Google OAuth |
| Pagos | Stripe (PaymentIntents, Webhooks, Refunds) |
| Mapas | Mapbox GL v2.15.0 |
| Imágenes | Cloudinary (uploads firmados en servidor) |
| Email | Resend + React Email |
| Validación | Zod |
| Charts | Recharts |
| Geocodificación | Mapbox Geocoding API |
| Fetching cliente | TanStack Query v5 |

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd spacehub
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```env
# Base de datos
DATABASE_URL="postgresql://postgres:password@localhost:5432/fiestalo"

# Auth.js
NEXTAUTH_SECRET="genera-con: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="Fiestalo"

# Stripe — usar claves de TEST en desarrollo
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN="pk.eyJ1..."

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="tu-cloud-name"
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# Resend (opcional en desarrollo)
RESEND_API_KEY="re_..."
RESEND_FORCE_SEND="true"

# Google OAuth (opcional en desarrollo)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

### 3. Base de datos y seed

```bash
createdb fiestalo
npm run db:migrate
npm run db:generate
npm run db:seed
```

### 4. Arrancar

```bash
npm run dev
# → http://localhost:3000
```

---

## Credenciales de demo

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Administrador | `admin@fiestalo.es` | `Password123!` |
| Propietario 1 | `propietario1@demo.com` | `Password123!` |
| Propietario 2 | `propietario2@demo.com` | `Password123!` |
| Cliente | `cliente@demo.com` | `Password123!` |

---

## Estructura del proyecto

```
spacehub/
├── prisma/
│   ├── schema.prisma          # 32 modelos, 11 enums
│   ├── seed.ts                # Categorías, amenities, venues y usuarios demo
│   └── migrations/
│
├── src/
│   ├── app/
│   │   ├── (auth)/            # /login  /register  /onboarding
│   │   ├── (public)/          # /  /search  /venues/[id]  /checkout  /terms  /privacy
│   │   ├── (dashboard)/
│   │   │   ├── admin/         # Dashboard analítico, venues, users, bookings, payments, reviews
│   │   │   ├── owner/         # Dashboard, spaces, bookings, reviews
│   │   │   └── tenant/        # Dashboard, bookings, favorites, reviews
│   │   └── api/               # 46 endpoints REST
│   │       ├── admin/         # analytics, moderación venues, ban/unban users
│   │       ├── auth/          # nextauth, register, onboarding
│   │       ├── bookings/      # create, cancel, refund
│   │       ├── checkout/      # Stripe PaymentIntent
│   │       ├── cloudinary/    # signed uploads (venues + avatars)
│   │       ├── conversations/ # mensajería, mensajes, unread count
│   │       ├── favorites/     # toggle favoritos
│   │       ├── geocode/       # Mapbox geocoding proxy
│   │       ├── notifications/ # CRUD + clear all
│   │       ├── owner/         # spaces, bookings, availability, blocks, metrics
│   │       ├── reviews/       # create, moderate, owner response
│   │       ├── user/          # profile, avatar
│   │       ├── venues/        # search, detail, pricing
│   │       └── webhooks/      # Stripe webhook handler
│   │
│   ├── components/
│   │   ├── booking/           # BookingWidget
│   │   ├── dashboard/         # KPIs, charts, tables, sidebars (admin/owner/tenant)
│   │   ├── forms/             # VenueForm, SpaceEditClient, AddressAutocomplete
│   │   ├── images/            # ImageUploadZone, ImageGallery, SpaceImagesTab
│   │   ├── map/               # VenueMap (Mapbox GL), VenueMapStatic
│   │   ├── messaging/         # MessagingPanel, MessageButton, MessagingTrigger
│   │   ├── notifications/     # NotificationBell (slide-over panel)
│   │   ├── profile/           # ProfileModal (slide-over panel)
│   │   ├── reviews/           # ReviewForm, VenueReviews, AdminReviewActions, OwnerReviewActions
│   │   ├── search/            # SearchPageClient, SearchFilters
│   │   ├── shared/            # SiteHeader, SiteFooter, HeroSection, HowItWorks...
│   │   ├── venue/             # VenueCard, VenueGallery, VenueInfo, VenueAmenities...
│   │   └── ui/                # shadcn/ui primitives
│   │
│   ├── services/
│   │   ├── availability.service.ts   # Anti-overbooking con SELECT FOR UPDATE
│   │   ├── booking.service.ts        # Creación, confirmación, cancelación
│   │   ├── email.service.ts          # Resend + React Email
│   │   ├── messaging.service.ts      # Conversaciones y mensajes
│   │   ├── notification.service.ts   # notify(event) centralizado — 25 tipos
│   │   ├── payment.service.ts        # Stripe PaymentIntents, refunds, webhooks
│   │   └── venue.service.ts          # Búsqueda, geo search (Haversine), CRUD
│   │
│   ├── emails/
│   │   ├── layout.tsx                # Base con branding Fiestalo
│   │   ├── welcome.tsx
│   │   ├── booking-confirmation.tsx
│   │   ├── booking-request.tsx
│   │   ├── booking-cancellation.tsx
│   │   ├── booking-reminder.tsx
│   │   └── password-reset.tsx
│   │
│   ├── lib/
│   │   ├── auth.ts                   # Auth.js config — JWT, callbacks, Google
│   │   ├── auth-middleware.ts        # withAuth, withAdmin, withOwner
│   │   ├── db.ts                     # Prisma client singleton
│   │   ├── api-response.ts           # Helpers de respuesta + AppError
│   │   └── validations/              # Schemas Zod
│   │
│   ├── hooks/                        # useGeocoder
│   ├── middleware.ts                 # Protección de rutas por rol
│   └── utils/
│       ├── format.ts
│       ├── slugify.ts
│       └── venue-completeness.ts
```

---

## Decisiones técnicas relevantes

### Anti-overbooking
Las reservas usan `SELECT FOR UPDATE` via `db.$transaction`. Si dos usuarios intentan el mismo slot simultáneamente, el segundo recibe un error de conflicto. La verificación ocurre siempre en servidor.

### Búsqueda geográfica
- **Sin coordenadas**: Prisma query estándar con índices.
- **Con coordenadas**: bounding box en Prisma para pre-filtrar + Haversine en JS para distancia exacta. Ordenación por distancia, paginación sobre el conjunto filtrado.

### Sistema de notificaciones
`notificationService.notify(event)` actúa como dispatcher centralizado. Cada evento define internamente quién lo recibe. Los errores nunca bloquean el flujo principal.

### Mensajería
Conversaciones tipadas (`VENUE_INQUIRY`, `BOOKING_SUPPORT`, `GENERAL`). Una conversación por reserva, una por par usuario/venue. Unread counts denormalizados en `ConversationParticipant` para evitar queries costosas.

### Imágenes
Todos los uploads van firmados desde servidor. El cliente nunca tiene acceso al API secret de Cloudinary. Parámetros firmados (folder, transformation, formats) validados por Cloudinary.

### Mapbox GL — ⚠️ nota importante
```
mapbox-gl está fijado en v2.15.0
```
La v3 eliminó el estilo `light-v11`. **No actualizar** sin cambiar el estilo del mapa. `transpilePackages: ["mapbox-gl"]` configurado en `next.config.js` para evitar errores SSR.

---

## Webhooks de Stripe en local

```bash
# macOS
brew install stripe/stripe-cli/stripe
# Otros: https://stripe.com/docs/stripe-cli

stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copiar el webhook secret → STRIPE_WEBHOOK_SECRET en .env.local
```

Eventos manejados: `payment_intent.succeeded/failed/canceled`, `charge.refunded`, `charge.dispute.created/closed`, `checkout.session.completed`

---

## Despliegue en Vercel

### Base de datos recomendada
[Neon](https://neon.tech) — PostgreSQL serverless, plan gratuito suficiente para empezar.

```bash
# 1. Conectar repo en vercel.com → Import Project
# 2. Añadir variables de entorno en el dashboard de Vercel
# 3. Cambiar NEXTAUTH_URL y NEXT_PUBLIC_APP_URL a la URL de producción
# 4. Aplicar migraciones en producción:
npx prisma migrate deploy
```

### Checklist post-deploy
- [ ] Webhook Stripe apuntando a `https://tu-dominio.com/api/webhooks/stripe`
- [ ] Dominio en Resend verificado (DNS puede tardar 24-48h)
- [ ] URL de producción en Google Cloud Console (OAuth Redirect URIs)
- [ ] URL de producción en allowlist del token Mapbox

---

## Scripts

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run lint         # ESLint

npm run db:generate  # Regenerar cliente Prisma
npm run db:migrate   # Crear y aplicar migración
npm run db:seed      # Cargar datos de ejemplo
npm run db:studio    # Prisma Studio (GUI de la BD)
npm run db:reset     # ⚠️ Borrar BD y re-seed (solo desarrollo)
```

---

## Problemas conocidos

| Problema | Causa | Solución |
|----------|-------|----------|
| Mapa no carga | mapbox-gl v3 incompatible | Mantener fijado en v2.15.0 |
| Error 401 Cloudinary | Parámetros firmados no coinciden | Usar endpoint específico: `/sign` para venues, `/sign-avatar` para avatares |
| Reservas no se confirman | Webhook Stripe no configurado | `stripe listen` en local o endpoint registrado en producción |
| Emails no llegan | Dominio Resend sin verificar | Verificar DNS o usar `onboarding@resend.dev` en desarrollo |
| Prisma Decimal | Se devuelven como objetos | Usar `Number()` o `z.coerce.number()` al consumirlos |
| `isAvailable` en seed | Campo no existe en AvailabilityRule | Eliminado — la disponibilidad la define la existencia del registro |

---

## Roadmap

### Pendiente para producción
- [ ] Webhook Stripe configurado en producción
- [ ] Dominio Resend verificado → emails funcionando
- [ ] Recuperación de contraseña (depende de Resend)
- [ ] Google OAuth con URL de producción

### Próximas funcionalidades
- [ ] Calendario visual propietario (`/owner/calendar`)
- [ ] Analytics propietario (`/owner/analytics`)
- [ ] Facturación propietario (`/owner/billing`)
- [ ] Exportación CSV de reservas
- [ ] Recordatorios automáticos (Vercel Cron)
- [ ] Sitemap dinámico y páginas SEO por ciudad
- [ ] Rate limiting (Upstash)

### Futuro
- [ ] Payouts automáticos (Stripe Connect)
- [ ] Chat en tiempo real (Pusher/Ably)
- [ ] App móvil (React Native)
- [ ] Multiidioma (next-intl)
- [ ] IA para sugerencia de precios

---

## Licencia

Propietario. Todos los derechos reservados © Fiestalo Technologies S.L.
