import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, Polygon, Polyline, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  Search,
  Satellite,
  Map as MapIcon,
  Layers3,
  RefreshCw,
  Crosshair,
  X,
  ChevronRight,
  MapPinned,
  LandPlot,
  UserRound,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import client from "../api/client";
import "leaflet/dist/leaflet.css";

type Parcel = {
  id?: number | string;
  ulpin?: string;
  parcel_id?: string | number;
  owner?: string;
  owner_name?: string;
  guardian_name?: string;
  state?: string;
  district?: string;
  tehsil?: string;
  village?: string;
  locality?: string;
  survey_number?: string;
  khasra_number?: string;
  area?: number;
  area_unit?: string;
  land_use?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lon?: number;
  status?: string;
  ror_status?: string;
  registration_status?: string;
  encumbrance_status?: string;
  tax_status?: string;
};

type Feature = {
  type: "Feature";
  geometry: any;
  properties: Parcel;
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: Feature[];
};

const COLORS: Record<string, string> = {
  RESIDENTIAL: "#2563eb",
  AGRICULTURAL: "#16a34a",
  COMMERCIAL: "#f59e0b",
  INDUSTRIAL: "#dc2626",
  OTHER: "#7c3aed",
};

function payload(v: any) {
  return v?.data?.data ?? v?.data ?? v ?? {};
}

function useKey(value?: string) {
  const x = String(value || "").toUpperCase();

  if (x.includes("RESIDENT")) return "RESIDENTIAL";
  if (x.includes("AGRI")) return "AGRICULTURAL";
  if (x.includes("COMMERCIAL")) return "COMMERCIAL";
  if (x.includes("INDUSTR")) return "INDUSTRIAL";

  return "OTHER";
}

function useLabel(value?: string) {
  const k = useKey(value);

  if (k === "RESIDENTIAL") return "Residential";
  if (k === "AGRICULTURAL") return "Agricultural";
  if (k === "COMMERCIAL") return "Commercial";
  if (k === "INDUSTRIAL") return "Industrial";

  return value || "Other";
}

function useColor(value?: string) {
  return COLORS[useKey(value)] || COLORS.OTHER;
}

function latOf(p: Parcel) {
  return Number(p.latitude ?? p.lat ?? 0);
}

function lonOf(p: Parcel) {
  return Number(p.longitude ?? p.lon ?? 0);
}

function allCoords(coords: any, out: number[][] = []) {
  if (!Array.isArray(coords)) return out;

  if (
    coords.length >= 2 &&
    typeof coords[0] === "number" &&
    typeof coords[1] === "number"
  ) {
    out.push(coords);
    return out;
  }

  coords.forEach((x) => allCoords(x, out));
  return out;
}

function featureBounds(feature: Feature | null) {
  if (!feature?.geometry) return null;

  const pts = allCoords(feature.geometry.coordinates);
  if (!pts.length) return null;

  const lats = pts.map((p) => p[1]);
  const lons = pts.map((p) => p[0]);

  return L.latLngBounds(
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)]
  );
}

function collectionBounds(features: Feature[]) {
  const pts: number[][] = [];

  features.forEach((f) => {
    if (f.geometry) {
      allCoords(f.geometry.coordinates, pts);
    }

    const lat = latOf(f.properties);
    const lon = lonOf(f.properties);

    if (lat && lon) {
      pts.push([lon, lat]);
    }
  });

  if (!pts.length) return null;

  const lats = pts.map((p) => p[1]);
  const lons = pts.map((p) => p[0]);

  return L.latLngBounds(
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)]
  );
}

function markerIcon(color: string, selected: boolean) {
  const size = selected ? 38 : 30;

  return L.divIcon({
    className: "ls-gis-marker-wrap",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
    html: `
      <div
        class="ls-gis-parcel-marker ${selected ? "selected" : ""}"
        style="--marker-color:${color};width:${size}px;height:${size}px"
      >
        <div class="ls-gis-marker-dot"></div>
      </div>
    `,
  });
}

function ParcelAreaTiles({ features }: { features: any[] }) {
  const toSqM = (value: any, unit: any) => {
    const n = Number(value) || 0;
    const u = String(unit || "sq m").toLowerCase();

    if (u.includes("hect")) return n * 10000;
    if (u.includes("acre")) return n * 4046.8564224;
    if (u.includes("sq ft") || u.includes("square feet")) return n * 0.09290304;
    if (u.includes("sq yd") || u.includes("square yard")) return n * 0.83612736;

    return n;
  };

  return (
    <>
      {features.map((feature: any, index: number) => {
        const p = feature.properties || feature;

        const lat = Number(p.latitude ?? p.lat);
        const lon = Number(p.longitude ?? p.lng ?? p.lon);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

        const areaSqM = toSqM(
          p.area ?? p.area_value ?? p.parcel_area,
          p.area_unit ?? p.unit
        );

        if (areaSqM <= 0) return null;

        // Square dimensions based on actual registered area.
        const sideMeters = Math.sqrt(areaSqM);

        // Approximate metre -> latitude/longitude conversion.
        const dLat = (sideMeters / 2) / 111320;
        const cosLat = Math.max(0.15, Math.cos((lat * Math.PI) / 180));
        const dLon = (sideMeters / 2) / (111320 * cosLat);

        const positions: [number, number][] = [
          [lat - dLat, lon - dLon],
          [lat - dLat, lon + dLon],
          [lat + dLat, lon + dLon],
          [lat + dLat, lon - dLon],
        ];

        const type = String(
          p.property_type ??
          p.propertyType ??
          p.land_use ??
          p.landUse ??
          "Other"
        ).toLowerCase();

        let fillColor = "#7c3aed";

        if (type.includes("residential")) {
          fillColor = "#2563eb";
        } else if (type.includes("agri")) {
          fillColor = "#16a34a";
        } else if (type.includes("commercial")) {
          fillColor = "#f59e0b";
        } else if (type.includes("industrial")) {
          fillColor = "#dc2626";
        }

        return (
          <Polygon
            key={`area-${p.id ?? p.ulpin ?? index}`}
            positions={positions}
            pathOptions={{
              color: fillColor,
              weight: 3,
              opacity: 0.95,
              fillColor,
              fillOpacity: 0.38,
            }}
          >
            <Tooltip sticky>
              <strong>{p.ulpin ?? p.ULPIN ?? "Parcel"}</strong>
              <br />
              {p.property_type ?? p.propertyType ?? p.land_use ?? p.landUse ?? "Other"}
              <br />
              Area: {p.area ?? "—"} {p.area_unit ?? p.unit ?? ""}
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}

function MapController({
  selected,
  features,
  fitVersion,
}: {
  selected: Feature | null;
  features: Feature[];
  fitVersion: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selected) return;

    const bounds = featureBounds(selected);

    if (bounds) {
      map.flyToBounds(bounds, {
        padding: [80, 80],
        maxZoom: 18,
        duration: 1.25,
      });
      return;
    }

    const lat = latOf(selected.properties);
    const lon = lonOf(selected.properties);

    if (lat && lon) {
      map.flyTo([lat, lon], 17, {
        duration: 1.2,
      });
    }
  }, [selected, map]);

  useEffect(() => {
    if (selected || fitVersion === 0 || !features.length) return;

    const bounds = collectionBounds(features);

    if (bounds) {
      map.fitBounds(bounds, {
        padding: [70, 70],
        maxZoom: 16,
        animate: true,
        duration: 1,
      });
    }
  }, [features, fitVersion, selected, map]);

  return null;
}


type LocalOSMElement = {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
};

function osmPoint(element: LocalOSMElement) {
  if (
    typeof element.lat === "number" &&
    typeof element.lon === "number"
  ) {
    return [element.lat, element.lon] as [number, number];
  }

  if (element.geometry?.length) {
    const middle =
      element.geometry[
        Math.floor(element.geometry.length / 2)
      ];

    return [middle.lat, middle.lon] as [number, number];
  }

  return null;
}

function osmLine(element: LocalOSMElement) {
  if (!element.geometry?.length) return [];

  return element.geometry.map(
    (p) => [p.lat, p.lon] as [number, number]
  );
}

function osmCategory(tags?: Record<string, string>) {
  if (!tags) return "place";

  if (tags.shop) return "shop";
  if (tags.leisure === "park") return "park";
  if (tags.amenity === "school") return "school";
  if (tags.amenity === "hospital") return "hospital";
  if (tags.amenity === "fuel") return "fuel";
  if (tags.amenity) return "amenity";
  if (tags.place) return "place";

  return "place";
}

function osmLabel(tags?: Record<string, string>) {
  if (!tags) return "Place";

  if (tags.shop) return tags.shop;
  if (tags.amenity) return tags.amenity;
  if (tags.leisure) return tags.leisure;
  if (tags.place) return tags.place;

  return "Place";
}

function osmIcon(name: string, category: string) {
  return L.divIcon({
    className: "ls-osm-feature-wrap",
    iconSize: [1, 1],
    iconAnchor: [0, 0],
    html: `
      <div class="ls-osm-feature ${category}">
        <span class="ls-osm-feature-dot"></span>
        <strong>${String(name).replace(
          /[&<>"']/g,
          (x) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            } as Record<string, string>)[x]
        )}</strong>
      </div>
    `,
  });
}

function roadLabelIcon(name: string) {
  return L.divIcon({
    className: "ls-osm-road-label-wrap",
    iconSize: [1, 1],
    iconAnchor: [0, 0],
    html: `
      <div class="ls-osm-road-label">
        ${String(name).replace(
          /[&<>"']/g,
          (x) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            } as Record<string, string>)[x]
        )}
      </div>
    `,
  });
}

function LocalOSMContext({
  enabled,
}: {
  enabled: boolean;
}) {
  const map = useMap();

  const [elements, setElements] = useState<LocalOSMElement[]>([]);
  const [view, setView] = useState(() => ({
    lat: map.getCenter().lat,
    lon: map.getCenter().lng,
    zoom: map.getZoom(),
  }));

  useMapEvents({
    moveend() {
      const center = map.getCenter();

      setView({
        lat: center.lat,
        lon: center.lng,
        zoom: map.getZoom(),
      });
    },

    zoomend() {
      const center = map.getCenter();

      setView({
        lat: center.lat,
        lon: center.lng,
        zoom: map.getZoom(),
      });
    },
  });

  useEffect(() => {
    if (!enabled || view.zoom < 15) {
      setElements([]);
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        const radius =
          view.zoom >= 19
            ? 300
            : view.zoom >= 18
            ? 450
            : view.zoom >= 17
            ? 650
            : view.zoom >= 16
            ? 900
            : 1200;

        const query = `
          [out:json][timeout:20];
          (
            way["highway"]["name"](around:${radius},${view.lat},${view.lon});
            
            node["shop"]["name"](around:${radius},${view.lat},${view.lon});
            way["shop"]["name"](around:${radius},${view.lat},${view.lon});

            node["amenity"]["name"](around:${radius},${view.lat},${view.lon});
            way["amenity"]["name"](around:${radius},${view.lat},${view.lon});

            node["leisure"]["name"](around:${radius},${view.lat},${view.lon});
            way["leisure"]["name"](around:${radius},${view.lat},${view.lon});

            node["place"]["name"](around:${radius},${view.lat},${view.lon});
            way["place"]["name"](around:${radius},${view.lat},${view.lon});
          );
          out tags geom;
        `;

        const response = await fetch(
          "https://overpass-api.de/api/interpreter",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded;charset=UTF-8",
            },
            body: `data=${encodeURIComponent(query)}`,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Local GIS request failed: ${response.status}`
          );
        }

        const json = await response.json();

        if (!cancelled) {
          setElements(
            Array.isArray(json?.elements)
              ? json.elements
              : []
          );
        }
      } catch (error) {
        console.error(
          "Local OSM detail error:",
          error
        );

        if (!cancelled) {
          setElements([]);
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, view.lat, view.lon, view.zoom]);

  const roads = elements.filter(
    (x) =>
      x.tags?.highway &&
      x.tags?.name &&
      Array.isArray(x.geometry) &&
      x.geometry.length > 1
  );

  const roadNames = Array.from(
    new Map(
      roads.map((road) => [
        road.tags?.name,
        road,
      ])
    ).values()
  );

  const places = elements.filter(
    (x) =>
      x.tags?.name &&
      !x.tags?.highway &&
      !!osmPoint(x)
  );

  return (
    <>
      {roads.map((road) => {
        const positions = osmLine(road);

        if (positions.length < 2) return null;

        return (
          <Polyline
            key={`road-${road.id}`}
            positions={positions}
            pathOptions={{
              color:
                "#f7f3e8",
              weight:
                view.zoom >= 17
                  ? 3
                  : 2,
              opacity: 0.92,
              lineCap: "round",
            }}
          >
            <Tooltip sticky>
              {road.tags?.name}
            </Tooltip>
          </Polyline>
        );
      })}

      {view.zoom >= 16 &&
        roadNames.map((road) => {
          const point = osmPoint(road);

          if (!point || !road.tags?.name) {
            return null;
          }

          return (
            <Marker
              key={`road-label-${road.id}`}
              position={point}
              icon={roadLabelIcon(
                road.tags.name
              )}
              interactive={false}
            />
          );
        })}

      {view.zoom >= 17 &&
        places.slice(0, 120).map((place) => {
          const point = osmPoint(place);

          if (!point || !place.tags?.name) {
            return null;
          }

          const category =
            osmCategory(place.tags);

          return (
            <Marker
              key={`poi-${place.type}-${place.id}`}
              position={point}
              icon={osmIcon(
                place.tags.name,
                category
              )}
              interactive={false}
            >
              <Tooltip
                direction="top"
                permanent={view.zoom >= 18}
                opacity={1}
              >
                <strong>
                  {place.tags.name}
                </strong>
                <br />
                {osmLabel(place.tags)}
              </Tooltip>
            </Marker>
          );
        })}
    </>
  );
}
function PopupCard({
  parcel,
  navigate,
}: {
  parcel: Parcel;
  navigate: any;
}) {
  return (
    <div className="ls-gis-popup-card">
      <div className="ls-gis-popup-kicker">LAND PARCEL</div>

      <div className="ls-gis-popup-id">
        {parcel.ulpin || "Parcel"}
      </div>

      <div className="ls-gis-popup-owner">
        {parcel.owner || parcel.owner_name || "Owner not available"}
      </div>

      <div className="ls-gis-popup-grid">
        <div>
          <span>Land Use</span>
          <strong>{useLabel(parcel.land_use)}</strong>
        </div>

        <div>
          <span>Area</span>
          <strong>
            {parcel.area ?? "—"} {parcel.area_unit || ""}
          </strong>
        </div>

        <div>
          <span>Village</span>
          <strong>{parcel.village || "—"}</strong>
        </div>

        <div>
          <span>District</span>
          <strong>{parcel.district || "—"}</strong>
        </div>
      </div>

      <button
        className="ls-gis-popup-button"
        onClick={() => navigate(`/parcels/${parcel.id}`)}
      >
        View Full Parcel Details
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function CadastralIntelligencePanel({
  parcel,
  feature,
  features,
  onSelect,
}: {
  parcel: any;
  feature: any;
  features: any[];
  onSelect: (id: string) => void;
}) {
  const [splitRatio, setSplitRatio] = useState(50);

  const safeNumber = (value: any) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const centerOfFeature = (f: any) => {
    const p = f?.properties || {};

    try {
      const lat = Number(latOf(p));
      const lon = Number(lonOf(p));

      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return { lat, lon };
      }
    } catch {}

    const g = f?.geometry;

    if (g?.type === "Polygon" && Array.isArray(g.coordinates?.[0])) {
      const ring = g.coordinates[0];
      const pts = ring.filter(
        (x: any) =>
          Array.isArray(x) &&
          Number.isFinite(Number(x[0])) &&
          Number.isFinite(Number(x[1]))
      );

      if (pts.length) {
        const lon =
          pts.reduce((sum: number, x: any) => sum + Number(x[0]), 0) /
          pts.length;

        const lat =
          pts.reduce((sum: number, x: any) => sum + Number(x[1]), 0) /
          pts.length;

        return { lat, lon };
      }
    }

    return null;
  };

  const distanceKm = (
    a: { lat: number; lon: number } | null,
    b: { lat: number; lon: number } | null
  ) => {
    if (!a || !b) return Number.POSITIVE_INFINITY;

    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lon - a.lon) * Math.PI) / 180;

    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;

    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

    return 2 * R * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
  };

  const geometryAreaSqM = (geometry: any): number | null => {
    if (!geometry) return null;

    const ringArea = (ring: any[]) => {
      if (!Array.isArray(ring) || ring.length < 3) return 0;

      const valid = ring.filter(
        (x: any) =>
          Array.isArray(x) &&
          Number.isFinite(Number(x[0])) &&
          Number.isFinite(Number(x[1]))
      );

      if (valid.length < 3) return 0;

      const meanLat =
        (valid.reduce((sum, x) => sum + Number(x[1]), 0) / valid.length) *
        (Math.PI / 180);

      const meters = valid.map((x) => [
        Number(x[0]) * 111320 * Math.cos(meanLat),
        Number(x[1]) * 110540,
      ]);

      let area = 0;

      for (let i = 0; i < meters.length; i++) {
        const j = (i + 1) % meters.length;

        area +=
          meters[i][0] * meters[j][1] -
          meters[j][0] * meters[i][1];
      }

      return Math.abs(area) / 2;
    };

    if (geometry.type === "Polygon") {
      const rings = geometry.coordinates || [];
      if (!rings.length) return null;

      const outer = ringArea(rings[0]);
      const holes = rings
        .slice(1)
        .reduce((sum: number, ring: any[]) => sum + ringArea(ring), 0);

      return Math.max(0, outer - holes);
    }

    if (geometry.type === "MultiPolygon") {
      const polygons = geometry.coordinates || [];

      const total = polygons.reduce((sum: number, polygon: any[]) => {
        if (!polygon?.length) return sum;

        const outer = ringArea(polygon[0]);
        const holes = polygon
          .slice(1)
          .reduce((s: number, ring: any[]) => s + ringArea(ring), 0);

        return sum + Math.max(0, outer - holes);
      }, 0);

      return total || null;
    }

    return null;
  };

  const recordAreaSqM = (p: any): number | null => {
    const value = safeNumber(p?.area);
    if (value === null) return null;

    const unit = String(p?.area_unit || "").toLowerCase();

    if (
      unit.includes("hectare") ||
      unit === "ha" ||
      unit.includes("hec")
    ) {
      return value * 10000;
    }

    if (unit.includes("acre")) {
      return value * 4046.8564224;
    }

    if (
      unit.includes("square meter") ||
      unit.includes("sq m") ||
      unit === "sqm" ||
      unit === "m2" ||
      unit === "m²"
    ) {
      return value;
    }

    if (
      unit.includes("square foot") ||
      unit.includes("sq ft") ||
      unit === "sqft"
    ) {
      return value * 0.092903;
    }

    return null;
  };

  const boundaryMetrics = (() => {
    const checks = [
      Boolean(feature?.geometry),
      Boolean(parcel?.ulpin || parcel?.id),
      Boolean(parcel?.survey_number || parcel?.khasra_number),
      safeNumber(parcel?.area) !== null,
      Boolean(
        parcel?.village ||
          parcel?.tehsil ||
          parcel?.district ||
          parcel?.state
      ),
      Boolean(
        parcel?.ror_status ||
          parcel?.registration_status ||
          parcel?.encumbrance_status
      ),
    ];

    const score = Math.min(
      98,
      34 + checks.filter(Boolean).length * 11
    );

    const label =
      score >= 85 ? "HIGH" : score >= 65 ? "MEDIUM" : "LOW";

    return { score, label, checks };
  })();

  const conflicts = (() => {
    const list: string[] = [];

    const status = String(
      parcel?.status || ""
    ).trim().toLowerCase();

    const ror = String(
      parcel?.ror_status || ""
    ).trim().toLowerCase();

    const registration = String(
      parcel?.registration_status || ""
    ).trim().toLowerCase();

    const positive = ["verified", "approved", "active"];
    const unresolved = ["pending", "review", "under review"];

    if (
      positive.some((x) => status.includes(x)) &&
      unresolved.some((x) => ror.includes(x))
    ) {
      list.push(
        `Parcel status (${parcel?.status}) and RoR status (${parcel?.ror_status}) are not aligned.`
      );
    }

    if (
      positive.some((x) => status.includes(x)) &&
      unresolved.some((x) => registration.includes(x))
    ) {
      list.push(
        `Parcel status (${parcel?.status}) and registration status (${parcel?.registration_status}) are not aligned.`
      );
    }

    const gisArea = geometryAreaSqM(feature?.geometry);
    const dbArea = recordAreaSqM(parcel);

    if (
      gisArea !== null &&
      dbArea !== null &&
      dbArea > 0
    ) {
      const difference = Math.abs(gisArea - dbArea) / dbArea;

      if (difference > 0.05) {
        list.push(
          `Recorded area and geometry area differ by ${(difference * 100).toFixed(1)}%.`
        );
      }
    }

    const enc = String(
      parcel?.encumbrance_status || ""
    ).toLowerCase();

    if (
      enc.includes("active") ||
      enc.includes("encumbered") ||
      enc === "yes"
    ) {
      list.push(
        `Encumbrance flag present: ${parcel?.encumbrance_status}.`
      );
    }

    return list;
  })();

  const relationships = (() => {
    const origin = centerOfFeature(feature);

    return (Array.isArray(features) ? features : [])
      .filter((f) => f !== feature)
      .map((f) => {
        const center = centerOfFeature(f);

        return {
          feature: f,
          distance: distanceKm(origin, center),
        };
      })
      .filter((x) => Number.isFinite(x.distance))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4);
  })();

  const numericArea = safeNumber(parcel?.area);
  const unit = parcel?.area_unit || "";

  const leftArea =
    numericArea !== null
      ? (numericArea * splitRatio) / 100
      : null;

  const rightArea =
    numericArea !== null
      ? numericArea - (leftArea || 0)
      : null;

  return (
    <div
      style={{
        marginTop: 14,
        border: "1px solid #d9e4ec",
        borderRadius: 15,
        background: "linear-gradient(180deg,#ffffff,#f7fafc)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "13px 14px",
          borderBottom: "1px solid #e3ebf1",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: ".11em",
              color: "#52697a",
            }}
          >
            CADASTRAL INTELLIGENCE
          </div>
          <div
            style={{
              marginTop: 3,
              fontSize: 13,
              fontWeight: 900,
              color: "#163b59",
            }}
          >
            Parcel analysis tools
          </div>
        </div>

        <span
          style={{
            fontSize: 9,
            fontWeight: 900,
            padding: "5px 8px",
            borderRadius: 999,
            background: "#eef5fa",
            color: "#31556f",
          }}
        >
          DERIVED / DEMO
        </span>
      </div>

      <details open>
        <summary
          style={{
            cursor: "pointer",
            padding: "12px 14px",
            fontSize: 11,
            fontWeight: 900,
            color: "#214a67",
          }}
        >
          03 - Boundary Confidence
        </summary>

        <div style={{ padding: "0 14px 14px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <strong
              style={{
                fontSize: 24,
                color: "#153e63",
              }}
            >
              {boundaryMetrics.score}%
            </strong>

            <span
              style={{
                padding: "5px 8px",
                borderRadius: 999,
                background:
                  boundaryMetrics.label === "HIGH"
                    ? "#e8f6ed"
                    : boundaryMetrics.label === "MEDIUM"
                    ? "#fff5df"
                    : "#fdeaea",
                color:
                  boundaryMetrics.label === "HIGH"
                    ? "#277544"
                    : boundaryMetrics.label === "MEDIUM"
                    ? "#9a6500"
                    : "#a83c3c",
                fontSize: 9,
                fontWeight: 900,
              }}
            >
              {boundaryMetrics.label}
            </span>
          </div>

          <div
            style={{
              height: 8,
              marginTop: 8,
              borderRadius: 999,
              background: "#e8eef3",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${boundaryMetrics.score}%`,
                height: "100%",
                background: "#3d789f",
                borderRadius: 999,
              }}
            />
          </div>

          <small
            style={{
              display: "block",
              marginTop: 8,
              color: "#728392",
              lineHeight: 1.45,
            }}
          >
            Prototype confidence based on geometry and available
            parcel-record fields. It is not a certified survey accuracy
            measure.
          </small>
        </div>
      </details>

      <details open>
        <summary
          style={{
            cursor: "pointer",
            padding: "12px 14px",
            borderTop: "1px solid #e3ebf1",
            fontSize: 11,
            fontWeight: 900,
            color: "#214a67",
          }}
        >
          04 - Conflict Detector
          <span
            style={{
              float: "right",
              padding: "3px 7px",
              borderRadius: 999,
              background: conflicts.length ? "#fff0e8" : "#eaf7ef",
              color: conflicts.length ? "#a94d22" : "#287348",
              fontSize: 9,
            }}
          >
            {conflicts.length} flag{conflicts.length === 1 ? "" : "s"}
          </span>
        </summary>

        <div style={{ padding: "0 14px 14px" }}>
          {conflicts.length ? (
            conflicts.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: "9px 10px",
                  marginTop: 7,
                  borderRadius: 10,
                  background: "#fff7f2",
                  border: "1px solid #f2d8ca",
                  fontSize: 10,
                  color: "#704331",
                  lineHeight: 1.45,
                }}
              >
                <strong>Attention:</strong> {item}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: "10px",
                marginTop: 7,
                borderRadius: 10,
                background: "#f1faf4",
                border: "1px solid #d4ebdc",
                color: "#2a6942",
                fontSize: 10,
                lineHeight: 1.45,
              }}
            >
              No derived record conflict was detected from the currently
              available parcel fields.
            </div>
          )}
        </div>
      </details>

      <details open>
        <summary
          style={{
            cursor: "pointer",
            padding: "12px 14px",
            borderTop: "1px solid #e3ebf1",
            fontSize: 11,
            fontWeight: 900,
            color: "#214a67",
          }}
        >
          06 - Parcel Relationship Graph
        </summary>

        <div
          style={{
            padding: "5px 10px 14px",
            position: "relative",
            height: 185,
          }}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              inset: 18,
              width: "calc(100% - 36px)",
              height: "calc(100% - 36px)",
              pointerEvents: "none",
            }}
          >
            {[
              [50, 50, 18, 18],
              [50, 50, 82, 18],
              [50, 50, 18, 82],
              [50, 50, 82, 82],
            ].map((line, i) => (
              <line
                key={i}
                x1={line[0]}
                y1={line[1]}
                x2={line[2]}
                y2={line[3]}
                stroke="#b9cbd7"
                strokeWidth="1"
              />
            ))}
          </svg>

          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
              width: 86,
              minHeight: 54,
              borderRadius: 12,
              background: "#153e63",
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 7,
              textAlign: "center",
              zIndex: 2,
              boxShadow: "0 8px 18px rgba(21,62,99,.18)",
            }}
          >
            <strong style={{ fontSize: 10 }}>
              {parcel?.ulpin || parcel?.id || "Selected Parcel"}
            </strong>
            <span style={{ fontSize: 8, opacity: 0.8 }}>
              CURRENT
            </span>
          </div>

          {relationships.map((item, index) => {
            const positions = [
              { left: "4%", top: "4%" },
              { right: "4%", top: "4%" },
              { left: "4%", bottom: "4%" },
              { right: "4%", bottom: "4%" },
            ];

            const p = item.feature?.properties || {};
            const id = String(p.id ?? p.ulpin ?? "");

            return (
              <button
                key={`${id}-${index}`}
                type="button"
                onClick={() => id && onSelect(id)}
                style={{
                  ...positions[index],
                  position: "absolute",
                  width: 78,
                  minHeight: 48,
                  border: "1px solid #d3e1e9",
                  borderRadius: 11,
                  background: "#fff",
                  cursor: "pointer",
                  zIndex: 3,
                  padding: 6,
                  textAlign: "center",
                }}
                title="Open adjacent/nearby parcel"
              >
                <strong
                  style={{
                    display: "block",
                    fontSize: 9,
                    color: "#244e6b",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {p.ulpin || p.id || "Parcel"}
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: 3,
                    fontSize: 8,
                    color: "#82919c",
                  }}
                >
                  {item.distance < 1
                    ? `${(item.distance * 1000).toFixed(0)} m`
                    : `${item.distance.toFixed(2)} km`}
                </span>
              </button>
            );
          })}

          {!relationships.length && (
            <div
              style={{
                position: "absolute",
                inset: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#7b8b97",
                fontSize: 10,
                textAlign: "center",
              }}
            >
              Nearby parcel relationships are not available for this
              geometry.
            </div>
          )}
        </div>
      </details>

      <details open>
        <summary
          style={{
            cursor: "pointer",
            padding: "12px 14px",
            borderTop: "1px solid #e3ebf1",
            fontSize: 11,
            fontWeight: 900,
            color: "#214a67",
          }}
        >
          07 - Subdivision Simulator
        </summary>

        <div style={{ padding: "0 14px 14px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 9,
              color: "#687b89",
              marginBottom: 6,
            }}
          >
            <span>Parcel A</span>
            <strong style={{ color: "#284f69" }}>
              {splitRatio}% / {100 - splitRatio}%
            </strong>
            <span>Parcel B</span>
          </div>

          <input
            type="range"
            min="10"
            max="90"
            step="5"
            value={splitRatio}
            onChange={(e) =>
              setSplitRatio(Number(e.target.value))
            }
            style={{ width: "100%" }}
          />

          <div
            style={{
              marginTop: 10,
              border: "1px solid #d8e3ea",
              borderRadius: 10,
              padding: 8,
              background: "#fbfdfe",
            }}
          >
            <svg
              viewBox="0 0 240 90"
              style={{
                width: "100%",
                height: 74,
                display: "block",
              }}
            >
              <rect
                x="7"
                y="7"
                width="226"
                height="76"
                rx="5"
                fill="#edf4f8"
                stroke="#5a8198"
                strokeWidth="2"
              />

              <line
                x1={7 + (226 * splitRatio) / 100}
                y1="7"
                x2={7 + (226 * splitRatio) / 100}
                y2="83"
                stroke="#153e63"
                strokeWidth="3"
                strokeDasharray="5 4"
              />

              <text
                x={7 + (226 * splitRatio) / 200}
                y="52"
                textAnchor="middle"
                fontSize="10"
                fill="#234b67"
              >
                A
              </text>

              <text
                x={7 + 226 * (splitRatio / 100 + (100 - splitRatio) / 200)}
                y="52"
                textAnchor="middle"
                fontSize="10"
                fill="#234b67"
              >
                B
              </text>
            </svg>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 7,
              marginTop: 8,
            }}
          >
            <div
              style={{
                padding: "8px 9px",
                borderRadius: 9,
                background: "#f0f6fa",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: 8,
                  color: "#738492",
                }}
              >
                SIMULATED PARCEL A
              </span>
              <strong
                style={{
                  display: "block",
                  marginTop: 2,
                  color: "#224c68",
                  fontSize: 11,
                }}
              >
                {leftArea !== null
                  ? `${leftArea.toFixed(2)} ${unit}`
                  : `${splitRatio}%`}
              </strong>
            </div>

            <div
              style={{
                padding: "8px 9px",
                borderRadius: 9,
                background: "#f0f6fa",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: 8,
                  color: "#738492",
                }}
              >
                SIMULATED PARCEL B
              </span>
              <strong
                style={{
                  display: "block",
                  marginTop: 2,
                  color: "#224c68",
                  fontSize: 11,
                }}
              >
                {rightArea !== null
                  ? `${rightArea.toFixed(2)} ${unit}`
                  : `${100 - splitRatio}%`}
              </strong>
            </div>
          </div>

          <div
            style={{
              marginTop: 8,
              padding: "8px 9px",
              borderRadius: 9,
              background: "#fff7df",
              color: "#7d601d",
              fontSize: 9,
              lineHeight: 1.4,
            }}
          >
            What-if preview only. The simulator does not change the
            cadastral geometry, database record, ownership or parcel ID.
          </div>

          <button
            type="button"
            onClick={() => setSplitRatio(50)}
            style={{
              marginTop: 8,
              width: "100%",
              height: 32,
              border: "1px solid #d3e1e9",
              borderRadius: 9,
              background: "#fff",
              color: "#31566f",
              fontWeight: 800,
              fontSize: 9,
              cursor: "pointer",
            }}
          >
            Reset 50 / 50
          </button>
        </div>
      </details>
    </div>
  );
}
export default function GisMap() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedParcelId = searchParams.get("parcelId") || "";

  const [geo, setGeo] = useState<FeatureCollection>({
    type: "FeatureCollection",
    features: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [landUse, setLandUse] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [satellite, setSatellite] = useState(true);
  const [localDetail, setLocalDetail] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [fitVersion, setFitVersion] = useState(0);

  async function loadMap() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/parcels/geojson`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization:
              `Bearer ${localStorage.getItem("landsync_token") || ""}`,
          },
        }
      );

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          json?.detail ||
            json?.error?.message ||
            `GIS request failed (${response.status})`
        );
      }

      const data =
        json?.data?.type === "FeatureCollection"
          ? json.data
          : json?.type === "FeatureCollection"
          ? json
          : json?.data?.data?.type === "FeatureCollection"
          ? json.data.data
          : null;

      if (!data) {
        throw new Error("GIS API returned no FeatureCollection");
      }

      setGeo({
        type: "FeatureCollection",
        features: Array.isArray(data.features)
          ? data.features
          : [],
      });

      setSelectedId("");
      setFitVersion((x) => x + 1);
    } catch (err: any) {
      console.error("GIS load error:", err);
      setError(
        err?.message ||
          "GIS parcel data could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMap();
  }, []);

  useEffect(() => {
    const parcelId = new URLSearchParams(window.location.search).get("parcelId");
    if (!parcelId || !geo.features.length) return;

    const match = geo.features.find((feature) => {
      const p = feature.properties || {};
      return (
        String(p.id ?? "") === String(parcelId) ||
        String(p.parcel_id ?? "") === String(parcelId) ||
        String(p.ulpin ?? "") === String(parcelId)
      );
    });

    if (!match) return;

    const p = match.properties || {};
    setSelectedId(String(p.id ?? p.ulpin ?? p.parcel_id ?? ""));
    setSearch(String(p.ulpin ?? p.owner_name ?? p.owner ?? ""));
    setFitVersion((v) => v + 1);
  }, [geo.features]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return geo.features.filter((f) => {
      const p = f.properties || {};

      const text = [
        p.ulpin,
        p.owner,
        p.owner_name,
        p.survey_number,
        p.khasra_number,
        p.village,
        p.locality,
        p.tehsil,
        p.district,
        p.state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !q || text.includes(q);

      const matchesUse =
        landUse === "ALL" ||
        useKey(p.land_use) === landUse;

      const st = String(
        p.status || p.registration_status || ""
      ).toUpperCase();

      const matchesStatus =
        status === "ALL" || st.includes(status);

      return (
        matchesSearch &&
        matchesUse &&
        matchesStatus
      );
    });
  }, [geo.features, search, landUse, status]);

  const selected = useMemo(
    () =>
      filtered.find(
        (f) =>
          String(
            f.properties?.id ??
              f.properties?.ulpin
          ) === selectedId
      ) || null,
    [filtered, selectedId]
  );

  const selectedParcel = selected?.properties || null;

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      ALL: geo.features.length,
      RESIDENTIAL: 0,
      AGRICULTURAL: 0,
      COMMERCIAL: 0,
      INDUSTRIAL: 0,
      OTHER: 0,
    };

    geo.features.forEach((f) => {
      c[useKey(f.properties?.land_use)] += 1;
    });

    return c;
  }, [geo.features]);

  return (
    <section className="ls-gis-page">

      <div className="ls-gis-topbar">
        <div>
          <div className="ls-gis-eyebrow">
            GIS INTELLIGENCE
          </div>

          <h1>India Land Parcel Explorer</h1>

          <p>
            Explore registered parcels, nearby locations
            and connected land records on an interactive GIS map.
          </p>
        </div>

        <div className="ls-gis-top-actions">
          <button
            className="ls-gis-top-button"
            onClick={() => {
              setSelectedId("");
              setFitVersion((x) => x + 1);
            }}
          >
            <Crosshair size={18} />
            Fit Results
          </button>

          <button
            className="ls-gis-top-button"
            onClick={loadMap}
          >
            <RefreshCw
              size={18}
              className={
                loading ? "ls-gis-spin" : ""
              }
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="ls-gis-layout">

        <aside className="ls-gis-sidebar">

          <div className="ls-gis-search-card">
            <div className="ls-gis-card-title">
              <Search size={19} />
              Search & Filter
            </div>

            <div className="ls-gis-search-box">
              <Search size={18} />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="ULPIN, owner, survey, village..."
              />

              {search && (
                <button onClick={() => setSearch("")}>
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="ls-gis-filter-label">
              LAND USE
            </div>

            <div className="ls-gis-use-grid">
              {[
                ["ALL", "All Parcels"],
                ["RESIDENTIAL", "Residential"],
                ["AGRICULTURAL", "Agricultural"],
                ["COMMERCIAL", "Commercial"],
                ["INDUSTRIAL", "Industrial"],
                ["OTHER", "Others"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={
                    landUse === key ? "active" : ""
                  }
                  onClick={() => {
                    setLandUse(key);
                    setSelectedId("");
                  }}
                >
                  <span
                    className="ls-gis-use-dot"
                    style={{
                      background:
                        key === "ALL"
                          ? "linear-gradient(90deg,#2563eb,#16a34a,#f59e0b,#dc2626)"
                          : useColor(key),
                    }}
                  />

                  {label}

                  <b>
                    {counts[key]}
                  </b>
                </button>
              ))}
            </div>

            <div className="ls-gis-filter-label">
              RECORD STATUS
            </div>

            <select
              className="ls-gis-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setSelectedId("");
              }}
            >
              <option value="ALL">
                All Statuses
              </option>
              <option value="VERIFIED">
                Verified
              </option>
              <option value="APPROVED">
                Approved
              </option>
              <option value="PENDING">
                Pending
              </option>
              <option value="REVIEW">
                Review
              </option>
              <option value="RESTRICTED">
                Restricted
              </option>
            </select>
          </div>

          <div className="ls-gis-stat-card">
            <div>
              <span>VISIBLE PARCELS</span>
              <strong>
                {filtered.length}
              </strong>
            </div>

            <LandPlot size={27} />
          </div>

          {selectedParcel ? (
            <div className="ls-gis-details-card">

              <div className="ls-gis-details-header">
                <div>
                  <span>SELECTED PARCEL</span>
                  <h2>
                    {selectedParcel.ulpin || "Parcel"}
                  </h2>
                </div>

                <button
                  onClick={() => setSelectedId("")}
                >
                  <X size={18} />
                </button>
              </div>

              <div
                className="ls-gis-selected-use"
                style={{
                  color: useColor(
                    selectedParcel.land_use
                  ),
                  borderColor: useColor(
                    selectedParcel.land_use
                  ),
                }}
              >
                <span
                  style={{
                    background: useColor(
                      selectedParcel.land_use
                    ),
                  }}
                />

                {useLabel(
                  selectedParcel.land_use
                )}
              </div>

              <div className="ls-gis-owner-block">
                <UserRound size={18} />

                <div>
                  <span>Owner</span>

                  <strong>
                    {selectedParcel.owner ||
                      selectedParcel.owner_name ||
                      "Not available"}
                  </strong>
                </div>
              </div>

              <div className="ls-gis-detail-grid">

                <div>
                  <span>Area</span>
                  <strong>
                    {selectedParcel.area ?? "—"}{" "}
                    {selectedParcel.area_unit || ""}
                  </strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>
                    {selectedParcel.status ||
                      selectedParcel.registration_status ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>Survey No.</span>
                  <strong>
                    {selectedParcel.survey_number || "—"}
                  </strong>
                </div>

                <div>
                  <span>Khasra No.</span>
                  <strong>
                    {selectedParcel.khasra_number || "—"}
                  </strong>
                </div>

                <div>
                  <span>Village</span>
                  <strong>
                    {selectedParcel.village || "—"}
                  </strong>
                </div>

                <div>
                  <span>District</span>
                  <strong>
                    {selectedParcel.district || "—"}
                  </strong>
                </div>

                <div>
                  <span>RoR</span>
                  <strong>
                    {selectedParcel.ror_status || "—"}
                  </strong>
                </div>

                <div>
                  <span>Registration</span>
                  <strong>
                    {selectedParcel.registration_status || "—"}
                  </strong>
                </div>

                <div>
                  <span>Encumbrance</span>
                  <strong>
                    {selectedParcel.encumbrance_status || "—"}
                  </strong>
                </div>

                <div>
                  <span>Tax</span>
                  <strong>
                    {selectedParcel.tax_status || "—"}
                  </strong>
                </div>
              </div>

              <div className="ls-gis-location-box">
                <MapPinned size={17} />

                <div>
                  <strong>
                    {selectedParcel.locality ||
                      selectedParcel.village ||
                      "Locality"}
                  </strong>

                  <span>
                    {[
                      selectedParcel.village,
                      selectedParcel.tehsil,
                      selectedParcel.district,
                      selectedParcel.state,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </span>
                </div>
              </div>

            <CadastralIntelligencePanel
              parcel={selectedParcel}
              feature={selected}
              features={geo.features}
              onSelect={(id: string) => setSelectedId(id)}
            />
              <button
                className="ls-gis-view-details"
                onClick={() =>
                  navigate(
                    `/parcels/${selectedParcel.id}`
                  )
                }
              >
                <FileText size={18} />
                View Complete Parcel Record
                <ChevronRight size={17} />
              </button>

            </div>
          ) : (
            <div className="ls-gis-help-card">
              <MapIcon size={30} />

              <h3>Select a parcel</h3>

              <p>
                Click a colourful parcel marker or the
                transparent parcel boundary to inspect
                the connected record.
              </p>
            </div>
          )}

        </aside>

        <div className="ls-gis-map-shell">

          <div className="ls-gis-map-toolbar">

            <div className="ls-gis-map-mode">

              <button
                className={
                  !satellite ? "active" : ""
                }
                onClick={() =>
                  setSatellite(false)
                }
              >
                <MapIcon size={17} />
                Road Map
              </button>

              <button
                className={
                  satellite ? "active" : ""
                }
                onClick={() =>
                  setSatellite(true)
                }
              >
                <Satellite size={17} />
                Satellite
              </button>

              <button
                className={
                  localDetail ? "active" : ""
                }
                onClick={() =>
                  setLocalDetail((v) => !v)
                }
                title="Show detailed roads, localities and nearby places"
              >
                <MapPinned size={17} />
                Local Detail
              </button>
            </div>

            <div className="ls-gis-map-count">
              {filtered.length} parcel
              {filtered.length === 1 ? "" : "s"} shown
            </div>

          </div>

          <MapContainer
            center={[22.5, 79]}
            zoom={5}
            minZoom={4}
            maxZoom={19}
            scrollWheelZoom={true}
            className="ls-gis-map"
          >

            {!satellite ? (
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
            ) : (
              <>
                {/* High-resolution satellite imagery */}
                <TileLayer
                  attribution="Tiles &copy; Esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                  maxNativeZoom={19}
                />

                {/* Roads, highways, railways and transport context */}
                <TileLayer
                  attribution="Transportation &copy; Esri, HERE, Garmin, and contributors"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                  opacity={0.95}
                />

                {/* Parks, waterways and other geographic reference features */}
                <TileLayer
                  attribution=""
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                  opacity={0.9}
                />

                {/* Locality / place names and boundaries */}
                <TileLayer
                  attribution=""
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                  opacity={0.92}
                />


              </>
            )}

            {filtered.length > 0 && (
              <GeoJSON
                key={`${landUse}-${status}-${search}-${selectedId}`}
                data={{ type: "FeatureCollection", features: filtered } as any}
                style={(feature: any) => {
                  const id = String(
                    feature?.properties?.id ??
                      feature?.properties?.ulpin
                  );

                  const selectedParcel =
                    id === selectedId;

                  const c = useColor(
                    feature?.properties?.land_use
                  );

                  return {
                    color: selectedParcel
                      ? "#111827"
                      : c,
                    weight: selectedParcel ? 4 : 2,
                    opacity: 1,
                    fillColor: c,
                    fillOpacity: selectedParcel
                      ? 0.42
                      : 0.22,
                  };
                }}
                onEachFeature={(feature, layer) => {
                  layer.on({
                    click: () => {
                      setSelectedId(
                        String(
                          feature.properties?.id ??
                            feature.properties?.ulpin
                        )
                      );
                    },
                  });
                }}
              />
            )}

            {filtered.map((feature) => {
              const p = feature.properties || {};

              const id = String(
                p.id ??
                  p.ulpin ??
                  `${latOf(p)}-${lonOf(p)}`
              );

              const lat = latOf(p);
              const lon = lonOf(p);

              if (!lat || !lon) {
                return null;
              }

              return (
                <Marker
                  key={`${id}-${selectedId}`}
                  position={[lat, lon]}
                  icon={markerIcon(
                    useColor(p.land_use),
                    id === selectedId
                  )}
                  eventHandlers={{
                    click: () =>
                      setSelectedId(id),
                  }}
                >
                  <Popup autoPan={true}>
                    <PopupCard
                      parcel={p}
                      navigate={navigate}
                    />
                  </Popup>
                </Marker>
              );
            })}

            <LocalOSMContext enabled={localDetail} />

            <ParcelAreaTiles features={filtered} />
            <MapController
              selected={selected}
              features={filtered}
              fitVersion={fitVersion}
            />

          </MapContainer>

          <div className="ls-gis-legend">

            <div className="ls-gis-legend-title">
              <Layers3 size={17} />
              Land Use
            </div>

            {[
              ["RESIDENTIAL", "Residential"],
              ["AGRICULTURAL", "Agricultural"],
              ["COMMERCIAL", "Commercial"],
              ["INDUSTRIAL", "Industrial"],
              ["OTHER", "Other"],
            ].map(([key, label]) => (
              <div
                key={key}
                className="ls-gis-legend-item"
              >
                <span
                  style={{
                    background: useColor(key),
                  }}
                />
                {label}
              </div>
            ))}

          </div>

          <div className="ls-gis-map-notice">
            <ShieldCheck size={15} />
            Demo / Synthetic GIS Data — Not an Official Cadastral Map
          </div>

          {loading && (
            <div className="ls-gis-overlay">
              <RefreshCw
                size={24}
                className="ls-gis-spin"
              />
              Loading parcel map…
            </div>
          )}

          {error && (
            <div className="ls-gis-error">
              <strong>
                GIS data could not be loaded
              </strong>

              <span>{error}</span>

              <button onClick={loadMap}>
                Try Again
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            filtered.length === 0 && (
              <div className="ls-gis-empty-map">
                <LandPlot size={36} />

                <h3>No parcels found</h3>

                <p>
                  Change the search or land-use filter.
                </p>
              </div>
            )}

        </div>
      </div>
    </section>
  );
}















