import { PrismaClient, Role, VenueStatus, BookingStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🎉 Seeding Fiestalo database...");

  // ── 1. Categories ──────────────────────────────────────────────────────────
  const categories = await Promise.all([
    db.category.upsert({
      where: { slug: "sala-fiestas-infantiles" },
      update: {},
      create: { name: "Sala de fiestas infantiles", slug: "sala-fiestas-infantiles", icon: "🎂", sortOrder: 1, description: "Salas especializadas para fiestas y cumpleaños de niños" },
    }),
    db.category.upsert({
      where: { slug: "salon-eventos-familiares" },
      update: {},
      create: { name: "Salón para eventos familiares", slug: "salon-eventos-familiares", icon: "👨‍👩‍👧‍👦", sortOrder: 2, description: "Espacios amplios para celebraciones familiares" },
    }),
    db.category.upsert({
      where: { slug: "espacio-tematico" },
      update: {},
      create: { name: "Espacio temático", slug: "espacio-tematico", icon: "🏰", sortOrder: 3, description: "Salas decoradas con temáticas especiales para fiestas" },
    }),
    db.category.upsert({
      where: { slug: "jardin-exterior" },
      update: {},
      create: { name: "Jardín / Exterior", slug: "jardin-exterior", icon: "🌳", sortOrder: 4, description: "Espacios al aire libre para fiestas y celebraciones" },
    }),
    db.category.upsert({
      where: { slug: "sala-juegos" },
      update: {},
      create: { name: "Sala de juegos y ocio", slug: "sala-juegos", icon: "🎮", sortOrder: 5, description: "Espacios con zona de juegos y entretenimiento" },
    }),
    db.category.upsert({
      where: { slug: "salon-celebraciones" },
      update: {},
      create: { name: "Salón de celebraciones", slug: "salon-celebraciones", icon: "🎊", sortOrder: 6, description: "Salones versátiles para todo tipo de celebraciones" },
    }),
    db.category.upsert({
      where: { slug: "espacio-comunal" },
      update: {},
      create: { name: "Espacio comunal", slug: "espacio-comunal", icon: "🏘️", sortOrder: 7, description: "Locales comunitarios para eventos vecinales y familiares" },
    }),
    db.category.upsert({
      where: { slug: "piscina-fiesta" },
      update: {},
      create: { name: "Piscina / Fiesta acuática", slug: "piscina-fiesta", icon: "🏊", sortOrder: 8, description: "Espacios con piscina para fiestas de verano" },
    }),
  ]);

  console.log(`✅ ${categories.length} categorías creadas`);

  // ── 2. Amenities ──────────────────────────────────────────────────────────
  const amenityData = [
    // Entretenimiento
    { name: "Hinchables / Castillo inflable", slug: "hinchable", icon: "🏰", category: "entertainment" },
    { name: "Máquina de palomitas", slug: "palomitas", icon: "🍿", category: "entertainment" },
    { name: "Máquina de algodón de azúcar", slug: "algodon", icon: "🍭", category: "entertainment" },
    { name: "Pista de baile", slug: "pista-baile", icon: "🕺", category: "entertainment" },
    { name: "Zona de juegos infantiles", slug: "zona-juegos", icon: "🎠", category: "entertainment" },
    { name: "Mesa de billar / futbolín", slug: "billar", icon: "🎱", category: "entertainment" },
    { name: "Sistema de sonido", slug: "sound-system", icon: "🔊", category: "entertainment" },
    { name: "Pantalla y proyector", slug: "pantalla", icon: "📽️", category: "entertainment" },
    { name: "Karaoke", slug: "karaoke", icon: "🎤", category: "entertainment" },
    // Catering y cocina
    { name: "Cocina equipada", slug: "kitchen", icon: "🍳", category: "catering" },
    { name: "Zona para tarta y merienda", slug: "zona-tarta", icon: "🎂", category: "catering" },
    { name: "Nevera y zona de bebidas", slug: "nevera", icon: "🥤", category: "catering" },
    { name: "Catering permitido (externo)", slug: "catering-externo", icon: "🍽️", category: "catering" },
    { name: "Menaje incluido", slug: "menaje", icon: "🥄", category: "catering" },
    // Instalaciones
    { name: "Aire acondicionado", slug: "ac", icon: "❄️", category: "facilities" },
    { name: "Calefacción", slug: "heating", icon: "🔥", category: "facilities" },
    { name: "Baños adaptados", slug: "banos-adaptados", icon: "🚻", category: "facilities" },
    { name: "Cambiador de bebés", slug: "cambiador", icon: "👶", category: "facilities" },
    { name: "Zona de adultos separada", slug: "zona-adultos", icon: "🛋️", category: "facilities" },
    { name: "Decoración incluida", slug: "decoracion", icon: "🎈", category: "facilities" },
    // Acceso
    { name: "Parking gratuito", slug: "parking", icon: "🚗", category: "access" },
    { name: "Acceso para sillas de ruedas", slug: "wheelchair", icon: "♿", category: "access" },
    { name: "Jardín / Zona exterior", slug: "garden", icon: "🌿", category: "access" },
    { name: "Piscina", slug: "pool", icon: "🏊", category: "access" },
    // Servicios
    { name: "Animadores disponibles", slug: "animadores", icon: "🤹", category: "services" },
    { name: "Servicio de limpieza incluido", slug: "limpieza", icon: "🧹", category: "services" },
    { name: "WiFi", slug: "wifi", icon: "📶", category: "services" },
    { name: "Música permitida", slug: "music", icon: "🎵", category: "services" },
    { name: "Seguridad / Vigilante", slug: "seguridad", icon: "🔒", category: "services" },
  ];

  const amenities = await Promise.all(
    amenityData.map((a) =>
      db.amenity.upsert({
        where: { slug: a.slug },
        update: {},
        create: a,
      })
    )
  );

  console.log(`✅ ${amenities.length} amenities creadas`);

  // ── 3. Cities ─────────────────────────────────────────────────────────────
  const cities = await Promise.all([
    db.city.upsert({ where: { slug: "madrid" },     update: {}, create: { name: "Madrid",    slug: "madrid",     country: "ES", latitude: 40.4168, longitude: -3.7038 } }),
    db.city.upsert({ where: { slug: "barcelona" },  update: {}, create: { name: "Barcelona", slug: "barcelona",  country: "ES", latitude: 41.3851, longitude:  2.1734 } }),
    db.city.upsert({ where: { slug: "valencia" },   update: {}, create: { name: "Valencia",  slug: "valencia",   country: "ES", latitude: 39.4699, longitude: -0.3763 } }),
    db.city.upsert({ where: { slug: "sevilla" },    update: {}, create: { name: "Sevilla",   slug: "sevilla",    country: "ES", latitude: 37.3891, longitude: -5.9845 } }),
    db.city.upsert({ where: { slug: "zaragoza" },   update: {}, create: { name: "Zaragoza",  slug: "zaragoza",   country: "ES", latitude: 41.6561, longitude: -0.8773 } }),
    db.city.upsert({ where: { slug: "malaga" },     update: {}, create: { name: "Málaga",    slug: "malaga",     country: "ES", latitude: 36.7213, longitude: -4.4213 } }),
    db.city.upsert({ where: { slug: "murcia" },     update: {}, create: { name: "Murcia",    slug: "murcia",     country: "ES", latitude: 37.9838, longitude: -1.1299 } }),
    db.city.upsert({ where: { slug: "bilbao" },     update: {}, create: { name: "Bilbao",    slug: "bilbao",     country: "ES", latitude: 43.263,  longitude: -2.935  } }),
    db.city.upsert({ where: { slug: "alicante" },   update: {}, create: { name: "Alicante",  slug: "alicante",   country: "ES", latitude: 38.3452, longitude: -0.4810 } }),
    db.city.upsert({ where: { slug: "reus" },       update: {}, create: { name: "Reus",      slug: "reus",       country: "ES", latitude: 41.1560, longitude:  1.1065 } }),
  ]);

  console.log(`✅ ${cities.length} ciudades creadas`);

  // ── 4. Users ──────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const adminUser = await db.user.upsert({
    where: { email: "admin@fiestalo.es" },
    update: {},
    create: {
      email: "admin@fiestalo.es",
      name: "Admin Fiestalo",
      passwordHash,
      role: Role.ADMIN,
      emailVerified: new Date(),
      profile: { create: { isVerified: true } },
    },
  });

  const ownerUsers = await Promise.all([
    db.user.upsert({
      where: { email: "propietario1@demo.com" },
      update: {},
      create: {
        email: "propietario1@demo.com",
        name: "Carlos Martínez",
        passwordHash,
        role: Role.OWNER,
        emailVerified: new Date(),
        profile: { create: { city: "Barcelona", bio: "Propietario de salas de fiestas en Barcelona. Especializado en celebraciones infantiles.", isVerified: true } },
      },
    }),
    db.user.upsert({
      where: { email: "propietario2@demo.com" },
      update: {},
      create: {
        email: "propietario2@demo.com",
        name: "Laura Sánchez",
        passwordHash,
        role: Role.OWNER,
        emailVerified: new Date(),
        profile: { create: { city: "Reus", bio: "Gestiono espacios de celebración en el Camp de Tarragona.", isVerified: true } },
      },
    }),
  ]);

  const tenantUser = await db.user.upsert({
    where: { email: "cliente@demo.com" },
    update: {},
    create: {
      email: "cliente@demo.com",
      name: "Ana García",
      passwordHash,
      role: Role.TENANT,
      emailVerified: new Date(),
      profile: { create: { city: "Barcelona" } },
    },
  });

  console.log("✅ Usuarios demo creados");
  console.log("   admin@fiestalo.es / propietario1@demo.com / propietario2@demo.com / cliente@demo.com");
  console.log("   Password: Password123!");

  // ── 5. Venues ─────────────────────────────────────────────────────────────
  const cat1 = categories[0]; // Sala de fiestas infantiles
  const cat2 = categories[1]; // Salón eventos familiares
  const cat3 = categories[2]; // Espacio temático

  const venue1 = await db.venue.upsert({
    where: { slug: "sala-fiestas-magica-barcelona" },
    update: {},
    create: {
      ownerId:          ownerUsers[0].id,
      categoryId:       cat1.id,
      title:            "Sala Mágica de Fiestas – Barcelona",
      slug:             "sala-fiestas-magica-barcelona",
      shortDescription: "Sala de fiestas infantiles con castillo hinchable, decoración incluida y cocina equipada.",
      description:      "La Sala Mágica es el espacio ideal para celebrar el cumpleaños de tu hijo de forma especial. Contamos con un castillo hinchable de 4x4m, zona de merienda con menaje completo, baño adaptado y cambiador. La sala está disponible en paquetes de 3, 4 o 6 horas con decoración incluida según el paquete elegido. Capacidad para hasta 60 personas entre niños y adultos.\n\nIncluye limpieza post-evento y coordinador de sala durante toda la celebración.",
      address:          "Carrer de la Diputació, 120",
      city:             "Barcelona",
      postalCode:       "08015",
      country:          "ES",
      latitude:         41.3851,
      longitude:        2.1734,
      pricePerHour:     55,
      minHours:         3,
      maxHours:         6,
      bufferMinutes:    60,
      capacity:         60,
      isIndoor:         true,
      hasParking:       true,
      isAccessible:     true,
      allowsPets:       false,
      allowsMusic:      true,
      allowsAlcohol:    false,
      allowsCatering:   true,
      houseRules:       "No se permite el consumo de alcohol.\nLos animales no están permitidos en la sala.\nEl cliente es responsable de cualquier daño causado durante la celebración.\nDejar la sala recogida al finalizar (menaje limpio).",
      cancellationPolicy: "FLEXIBLE",
      bookingType:      "INSTANT",
      status:           VenueStatus.ACTIVE,
      isVerified:       true,
      isFeatured:       true,
      publishedAt:      new Date(),
      amenities: {
        create: [
          { amenityId: amenities.find(a => a.slug === "hinchable")!.id },
          { amenityId: amenities.find(a => a.slug === "kitchen")!.id },
          { amenityId: amenities.find(a => a.slug === "zona-tarta")!.id },
          { amenityId: amenities.find(a => a.slug === "menaje")!.id },
          { amenityId: amenities.find(a => a.slug === "ac")!.id },
          { amenityId: amenities.find(a => a.slug === "banos-adaptados")!.id },
          { amenityId: amenities.find(a => a.slug === "cambiador")!.id },
          { amenityId: amenities.find(a => a.slug === "parking")!.id },
          { amenityId: amenities.find(a => a.slug === "wheelchair")!.id },
          { amenityId: amenities.find(a => a.slug === "decoracion")!.id },
          { amenityId: amenities.find(a => a.slug === "limpieza")!.id },
        ],
      },
      availabilityRules: {
        create: [
          { dayOfWeek: 5, openTime: "16:00", closeTime: "22:00" },
          { dayOfWeek: 6, openTime: "10:00", closeTime: "22:00" },
          { dayOfWeek: 0, openTime: "10:00", closeTime: "21:00" },
        ],
      },
    },
  });

  const venue2 = await db.venue.upsert({
    where: { slug: "sala-fiestas-reus" },
    update: {},
    create: {
      ownerId:          ownerUsers[1].id,
      categoryId:       cat2.id,
      title:            "Sala Fiestas Reus",
      slug:             "sala-fiestas-reus",
      shortDescription: "Amplio salón de celebraciones en Reus. Perfecto para cumpleaños y comuniones con hasta 100 personas.",
      description:      "Salón de celebraciones en el centro de Reus con cocina completa, zona de baile, sistema de sonido profesional y parking propio. Disponible en paquetes de 4 o 6 horas. Catering externo permitido. Zona diferenciada para niños y adultos.",
      address:          "Carrer de Jesús, 45",
      city:             "Reus",
      postalCode:       "43201",
      country:          "ES",
      latitude:         41.1560,
      longitude:        1.1065,
      pricePerHour:     40,
      minHours:         4,
      maxHours:         8,
      bufferMinutes:    90,
      capacity:         100,
      isIndoor:         true,
      hasParking:       true,
      isAccessible:     true,
      allowsPets:       false,
      allowsMusic:      true,
      allowsAlcohol:    true,
      allowsCatering:   true,
      houseRules:       "La música debe bajar de volumen a partir de las 22:00h.\nCapacidad máxima 100 personas.\nCatering externo permitido con cocina disponible.",
      cancellationPolicy: "MODERATE",
      bookingType:      "REQUEST",
      status:           VenueStatus.ACTIVE,
      isVerified:       true,
      isFeatured:       true,
      publishedAt:      new Date(),
      amenities: {
        create: [
          { amenityId: amenities.find(a => a.slug === "kitchen")!.id },
          { amenityId: amenities.find(a => a.slug === "pista-baile")!.id },
          { amenityId: amenities.find(a => a.slug === "sound-system")!.id },
          { amenityId: amenities.find(a => a.slug === "zona-adultos")!.id },
          { amenityId: amenities.find(a => a.slug === "catering-externo")!.id },
          { amenityId: amenities.find(a => a.slug === "nevera")!.id },
          { amenityId: amenities.find(a => a.slug === "parking")!.id },
          { amenityId: amenities.find(a => a.slug === "ac")!.id },
          { amenityId: amenities.find(a => a.slug === "heating")!.id },
          { amenityId: amenities.find(a => a.slug === "wifi")!.id },
        ],
      },
      availabilityRules: {
        create: [
          { dayOfWeek: 5, openTime: "17:00", closeTime: "23:00" },
          { dayOfWeek: 6, openTime: "10:00", closeTime: "23:00" },
          { dayOfWeek: 0, openTime: "10:00", closeTime: "21:00" },
        ],
      },
    },
  });

  const venue3 = await db.venue.upsert({
    where: { slug: "sala-rodona-reus" },
    update: {},
    create: {
      ownerId:          ownerUsers[1].id,
      categoryId:       cat3.id,
      title:            "Sala Rodona",
      slug:             "sala-rodona-reus",
      shortDescription: "Espacio temático único en Reus con decoración cambiable. Ideal para fiestas de princesas, superhéroes y mucho más.",
      description:      "La Sala Rodona es un espacio temático único en su estilo. Cada reserva incluye la decoración adaptada a la temática elegida (princesas, superhéroes, dinosaurios, unicornios...). Zona de juegos, máquina de palomitas, photocall y zona de merienda. Perfecta para grupos de hasta 40 personas.",
      address:          "Avinguda de Salou, 78",
      city:             "Reus",
      postalCode:       "43206",
      country:          "ES",
      latitude:         41.1502,
      longitude:        1.1088,
      pricePerHour:     35,
      minHours:         3,
      maxHours:         5,
      bufferMinutes:    60,
      capacity:         40,
      isIndoor:         true,
      hasParking:       false,
      isAccessible:     true,
      allowsPets:       false,
      allowsMusic:      true,
      allowsAlcohol:    false,
      allowsCatering:   false,
      houseRules:       "No se permite alcohol ni alimentos externos (catering propio disponible).\nDeclaración de alérgenos disponible para los productos del servicio.",
      cancellationPolicy: "FLEXIBLE",
      bookingType:      "INSTANT",
      status:           VenueStatus.ACTIVE,
      isVerified:       true,
      isFeatured:       false,
      publishedAt:      new Date(),
      amenities: {
        create: [
          { amenityId: amenities.find(a => a.slug === "decoracion")!.id },
          { amenityId: amenities.find(a => a.slug === "zona-juegos")!.id },
          { amenityId: amenities.find(a => a.slug === "palomitas")!.id },
          { amenityId: amenities.find(a => a.slug === "zona-tarta")!.id },
          { amenityId: amenities.find(a => a.slug === "sound-system")!.id },
          { amenityId: amenities.find(a => a.slug === "ac")!.id },
          { amenityId: amenities.find(a => a.slug === "cambiador")!.id },
          { amenityId: amenities.find(a => a.slug === "limpieza")!.id },
        ],
      },
      availabilityRules: {
        create: [
          { dayOfWeek: 6, openTime: "10:00", closeTime: "21:00" },
          { dayOfWeek: 0, openTime: "10:00", closeTime: "20:00" },
        ],
      },
    },
  });

  console.log("✅ 3 espacios de demostración creados");

  console.log("\n🎉 Fiestalo seed completado con éxito!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Credenciales de acceso:");
  console.log("  Admin:         admin@fiestalo.es / Password123!");
  console.log("  Propietario 1: propietario1@demo.com / Password123!");
  console.log("  Propietario 2: propietario2@demo.com / Password123!");
  console.log("  Cliente:       cliente@demo.com / Password123!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
