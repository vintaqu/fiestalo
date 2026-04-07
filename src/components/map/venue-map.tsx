"use client";

import { useRef, useEffect, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { formatPrice } from "@/utils/format";

// mapbox-gl v2: set token at module level before any Map instantiation

export interface MapVenue {
  id: string;
  title: string;
  slug: string;
  latitude: number;
  longitude: number;
  pricePerHour: number | string;
  averageRating?: number | string | null;
  images: Array<{ url: string }>;
}

interface VenueMapProps {
  venues: MapVenue[];
  hoveredId: string | null;
  onVenueHover: (id: string | null) => void;
}

const SOURCE_ID  = "venues";
const CLUSTER_ID = "venues-clusters";
const COUNT_ID   = "venues-cluster-count";
const POINT_ID   = "venues-unclustered";

function injectMarkerStyles() {
  if (document.getElementById("spacehub-map-styles")) return;
  const style = document.createElement("style");
  style.id = "spacehub-map-styles";
  style.textContent = `
    .venue-pill {
      background: white;
      color: #1a1a2e;
      border: 1.5px solid #e5e7eb;
      border-radius: 20px;
      padding: 5px 10px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
    }
    .venue-pill:hover,
    .venue-pill.active {
      background: #4f46e5;
      color: white;
      border-color: #4f46e5;
      transform: scale(1.08);
      box-shadow: 0 4px 12px rgba(79,70,229,0.35);
      z-index: 10;
    }
    .mapboxgl-popup-content {
      padding: 0 !important;
      border-radius: 12px !important;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important;
    }
    .mapboxgl-popup-tip { display: none; }
  `;
  document.head.appendChild(style);
}

export function VenueMap({ venues, hoveredId, onVenueHover }: VenueMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<mapboxgl.Map | null>(null);
  const markersRef   = useRef<Map<string, { el: HTMLElement; marker: mapboxgl.Marker }>>(new Map());
  const popupRef     = useRef<mapboxgl.Popup | null>(null);
  const venuesRef    = useRef<MapVenue[]>(venues);
  // Track whether sources/layers are ready
  const mapReadyRef  = useRef(false);

  venuesRef.current = venues;

  function buildGeoJSON(vs: MapVenue[]): GeoJSON.FeatureCollection {
    return {
      type: "FeatureCollection",
      features: vs
        .filter((v) => v.latitude && v.longitude)
        .map((v) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [v.longitude, v.latitude] },
          properties: {
            id:           v.id,
            title:        v.title,
            slug:         v.slug,
            pricePerHour: Number(v.pricePerHour),
            rating:       v.averageRating ? Number(v.averageRating) : null,
            image:        v.images[0]?.url ?? "",
          },
        })),
    };
  }

  const showPopup = useCallback(
    (venue: MapVenue, lngLat: mapboxgl.LngLatLike) => {
      popupRef.current?.remove();
      const el = document.createElement("div");
      el.innerHTML = `
        <a href="/venues/${venue.slug}"
           style="display:block;text-decoration:none;color:inherit;min-width:180px;">
          ${
            venue.images[0]
              ? `<img src="${venue.images[0].url}" alt=""
                      style="width:100%;height:90px;object-fit:cover;display:block;" />`
              : `<div style="width:100%;height:90px;background:#f3f4f6;display:flex;
                             align-items:center;justify-content:center;font-size:28px;">🏢</div>`
          }
          <div style="padding:10px 12px;">
            <p style="font-size:12px;font-weight:600;margin:0 0 2px;color:#111;
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;">
              ${venue.title}
            </p>
            <p style="font-size:12px;color:#6b7280;margin:0;">
              ${formatPrice(Number(venue.pricePerHour))}/hora
              ${venue.averageRating ? `· ⭐ ${Number(venue.averageRating).toFixed(1)}` : ""}
            </p>
          </div>
        </a>`;
      popupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: true,
        offset: 12,
        maxWidth: "200px",
      })
        .setLngLat(lngLat)
        .setDOMContent(el)
        .addTo(mapRef.current!);
    },
    []
  );

  // ── Render DOM price-pill markers ─────────────────────────────

  const renderMarkers = useCallback(
    (map: mapboxgl.Map, vs: MapVenue[]) => {
      const newIds = new Set(vs.map((v) => v.id));
      markersRef.current.forEach(({ marker }, id) => {
        if (!newIds.has(id)) {
          marker.remove();
          markersRef.current.delete(id);
        }
      });

      vs.forEach((venue) => {
        if (!venue.latitude || !venue.longitude) return;

        if (markersRef.current.has(venue.id)) {
          markersRef.current.get(venue.id)!.marker
            .setLngLat([venue.longitude, venue.latitude]);
          return;
        }

        const el = document.createElement("div");
        el.className = "venue-pill";
        el.textContent = formatPrice(Number(venue.pricePerHour));

        el.addEventListener("mouseenter", () => {
          onVenueHover(venue.id);
          showPopup(venue, [venue.longitude, venue.latitude]);
        });
        el.addEventListener("mouseleave", () => onVenueHover(null));
        el.addEventListener("click", () => {
          window.location.href = `/venues/${venue.slug}`;
        });

        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([venue.longitude, venue.latitude])
          .addTo(map);

        markersRef.current.set(venue.id, { el, marker });
      });
    },
    [onVenueHover, showPopup]
  );

  // ── Fit map to venues ─────────────────────────────────────────

  const fitBounds = useCallback((map: mapboxgl.Map, vs: MapVenue[]) => {
    if (vs.length === 0) return;
    const bounds = new mapboxgl.LngLatBounds();
    vs.forEach((v) => {
      if (v.latitude && v.longitude) bounds.extend([v.longitude, v.latitude]);
    });
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 500 });
    }
  }, []);

  // ── Init map ──────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    injectMarkerStyles();

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
    if (!token) {
      console.warn("[VenueMap] NEXT_PUBLIC_MAPBOX_TOKEN is not set");
      return;
    }
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style:     "mapbox://styles/mapbox/streets-v12",
      center:    [-3.7038, 40.4168],
      zoom:      5,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions:   { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      "top-right"
    );

    map.on("load", () => {
      // Add GeoJSON source + layers
      map.addSource(SOURCE_ID, {
        type:           "geojson",
        data:           buildGeoJSON(venuesRef.current),
        cluster:        true,
        clusterMaxZoom: 13,
        clusterRadius:  50,
      });

      map.addLayer({
        id:     CLUSTER_ID,
        type:   "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint:  {
          "circle-color": [
            "step", ["get", "point_count"],
            "#818cf8", 5, "#4f46e5", 15, "#3730a3",
          ],
          "circle-radius": [
            "step", ["get", "point_count"],
            20, 5, 26, 15, 34,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "white",
        },
      });

      map.addLayer({
        id:     COUNT_ID,
        type:   "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font":  ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size":  13,
        },
        paint: { "text-color": "#ffffff" },
      });

      map.addLayer({
        id:     POINT_ID,
        type:   "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint:  { "circle-radius": 0, "circle-opacity": 0 },
      });

      map.on("click", CLUSTER_ID, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_ID] });
        if (!features.length) return;
        const clusterId = features[0].properties!.cluster_id;
        (map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource)
          .getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            const geo = features[0].geometry as GeoJSON.Point;
            map.easeTo({ center: geo.coordinates as [number, number], zoom: zoom! });
          });
      });

      map.on("mouseenter", CLUSTER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", CLUSTER_ID, () => { map.getCanvas().style.cursor = ""; });

      // Map is ready — render whatever venues we have NOW
      mapReadyRef.current = true;
      renderMarkers(map, venuesRef.current);
      fitBounds(map, venuesRef.current);
    });

    mapRef.current = map;

    return () => {
      mapReadyRef.current = false;
      popupRef.current?.remove();
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update when venues prop changes ──────────────────────────
  // This runs when React Query returns data AFTER the map loaded.
  // We guard with mapReadyRef so we don't touch layers before they exist.

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData(buildGeoJSON(venues));

    renderMarkers(map, venues);
    fitBounds(map, venues);
  }, [venues, renderMarkers, fitBounds]);

  // ── Highlight hovered marker ──────────────────────────────────

  useEffect(() => {
    markersRef.current.forEach(({ el }, id) => {
      el.classList.toggle("active", id === hoveredId);
      el.style.zIndex = id === hoveredId ? "20" : "1";
    });
  }, [hoveredId]);

  return <div ref={containerRef} className="w-full h-full" />;
}
