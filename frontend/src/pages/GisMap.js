import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, Polygon, Polyline, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Search, Satellite, Map as MapIcon, Layers3, RefreshCw, Crosshair, X, ChevronRight, MapPinned, LandPlot, UserRound, FileText, ShieldCheck, } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
const COLORS = {
    RESIDENTIAL: "#2563eb",
    AGRICULTURAL: "#16a34a",
    COMMERCIAL: "#f59e0b",
    INDUSTRIAL: "#dc2626",
    OTHER: "#7c3aed",
};
function payload(v) {
    return v?.data?.data ?? v?.data ?? v ?? {};
}
function useKey(value) {
    const x = String(value || "").toUpperCase();
    if (x.includes("RESIDENT"))
        return "RESIDENTIAL";
    if (x.includes("AGRI"))
        return "AGRICULTURAL";
    if (x.includes("COMMERCIAL"))
        return "COMMERCIAL";
    if (x.includes("INDUSTR"))
        return "INDUSTRIAL";
    return "OTHER";
}
function useLabel(value) {
    const k = useKey(value);
    if (k === "RESIDENTIAL")
        return "Residential";
    if (k === "AGRICULTURAL")
        return "Agricultural";
    if (k === "COMMERCIAL")
        return "Commercial";
    if (k === "INDUSTRIAL")
        return "Industrial";
    return value || "Other";
}
function useColor(value) {
    return COLORS[useKey(value)] || COLORS.OTHER;
}
function latOf(p) {
    return Number(p.latitude ?? p.lat ?? 0);
}
function lonOf(p) {
    return Number(p.longitude ?? p.lon ?? 0);
}
function allCoords(coords, out = []) {
    if (!Array.isArray(coords))
        return out;
    if (coords.length >= 2 &&
        typeof coords[0] === "number" &&
        typeof coords[1] === "number") {
        out.push(coords);
        return out;
    }
    coords.forEach((x) => allCoords(x, out));
    return out;
}
function featureBounds(feature) {
    if (!feature?.geometry)
        return null;
    const pts = allCoords(feature.geometry.coordinates);
    if (!pts.length)
        return null;
    const lats = pts.map((p) => p[1]);
    const lons = pts.map((p) => p[0]);
    return L.latLngBounds([Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]);
}
function collectionBounds(features) {
    const pts = [];
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
    if (!pts.length)
        return null;
    const lats = pts.map((p) => p[1]);
    const lons = pts.map((p) => p[0]);
    return L.latLngBounds([Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]);
}
function markerIcon(color, selected) {
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
function ParcelAreaTiles({ features }) {
    const toSqM = (value, unit) => {
        const n = Number(value) || 0;
        const u = String(unit || "sq m").toLowerCase();
        if (u.includes("hect"))
            return n * 10000;
        if (u.includes("acre"))
            return n * 4046.8564224;
        if (u.includes("sq ft") || u.includes("square feet"))
            return n * 0.09290304;
        if (u.includes("sq yd") || u.includes("square yard"))
            return n * 0.83612736;
        return n;
    };
    return (_jsx(_Fragment, { children: features.map((feature, index) => {
            const p = feature.properties || feature;
            const lat = Number(p.latitude ?? p.lat);
            const lon = Number(p.longitude ?? p.lng ?? p.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lon))
                return null;
            const areaSqM = toSqM(p.area ?? p.area_value ?? p.parcel_area, p.area_unit ?? p.unit);
            if (areaSqM <= 0)
                return null;
            // Square dimensions based on actual registered area.
            const sideMeters = Math.sqrt(areaSqM);
            // Approximate metre -> latitude/longitude conversion.
            const dLat = (sideMeters / 2) / 111320;
            const cosLat = Math.max(0.15, Math.cos((lat * Math.PI) / 180));
            const dLon = (sideMeters / 2) / (111320 * cosLat);
            const positions = [
                [lat - dLat, lon - dLon],
                [lat - dLat, lon + dLon],
                [lat + dLat, lon + dLon],
                [lat + dLat, lon - dLon],
            ];
            const type = String(p.property_type ??
                p.propertyType ??
                p.land_use ??
                p.landUse ??
                "Other").toLowerCase();
            let fillColor = "#7c3aed";
            if (type.includes("residential")) {
                fillColor = "#2563eb";
            }
            else if (type.includes("agri")) {
                fillColor = "#16a34a";
            }
            else if (type.includes("commercial")) {
                fillColor = "#f59e0b";
            }
            else if (type.includes("industrial")) {
                fillColor = "#dc2626";
            }
            return (_jsx(Polygon, { positions: positions, pathOptions: {
                    color: fillColor,
                    weight: 3,
                    opacity: 0.95,
                    fillColor,
                    fillOpacity: 0.38,
                }, children: _jsxs(Tooltip, { sticky: true, children: [_jsx("strong", { children: p.ulpin ?? p.ULPIN ?? "Parcel" }), _jsx("br", {}), p.property_type ?? p.propertyType ?? p.land_use ?? p.landUse ?? "Other", _jsx("br", {}), "Area: ", p.area ?? "â€”", " ", p.area_unit ?? p.unit ?? ""] }) }, `area-${p.id ?? p.ulpin ?? index}`));
        }) }));
}
function MapController({ selected, features, fitVersion, }) {
    const map = useMap();
    useEffect(() => {
        if (!selected)
            return;
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
        if (selected || fitVersion === 0 || !features.length)
            return;
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
function osmPoint(element) {
    if (typeof element.lat === "number" &&
        typeof element.lon === "number") {
        return [element.lat, element.lon];
    }
    if (element.geometry?.length) {
        const middle = element.geometry[Math.floor(element.geometry.length / 2)];
        return [middle.lat, middle.lon];
    }
    return null;
}
function osmLine(element) {
    if (!element.geometry?.length)
        return [];
    return element.geometry.map((p) => [p.lat, p.lon]);
}
function osmCategory(tags) {
    if (!tags)
        return "place";
    if (tags.shop)
        return "shop";
    if (tags.leisure === "park")
        return "park";
    if (tags.amenity === "school")
        return "school";
    if (tags.amenity === "hospital")
        return "hospital";
    if (tags.amenity === "fuel")
        return "fuel";
    if (tags.amenity)
        return "amenity";
    if (tags.place)
        return "place";
    return "place";
}
function osmLabel(tags) {
    if (!tags)
        return "Place";
    if (tags.shop)
        return tags.shop;
    if (tags.amenity)
        return tags.amenity;
    if (tags.leisure)
        return tags.leisure;
    if (tags.place)
        return tags.place;
    return "Place";
}
function osmIcon(name, category) {
    return L.divIcon({
        className: "ls-osm-feature-wrap",
        iconSize: [1, 1],
        iconAnchor: [0, 0],
        html: `
      <div class="ls-osm-feature ${category}">
        <span class="ls-osm-feature-dot"></span>
        <strong>${String(name).replace(/[&<>"']/g, (x) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        }[x]))}</strong>
      </div>
    `,
    });
}
function roadLabelIcon(name) {
    return L.divIcon({
        className: "ls-osm-road-label-wrap",
        iconSize: [1, 1],
        iconAnchor: [0, 0],
        html: `
      <div class="ls-osm-road-label">
        ${String(name).replace(/[&<>"']/g, (x) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        }[x]))}
      </div>
    `,
    });
}
function LocalOSMContext({ enabled, }) {
    const map = useMap();
    const [elements, setElements] = useState([]);
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
                const radius = view.zoom >= 19
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
                const response = await fetch("https://overpass-api.de/api/interpreter", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                    },
                    body: `data=${encodeURIComponent(query)}`,
                });
                if (!response.ok) {
                    throw new Error(`Local GIS request failed: ${response.status}`);
                }
                const json = await response.json();
                if (!cancelled) {
                    setElements(Array.isArray(json?.elements)
                        ? json.elements
                        : []);
                }
            }
            catch (error) {
                console.error("Local OSM detail error:", error);
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
    const roads = elements.filter((x) => x.tags?.highway &&
        x.tags?.name &&
        Array.isArray(x.geometry) &&
        x.geometry.length > 1);
    const roadNames = Array.from(new Map(roads.map((road) => [
        road.tags?.name,
        road,
    ])).values());
    const places = elements.filter((x) => x.tags?.name &&
        !x.tags?.highway &&
        !!osmPoint(x));
    return (_jsxs(_Fragment, { children: [roads.map((road) => {
                const positions = osmLine(road);
                if (positions.length < 2)
                    return null;
                return (_jsx(Polyline, { positions: positions, pathOptions: {
                        color: "#f7f3e8",
                        weight: view.zoom >= 17
                            ? 3
                            : 2,
                        opacity: 0.92,
                        lineCap: "round",
                    }, children: _jsx(Tooltip, { sticky: true, children: road.tags?.name }) }, `road-${road.id}`));
            }), view.zoom >= 16 &&
                roadNames.map((road) => {
                    const point = osmPoint(road);
                    if (!point || !road.tags?.name) {
                        return null;
                    }
                    return (_jsx(Marker, { position: point, icon: roadLabelIcon(road.tags.name), interactive: false }, `road-label-${road.id}`));
                }), view.zoom >= 17 &&
                places.slice(0, 120).map((place) => {
                    const point = osmPoint(place);
                    if (!point || !place.tags?.name) {
                        return null;
                    }
                    const category = osmCategory(place.tags);
                    return (_jsx(Marker, { position: point, icon: osmIcon(place.tags.name, category), interactive: false, children: _jsxs(Tooltip, { direction: "top", permanent: view.zoom >= 18, opacity: 1, children: [_jsx("strong", { children: place.tags.name }), _jsx("br", {}), osmLabel(place.tags)] }) }, `poi-${place.type}-${place.id}`));
                })] }));
}
function PopupCard({ parcel, navigate, }) {
    return (_jsxs("div", { className: "ls-gis-popup-card", children: [_jsx("div", { className: "ls-gis-popup-kicker", children: "LAND PARCEL" }), _jsx("div", { className: "ls-gis-popup-id", children: parcel.ulpin || "Parcel" }), _jsx("div", { className: "ls-gis-popup-owner", children: parcel.owner || parcel.owner_name || "Owner not available" }), _jsxs("div", { className: "ls-gis-popup-grid", children: [_jsxs("div", { children: [_jsx("span", { children: "Land Use" }), _jsx("strong", { children: useLabel(parcel.land_use) })] }), _jsxs("div", { children: [_jsx("span", { children: "Area" }), _jsxs("strong", { children: [parcel.area ?? "â€”", " ", parcel.area_unit || ""] })] }), _jsxs("div", { children: [_jsx("span", { children: "Village" }), _jsx("strong", { children: parcel.village || "â€”" })] }), _jsxs("div", { children: [_jsx("span", { children: "District" }), _jsx("strong", { children: parcel.district || "â€”" })] })] }), _jsxs("button", { className: "ls-gis-popup-button", onClick: () => navigate(`/parcels/${parcel.id}`), children: ["View Full Parcel Details", _jsx(ChevronRight, { size: 16 })] })] }));
}
function CadastralIntelligencePanel({ parcel, feature, features, onSelect, }) {
    const [splitRatio, setSplitRatio] = useState(50);
    const safeNumber = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    };
    const centerOfFeature = (f) => {
        const p = f?.properties || {};
        try {
            const lat = Number(latOf(p));
            const lon = Number(lonOf(p));
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
                return { lat, lon };
            }
        }
        catch { }
        const g = f?.geometry;
        if (g?.type === "Polygon" && Array.isArray(g.coordinates?.[0])) {
            const ring = g.coordinates[0];
            const pts = ring.filter((x) => Array.isArray(x) &&
                Number.isFinite(Number(x[0])) &&
                Number.isFinite(Number(x[1])));
            if (pts.length) {
                const lon = pts.reduce((sum, x) => sum + Number(x[0]), 0) /
                    pts.length;
                const lat = pts.reduce((sum, x) => sum + Number(x[1]), 0) /
                    pts.length;
                return { lat, lon };
            }
        }
        return null;
    };
    const distanceKm = (a, b) => {
        if (!a || !b)
            return Number.POSITIVE_INFINITY;
        const R = 6371;
        const dLat = ((b.lat - a.lat) * Math.PI) / 180;
        const dLon = ((b.lon - a.lon) * Math.PI) / 180;
        const lat1 = (a.lat * Math.PI) / 180;
        const lat2 = (b.lat * Math.PI) / 180;
        const h = Math.sin(dLat / 2) ** 2 +
            Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
        return 2 * R * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
    };
    const geometryAreaSqM = (geometry) => {
        if (!geometry)
            return null;
        const ringArea = (ring) => {
            if (!Array.isArray(ring) || ring.length < 3)
                return 0;
            const valid = ring.filter((x) => Array.isArray(x) &&
                Number.isFinite(Number(x[0])) &&
                Number.isFinite(Number(x[1])));
            if (valid.length < 3)
                return 0;
            const meanLat = (valid.reduce((sum, x) => sum + Number(x[1]), 0) / valid.length) *
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
            if (!rings.length)
                return null;
            const outer = ringArea(rings[0]);
            const holes = rings
                .slice(1)
                .reduce((sum, ring) => sum + ringArea(ring), 0);
            return Math.max(0, outer - holes);
        }
        if (geometry.type === "MultiPolygon") {
            const polygons = geometry.coordinates || [];
            const total = polygons.reduce((sum, polygon) => {
                if (!polygon?.length)
                    return sum;
                const outer = ringArea(polygon[0]);
                const holes = polygon
                    .slice(1)
                    .reduce((s, ring) => s + ringArea(ring), 0);
                return sum + Math.max(0, outer - holes);
            }, 0);
            return total || null;
        }
        return null;
    };
    const recordAreaSqM = (p) => {
        const value = safeNumber(p?.area);
        if (value === null)
            return null;
        const unit = String(p?.area_unit || "").toLowerCase();
        if (unit.includes("hectare") ||
            unit === "ha" ||
            unit.includes("hec")) {
            return value * 10000;
        }
        if (unit.includes("acre")) {
            return value * 4046.8564224;
        }
        if (unit.includes("square meter") ||
            unit.includes("sq m") ||
            unit === "sqm" ||
            unit === "m2" ||
            unit === "mÂ²") {
            return value;
        }
        if (unit.includes("square foot") ||
            unit.includes("sq ft") ||
            unit === "sqft") {
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
            Boolean(parcel?.village ||
                parcel?.tehsil ||
                parcel?.district ||
                parcel?.state),
            Boolean(parcel?.ror_status ||
                parcel?.registration_status ||
                parcel?.encumbrance_status),
        ];
        const score = Math.min(98, 34 + checks.filter(Boolean).length * 11);
        const label = score >= 85 ? "HIGH" : score >= 65 ? "MEDIUM" : "LOW";
        return { score, label, checks };
    })();
    const conflicts = (() => {
        const list = [];
        const status = String(parcel?.status || "").trim().toLowerCase();
        const ror = String(parcel?.ror_status || "").trim().toLowerCase();
        const registration = String(parcel?.registration_status || "").trim().toLowerCase();
        const positive = ["verified", "approved", "active"];
        const unresolved = ["pending", "review", "under review"];
        if (positive.some((x) => status.includes(x)) &&
            unresolved.some((x) => ror.includes(x))) {
            list.push(`Parcel status (${parcel?.status}) and RoR status (${parcel?.ror_status}) are not aligned.`);
        }
        if (positive.some((x) => status.includes(x)) &&
            unresolved.some((x) => registration.includes(x))) {
            list.push(`Parcel status (${parcel?.status}) and registration status (${parcel?.registration_status}) are not aligned.`);
        }
        const gisArea = geometryAreaSqM(feature?.geometry);
        const dbArea = recordAreaSqM(parcel);
        if (gisArea !== null &&
            dbArea !== null &&
            dbArea > 0) {
            const difference = Math.abs(gisArea - dbArea) / dbArea;
            if (difference > 0.05) {
                list.push(`Recorded area and geometry area differ by ${(difference * 100).toFixed(1)}%.`);
            }
        }
        const enc = String(parcel?.encumbrance_status || "").toLowerCase();
        if (enc.includes("active") ||
            enc.includes("encumbered") ||
            enc === "yes") {
            list.push(`Encumbrance flag present: ${parcel?.encumbrance_status}.`);
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
    const leftArea = numericArea !== null
        ? (numericArea * splitRatio) / 100
        : null;
    const rightArea = numericArea !== null
        ? numericArea - (leftArea || 0)
        : null;
    return (_jsxs("div", { style: {
            marginTop: 14,
            border: "1px solid #d9e4ec",
            borderRadius: 15,
            background: "linear-gradient(180deg,#ffffff,#f7fafc)",
            overflow: "hidden",
        }, children: [_jsxs("div", { style: {
                    padding: "13px 14px",
                    borderBottom: "1px solid #e3ebf1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                }, children: [_jsxs("div", { children: [_jsx("div", { style: {
                                    fontSize: 10,
                                    fontWeight: 900,
                                    letterSpacing: ".11em",
                                    color: "#52697a",
                                }, children: "CADASTRAL INTELLIGENCE" }), _jsx("div", { style: {
                                    marginTop: 3,
                                    fontSize: 13,
                                    fontWeight: 900,
                                    color: "#163b59",
                                }, children: "Parcel analysis tools" })] }), _jsx("span", { style: {
                            fontSize: 9,
                            fontWeight: 900,
                            padding: "5px 8px",
                            borderRadius: 999,
                            background: "#eef5fa",
                            color: "#31556f",
                        }, children: "DERIVED / DEMO" })] }), _jsxs("details", { open: true, children: [_jsx("summary", { style: {
                            cursor: "pointer",
                            padding: "12px 14px",
                            fontSize: 11,
                            fontWeight: 900,
                            color: "#214a67",
                        }, children: "03 - Boundary Confidence" }), _jsxs("div", { style: { padding: "0 14px 14px" }, children: [_jsxs("div", { style: {
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }, children: [_jsxs("strong", { style: {
                                            fontSize: 24,
                                            color: "#153e63",
                                        }, children: [boundaryMetrics.score, "%"] }), _jsx("span", { style: {
                                            padding: "5px 8px",
                                            borderRadius: 999,
                                            background: boundaryMetrics.label === "HIGH"
                                                ? "#e8f6ed"
                                                : boundaryMetrics.label === "MEDIUM"
                                                    ? "#fff5df"
                                                    : "#fdeaea",
                                            color: boundaryMetrics.label === "HIGH"
                                                ? "#277544"
                                                : boundaryMetrics.label === "MEDIUM"
                                                    ? "#9a6500"
                                                    : "#a83c3c",
                                            fontSize: 9,
                                            fontWeight: 900,
                                        }, children: boundaryMetrics.label })] }), _jsx("div", { style: {
                                    height: 8,
                                    marginTop: 8,
                                    borderRadius: 999,
                                    background: "#e8eef3",
                                    overflow: "hidden",
                                }, children: _jsx("div", { style: {
                                        width: `${boundaryMetrics.score}%`,
                                        height: "100%",
                                        background: "#3d789f",
                                        borderRadius: 999,
                                    } }) }), _jsx("small", { style: {
                                    display: "block",
                                    marginTop: 8,
                                    color: "#728392",
                                    lineHeight: 1.45,
                                }, children: "Prototype confidence based on geometry and available parcel-record fields. It is not a certified survey accuracy measure." })] })] }), _jsxs("details", { open: true, children: [_jsxs("summary", { style: {
                            cursor: "pointer",
                            padding: "12px 14px",
                            borderTop: "1px solid #e3ebf1",
                            fontSize: 11,
                            fontWeight: 900,
                            color: "#214a67",
                        }, children: ["04 - Conflict Detector", _jsxs("span", { style: {
                                    float: "right",
                                    padding: "3px 7px",
                                    borderRadius: 999,
                                    background: conflicts.length ? "#fff0e8" : "#eaf7ef",
                                    color: conflicts.length ? "#a94d22" : "#287348",
                                    fontSize: 9,
                                }, children: [conflicts.length, " flag", conflicts.length === 1 ? "" : "s"] })] }), _jsx("div", { style: { padding: "0 14px 14px" }, children: conflicts.length ? (conflicts.map((item, index) => (_jsxs("div", { style: {
                                padding: "9px 10px",
                                marginTop: 7,
                                borderRadius: 10,
                                background: "#fff7f2",
                                border: "1px solid #f2d8ca",
                                fontSize: 10,
                                color: "#704331",
                                lineHeight: 1.45,
                            }, children: [_jsx("strong", { children: "Attention:" }), " ", item] }, index)))) : (_jsx("div", { style: {
                                padding: "10px",
                                marginTop: 7,
                                borderRadius: 10,
                                background: "#f1faf4",
                                border: "1px solid #d4ebdc",
                                color: "#2a6942",
                                fontSize: 10,
                                lineHeight: 1.45,
                            }, children: "No derived record conflict was detected from the currently available parcel fields." })) })] }), _jsxs("details", { open: true, children: [_jsx("summary", { style: {
                            cursor: "pointer",
                            padding: "12px 14px",
                            borderTop: "1px solid #e3ebf1",
                            fontSize: 11,
                            fontWeight: 900,
                            color: "#214a67",
                        }, children: "06 - Parcel Relationship Graph" }), _jsxs("div", { style: {
                            padding: "5px 10px 14px",
                            position: "relative",
                            height: 185,
                        }, children: [_jsx("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "none", style: {
                                    position: "absolute",
                                    inset: 18,
                                    width: "calc(100% - 36px)",
                                    height: "calc(100% - 36px)",
                                    pointerEvents: "none",
                                }, children: [
                                    [50, 50, 18, 18],
                                    [50, 50, 82, 18],
                                    [50, 50, 18, 82],
                                    [50, 50, 82, 82],
                                ].map((line, i) => (_jsx("line", { x1: line[0], y1: line[1], x2: line[2], y2: line[3], stroke: "#b9cbd7", strokeWidth: "1" }, i))) }), _jsxs("div", { style: {
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
                                }, children: [_jsx("strong", { style: { fontSize: 10 }, children: parcel?.ulpin || parcel?.id || "Selected Parcel" }), _jsx("span", { style: { fontSize: 8, opacity: 0.8 }, children: "CURRENT" })] }), relationships.map((item, index) => {
                                const positions = [
                                    { left: "4%", top: "4%" },
                                    { right: "4%", top: "4%" },
                                    { left: "4%", bottom: "4%" },
                                    { right: "4%", bottom: "4%" },
                                ];
                                const p = item.feature?.properties || {};
                                const id = String(p.id ?? p.ulpin ?? "");
                                return (_jsxs("button", { type: "button", onClick: () => id && onSelect(id), style: {
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
                                    }, title: "Open adjacent/nearby parcel", children: [_jsx("strong", { style: {
                                                display: "block",
                                                fontSize: 9,
                                                color: "#244e6b",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }, children: p.ulpin || p.id || "Parcel" }), _jsx("span", { style: {
                                                display: "block",
                                                marginTop: 3,
                                                fontSize: 8,
                                                color: "#82919c",
                                            }, children: item.distance < 1
                                                ? `${(item.distance * 1000).toFixed(0)} m`
                                                : `${item.distance.toFixed(2)} km` })] }, `${id}-${index}`));
                            }), !relationships.length && (_jsx("div", { style: {
                                    position: "absolute",
                                    inset: 12,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#7b8b97",
                                    fontSize: 10,
                                    textAlign: "center",
                                }, children: "Nearby parcel relationships are not available for this geometry." }))] })] }), _jsxs("details", { open: true, children: [_jsx("summary", { style: {
                            cursor: "pointer",
                            padding: "12px 14px",
                            borderTop: "1px solid #e3ebf1",
                            fontSize: 11,
                            fontWeight: 900,
                            color: "#214a67",
                        }, children: "07 - Subdivision Simulator" }), _jsxs("div", { style: { padding: "0 14px 14px" }, children: [_jsxs("div", { style: {
                                    display: "flex",
                                    justifyContent: "space-between",
                                    fontSize: 9,
                                    color: "#687b89",
                                    marginBottom: 6,
                                }, children: [_jsx("span", { children: "Parcel A" }), _jsxs("strong", { style: { color: "#284f69" }, children: [splitRatio, "% / ", 100 - splitRatio, "%"] }), _jsx("span", { children: "Parcel B" })] }), _jsx("input", { type: "range", min: "10", max: "90", step: "5", value: splitRatio, onChange: (e) => setSplitRatio(Number(e.target.value)), style: { width: "100%" } }), _jsx("div", { style: {
                                    marginTop: 10,
                                    border: "1px solid #d8e3ea",
                                    borderRadius: 10,
                                    padding: 8,
                                    background: "#fbfdfe",
                                }, children: _jsxs("svg", { viewBox: "0 0 240 90", style: {
                                        width: "100%",
                                        height: 74,
                                        display: "block",
                                    }, children: [_jsx("rect", { x: "7", y: "7", width: "226", height: "76", rx: "5", fill: "#edf4f8", stroke: "#5a8198", strokeWidth: "2" }), _jsx("line", { x1: 7 + (226 * splitRatio) / 100, y1: "7", x2: 7 + (226 * splitRatio) / 100, y2: "83", stroke: "#153e63", strokeWidth: "3", strokeDasharray: "5 4" }), _jsx("text", { x: 7 + (226 * splitRatio) / 200, y: "52", textAnchor: "middle", fontSize: "10", fill: "#234b67", children: "A" }), _jsx("text", { x: 7 + 226 * (splitRatio / 100 + (100 - splitRatio) / 200), y: "52", textAnchor: "middle", fontSize: "10", fill: "#234b67", children: "B" })] }) }), _jsxs("div", { style: {
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: 7,
                                    marginTop: 8,
                                }, children: [_jsxs("div", { style: {
                                            padding: "8px 9px",
                                            borderRadius: 9,
                                            background: "#f0f6fa",
                                        }, children: [_jsx("span", { style: {
                                                    display: "block",
                                                    fontSize: 8,
                                                    color: "#738492",
                                                }, children: "SIMULATED PARCEL A" }), _jsx("strong", { style: {
                                                    display: "block",
                                                    marginTop: 2,
                                                    color: "#224c68",
                                                    fontSize: 11,
                                                }, children: leftArea !== null
                                                    ? `${leftArea.toFixed(2)} ${unit}`
                                                    : `${splitRatio}%` })] }), _jsxs("div", { style: {
                                            padding: "8px 9px",
                                            borderRadius: 9,
                                            background: "#f0f6fa",
                                        }, children: [_jsx("span", { style: {
                                                    display: "block",
                                                    fontSize: 8,
                                                    color: "#738492",
                                                }, children: "SIMULATED PARCEL B" }), _jsx("strong", { style: {
                                                    display: "block",
                                                    marginTop: 2,
                                                    color: "#224c68",
                                                    fontSize: 11,
                                                }, children: rightArea !== null
                                                    ? `${rightArea.toFixed(2)} ${unit}`
                                                    : `${100 - splitRatio}%` })] })] }), _jsx("div", { style: {
                                    marginTop: 8,
                                    padding: "8px 9px",
                                    borderRadius: 9,
                                    background: "#fff7df",
                                    color: "#7d601d",
                                    fontSize: 9,
                                    lineHeight: 1.4,
                                }, children: "What-if preview only. The simulator does not change the cadastral geometry, database record, ownership or parcel ID." }), _jsx("button", { type: "button", onClick: () => setSplitRatio(50), style: {
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
                                }, children: "Reset 50 / 50" })] })] })] }));
}
export default function GisMap() {
    const navigate = useNavigate();
    const [geo, setGeo] = useState({
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
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/parcels/geojson`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("landsync_token") || ""}`,
                },
            });
            const json = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(json?.detail ||
                    json?.error?.message ||
                    `GIS request failed (${response.status})`);
            }
            const data = json?.data?.type === "FeatureCollection"
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
        }
        catch (err) {
            console.error("GIS load error:", err);
            setError(err?.message ||
                "GIS parcel data could not be loaded.");
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        loadMap();
    }, []);
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
            const matchesSearch = !q || text.includes(q);
            const matchesUse = landUse === "ALL" ||
                useKey(p.land_use) === landUse;
            const st = String(p.status || p.registration_status || "").toUpperCase();
            const matchesStatus = status === "ALL" || st.includes(status);
            return (matchesSearch &&
                matchesUse &&
                matchesStatus);
        });
    }, [geo.features, search, landUse, status]);
    const selected = useMemo(() => filtered.find((f) => String(f.properties?.id ??
        f.properties?.ulpin) === selectedId) || null, [filtered, selectedId]);
    const selectedParcel = selected?.properties || null;
    const counts = useMemo(() => {
        const c = {
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
    return (_jsxs("section", { className: "ls-gis-page", children: [_jsxs("div", { className: "ls-gis-topbar", children: [_jsxs("div", { children: [_jsx("div", { className: "ls-gis-eyebrow", children: "GIS INTELLIGENCE" }), _jsx("h1", { children: "India Land Parcel Explorer" }), _jsx("p", { children: "Explore registered parcels, nearby locations and connected land records on an interactive GIS map." })] }), _jsxs("div", { className: "ls-gis-top-actions", children: [_jsxs("button", { className: "ls-gis-top-button", onClick: () => {
                                    setSelectedId("");
                                    setFitVersion((x) => x + 1);
                                }, children: [_jsx(Crosshair, { size: 18 }), "Fit Results"] }), _jsxs("button", { className: "ls-gis-top-button", onClick: loadMap, children: [_jsx(RefreshCw, { size: 18, className: loading ? "ls-gis-spin" : "" }), "Refresh"] })] })] }), _jsxs("div", { className: "ls-gis-layout", children: [_jsxs("aside", { className: "ls-gis-sidebar", children: [_jsxs("div", { className: "ls-gis-search-card", children: [_jsxs("div", { className: "ls-gis-card-title", children: [_jsx(Search, { size: 19 }), "Search & Filter"] }), _jsxs("div", { className: "ls-gis-search-box", children: [_jsx(Search, { size: 18 }), _jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "ULPIN, owner, survey, village..." }), search && (_jsx("button", { onClick: () => setSearch(""), children: _jsx(X, { size: 16 }) }))] }), _jsx("div", { className: "ls-gis-filter-label", children: "LAND USE" }), _jsx("div", { className: "ls-gis-use-grid", children: [
                                            ["ALL", "All Parcels"],
                                            ["RESIDENTIAL", "Residential"],
                                            ["AGRICULTURAL", "Agricultural"],
                                            ["COMMERCIAL", "Commercial"],
                                            ["INDUSTRIAL", "Industrial"],
                                            ["OTHER", "Others"],
                                        ].map(([key, label]) => (_jsxs("button", { className: landUse === key ? "active" : "", onClick: () => {
                                                setLandUse(key);
                                                setSelectedId("");
                                            }, children: [_jsx("span", { className: "ls-gis-use-dot", style: {
                                                        background: key === "ALL"
                                                            ? "linear-gradient(90deg,#2563eb,#16a34a,#f59e0b,#dc2626)"
                                                            : useColor(key),
                                                    } }), label, _jsx("b", { children: counts[key] })] }, key))) }), _jsx("div", { className: "ls-gis-filter-label", children: "RECORD STATUS" }), _jsxs("select", { className: "ls-gis-select", value: status, onChange: (e) => {
                                            setStatus(e.target.value);
                                            setSelectedId("");
                                        }, children: [_jsx("option", { value: "ALL", children: "All Statuses" }), _jsx("option", { value: "VERIFIED", children: "Verified" }), _jsx("option", { value: "APPROVED", children: "Approved" }), _jsx("option", { value: "PENDING", children: "Pending" }), _jsx("option", { value: "REVIEW", children: "Review" }), _jsx("option", { value: "RESTRICTED", children: "Restricted" })] })] }), _jsxs("div", { className: "ls-gis-stat-card", children: [_jsxs("div", { children: [_jsx("span", { children: "VISIBLE PARCELS" }), _jsx("strong", { children: filtered.length })] }), _jsx(LandPlot, { size: 27 })] }), selectedParcel ? (_jsxs("div", { className: "ls-gis-details-card", children: [_jsxs("div", { className: "ls-gis-details-header", children: [_jsxs("div", { children: [_jsx("span", { children: "SELECTED PARCEL" }), _jsx("h2", { children: selectedParcel.ulpin || "Parcel" })] }), _jsx("button", { onClick: () => setSelectedId(""), children: _jsx(X, { size: 18 }) })] }), _jsxs("div", { className: "ls-gis-selected-use", style: {
                                            color: useColor(selectedParcel.land_use),
                                            borderColor: useColor(selectedParcel.land_use),
                                        }, children: [_jsx("span", { style: {
                                                    background: useColor(selectedParcel.land_use),
                                                } }), useLabel(selectedParcel.land_use)] }), _jsxs("div", { className: "ls-gis-owner-block", children: [_jsx(UserRound, { size: 18 }), _jsxs("div", { children: [_jsx("span", { children: "Owner" }), _jsx("strong", { children: selectedParcel.owner ||
                                                            selectedParcel.owner_name ||
                                                            "Not available" })] })] }), _jsxs("div", { className: "ls-gis-detail-grid", children: [_jsxs("div", { children: [_jsx("span", { children: "Area" }), _jsxs("strong", { children: [selectedParcel.area ?? "â€”", " ", selectedParcel.area_unit || ""] })] }), _jsxs("div", { children: [_jsx("span", { children: "Status" }), _jsx("strong", { children: selectedParcel.status ||
                                                            selectedParcel.registration_status ||
                                                            "â€”" })] }), _jsxs("div", { children: [_jsx("span", { children: "Survey No." }), _jsx("strong", { children: selectedParcel.survey_number || "â€”" })] }), _jsxs("div", { children: [_jsx("span", { children: "Khasra No." }), _jsx("strong", { children: selectedParcel.khasra_number || "â€”" })] }), _jsxs("div", { children: [_jsx("span", { children: "Village" }), _jsx("strong", { children: selectedParcel.village || "â€”" })] }), _jsxs("div", { children: [_jsx("span", { children: "District" }), _jsx("strong", { children: selectedParcel.district || "â€”" })] }), _jsxs("div", { children: [_jsx("span", { children: "RoR" }), _jsx("strong", { children: selectedParcel.ror_status || "â€”" })] }), _jsxs("div", { children: [_jsx("span", { children: "Registration" }), _jsx("strong", { children: selectedParcel.registration_status || "â€”" })] }), _jsxs("div", { children: [_jsx("span", { children: "Encumbrance" }), _jsx("strong", { children: selectedParcel.encumbrance_status || "â€”" })] }), _jsxs("div", { children: [_jsx("span", { children: "Tax" }), _jsx("strong", { children: selectedParcel.tax_status || "â€”" })] })] }), _jsxs("div", { className: "ls-gis-location-box", children: [_jsx(MapPinned, { size: 17 }), _jsxs("div", { children: [_jsx("strong", { children: selectedParcel.locality ||
                                                            selectedParcel.village ||
                                                            "Locality" }), _jsx("span", { children: [
                                                            selectedParcel.village,
                                                            selectedParcel.tehsil,
                                                            selectedParcel.district,
                                                            selectedParcel.state,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(" â€¢ ") })] })] }), _jsx(CadastralIntelligencePanel, { parcel: selectedParcel, feature: selected, features: geo.features, onSelect: (id) => setSelectedId(id) }), _jsxs("button", { className: "ls-gis-view-details", onClick: () => navigate(`/parcels/${selectedParcel.id}`), children: [_jsx(FileText, { size: 18 }), "View Complete Parcel Record", _jsx(ChevronRight, { size: 17 })] })] })) : (_jsxs("div", { className: "ls-gis-help-card", children: [_jsx(MapIcon, { size: 30 }), _jsx("h3", { children: "Select a parcel" }), _jsx("p", { children: "Click a colourful parcel marker or the transparent parcel boundary to inspect the connected record." })] }))] }), _jsxs("div", { className: "ls-gis-map-shell", children: [_jsxs("div", { className: "ls-gis-map-toolbar", children: [_jsxs("div", { className: "ls-gis-map-mode", children: [_jsxs("button", { className: !satellite ? "active" : "", onClick: () => setSatellite(false), children: [_jsx(MapIcon, { size: 17 }), "Road Map"] }), _jsxs("button", { className: satellite ? "active" : "", onClick: () => setSatellite(true), children: [_jsx(Satellite, { size: 17 }), "Satellite"] }), _jsxs("button", { className: localDetail ? "active" : "", onClick: () => setLocalDetail((v) => !v), title: "Show detailed roads, localities and nearby places", children: [_jsx(MapPinned, { size: 17 }), "Local Detail"] })] }), _jsxs("div", { className: "ls-gis-map-count", children: [filtered.length, " parcel", filtered.length === 1 ? "" : "s", " shown"] })] }), _jsxs(MapContainer, { center: [22.5, 79], zoom: 5, minZoom: 4, maxZoom: 19, scrollWheelZoom: true, className: "ls-gis-map", children: [!satellite ? (_jsx(TileLayer, { attribution: "\u00A9 OpenStreetMap contributors", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", maxZoom: 19 })) : (_jsxs(_Fragment, { children: [_jsx(TileLayer, { attribution: "Tiles \u00A9 Esri", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", maxZoom: 19, maxNativeZoom: 19 }), _jsx(TileLayer, { attribution: "Transportation \u00A9 Esri, HERE, Garmin, and contributors", url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", maxZoom: 19, opacity: 0.95 }), _jsx(TileLayer, { attribution: "", url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}", maxZoom: 19, opacity: 0.9 }), _jsx(TileLayer, { attribution: "", url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", maxZoom: 19, opacity: 0.92 })] })), filtered.length > 0 && (_jsx(GeoJSON, { data: { type: "FeatureCollection", features: filtered }, style: (feature) => {
                                            const id = String(feature?.properties?.id ??
                                                feature?.properties?.ulpin);
                                            const selectedParcel = id === selectedId;
                                            const c = useColor(feature?.properties?.land_use);
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
                                        }, onEachFeature: (feature, layer) => {
                                            layer.on({
                                                click: () => {
                                                    setSelectedId(String(feature.properties?.id ??
                                                        feature.properties?.ulpin));
                                                },
                                            });
                                        } }, `${landUse}-${status}-${search}-${selectedId}`)), filtered.map((feature) => {
                                        const p = feature.properties || {};
                                        const id = String(p.id ??
                                            p.ulpin ??
                                            `${latOf(p)}-${lonOf(p)}`);
                                        const lat = latOf(p);
                                        const lon = lonOf(p);
                                        if (!lat || !lon) {
                                            return null;
                                        }
                                        return (_jsx(Marker, { position: [lat, lon], icon: markerIcon(useColor(p.land_use), id === selectedId), eventHandlers: {
                                                click: () => setSelectedId(id),
                                            }, children: _jsx(Popup, { autoPan: true, children: _jsx(PopupCard, { parcel: p, navigate: navigate }) }) }, `${id}-${selectedId}`));
                                    }), _jsx(LocalOSMContext, { enabled: localDetail }), _jsx(ParcelAreaTiles, { features: filtered }), _jsx(MapController, { selected: selected, features: filtered, fitVersion: fitVersion })] }), _jsxs("div", { className: "ls-gis-legend", children: [_jsxs("div", { className: "ls-gis-legend-title", children: [_jsx(Layers3, { size: 17 }), "Land Use"] }), [
                                        ["RESIDENTIAL", "Residential"],
                                        ["AGRICULTURAL", "Agricultural"],
                                        ["COMMERCIAL", "Commercial"],
                                        ["INDUSTRIAL", "Industrial"],
                                        ["OTHER", "Other"],
                                    ].map(([key, label]) => (_jsxs("div", { className: "ls-gis-legend-item", children: [_jsx("span", { style: {
                                                    background: useColor(key),
                                                } }), label] }, key)))] }), _jsxs("div", { className: "ls-gis-map-notice", children: [_jsx(ShieldCheck, { size: 15 }), "Demo / Synthetic GIS Data \u2014 Not an Official Cadastral Map"] }), loading && (_jsxs("div", { className: "ls-gis-overlay", children: [_jsx(RefreshCw, { size: 24, className: "ls-gis-spin" }), "Loading parcel map\u2026"] })), error && (_jsxs("div", { className: "ls-gis-error", children: [_jsx("strong", { children: "GIS data could not be loaded" }), _jsx("span", { children: error }), _jsx("button", { onClick: loadMap, children: "Try Again" })] })), !loading &&
                                !error &&
                                filtered.length === 0 && (_jsxs("div", { className: "ls-gis-empty-map", children: [_jsx(LandPlot, { size: 36 }), _jsx("h3", { children: "No parcels found" }), _jsx("p", { children: "Change the search or land-use filter." })] }))] })] })] }));
}

