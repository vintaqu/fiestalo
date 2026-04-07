import { Star, Clock, Shield, Zap, MapPin, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface VenueInfoProps {
  venue: {
    title: string;
    city: string;
    address: string;
    description: string;
    capacity: number;
    minHours: number;
    maxHours?: number | null;
    pricePerHour: number | string;
    averageRating?: number | string | null;
    totalReviews: number;
    isVerified: boolean;
    isFeatured: boolean;
    bookingType: "INSTANT" | "REQUEST";
    isIndoor: boolean;
    isOutdoor: boolean;
    hasParking: boolean;
    isAccessible: boolean;
    allowsPets: boolean;
    allowsMusic: boolean;
    category?: { name: string; icon?: string | null } | null;
    owner: {
      name?: string | null;
      image?: string | null;
      profile?: { isVerified?: boolean } | null;
    };
    cancellationPolicy?: { type: string; refundHours: number } | null;
    houseRules?: string | null;
  };
}

export function VenueInfo({ venue }: VenueInfoProps) {
  const policy = venue.cancellationPolicy as
    | { type: string; refundHours: number }
    | null
    | undefined;

  const specs = [
    { icon: "👥", label: `Hasta ${venue.capacity} personas` },
    { icon: "⏱️", label: `Mínimo ${venue.minHours}h` },
    ...(venue.maxHours ? [{ icon: "⏰", label: `Máximo ${venue.maxHours}h` }] : []),
    ...(venue.isIndoor ? [{ icon: "🏠", label: "Interior" }] : []),
    ...(venue.isOutdoor ? [{ icon: "🌿", label: "Exterior" }] : []),
    ...(venue.hasParking ? [{ icon: "🚗", label: "Parking incluido" }] : []),
    ...(venue.isAccessible ? [{ icon: "♿", label: "Accesible" }] : []),
    ...(venue.allowsPets ? [{ icon: "🐾", label: "Mascotas OK" }] : []),
    ...(venue.allowsMusic ? [{ icon: "🎵", label: "Música permitida" }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Title & badges */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {venue.category && (
            <Badge variant="secondary">
              {venue.category.icon} {venue.category.name}
            </Badge>
          )}
          {venue.isFeatured && (
            <Badge className="bg-amber-500 text-white border-0">⭐ Destacado</Badge>
          )}
          {venue.isVerified && (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200">
              <ShieldCheck className="w-3 h-3 mr-1" />
              Verificado
            </Badge>
          )}
          {venue.bookingType === "INSTANT" ? (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <Zap className="w-3 h-3 mr-1" />
              Reserva instantánea
            </Badge>
          ) : (
            <Badge variant="outline">
              <Clock className="w-3 h-3 mr-1" />
              Requiere aprobación
            </Badge>
          )}
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2">{venue.title}</h1>

        <div className="flex items-center gap-4 text-muted-foreground text-sm">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {venue.city}
          </div>
          {venue.totalReviews > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">
                {Number(venue.averageRating).toFixed(1)}
              </span>
              <span>({venue.totalReviews} reseñas)</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Owner */}
      <div className="flex items-center gap-4">
        <Avatar className="w-12 h-12">
          <AvatarImage src={venue.owner.image ?? ""} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {venue.owner.name?.charAt(0) ?? "P"}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{venue.owner.name ?? "Propietario"}</p>
            {venue.owner.profile?.isVerified && (
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">Propietario del espacio</p>
        </div>
      </div>

      <Separator />

      {/* Specs grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Características</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {specs.map((spec) => (
            <div
              key={spec.label}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/50 border border-border"
            >
              <span className="text-xl">{spec.icon}</span>
              <span className="text-sm font-medium">{spec.label}</span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Description */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Sobre este espacio</h2>
        <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-[15px]">
          {venue.description}
        </div>
      </div>

      {/* House rules */}
      {venue.houseRules && (
        <>
          <Separator />
          <div>
            <h2 className="text-xl font-semibold mb-3">Normas del espacio</h2>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-900 leading-relaxed">
              {venue.houseRules}
            </div>
          </div>
        </>
      )}

      {/* Cancellation policy */}
      {policy && (
        <>
          <Separator />
          <div>
            <h2 className="text-xl font-semibold mb-3">
              <Shield className="w-5 h-5 inline mr-2 text-muted-foreground" />
              Política de cancelación
            </h2>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">
                {policy.type === "flexible"
                  ? "Política flexible"
                  : policy.type === "moderate"
                    ? "Política moderada"
                    : "Política estricta"}
              </p>
              <p>
                Cancelación gratuita hasta {policy.refundHours} horas antes del inicio.
                Pasado ese plazo, no se realizará ningún reembolso.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
