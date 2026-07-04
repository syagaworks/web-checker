import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import type { Spot, SpotSet } from "./types";
import { fetchWikiDetails, type WikiDetails } from "./wiki";

type Props = {
  set: SpotSet;
  visited?: Set<string>;
  selectedId?: string;
  onSelect?: (spot: Spot) => void;
  compact?: boolean;
};

function markerHtml(color: string, visited: boolean) {
  return `<span class="map-marker ${visited ? "map-marker-visited" : ""}" style="--marker-color:${visited ? "#171717" : color}"></span>`;
}

export function MapPanel({ set, visited = new Set(), selectedId, onSelect, compact = false }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [activeSpot, setActiveSpot] = useState<Spot>(() => set.spots.find((spot) => spot.id === selectedId) ?? set.spots[0]);
  const [details, setDetails] = useState<WikiDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [wikiError, setWikiError] = useState(false);

  const categoryById = useMemo(() => new Map(set.categories.map((category) => [category.id, category])), [set.categories]);

  useEffect(() => {
    if (!nodeRef.current || mapRef.current) return;

    const map = L.map(nodeRef.current, {
      center: set.mapCenter,
      zoom: set.mapZoom,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [set.mapCenter, set.mapZoom]);

  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.clearLayers();

    set.spots.forEach((spot) => {
      const category = categoryById.get(spot.access);
      const isVisited = visited.has(spot.id);
      const marker = L.marker([spot.lat, spot.lng], {
        icon: L.divIcon({
          className: "",
          html: markerHtml(category?.color ?? "#666", isVisited),
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
        title: spot.name,
      });

      marker.on("click", () => {
        setActiveSpot(spot);
        onSelect?.(spot);
      });
      marker.addTo(layerRef.current!);
    });
  }, [categoryById, onSelect, set.spots, visited]);

  useEffect(() => {
    const next = set.spots.find((spot) => spot.id === selectedId);
    if (next) setActiveSpot(next);
  }, [selectedId, set.spots]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setWikiError(false);

    fetchWikiDetails(activeSpot.wikiQuery)
      .then((nextDetails) => {
        if (!ignore) setDetails(nextDetails);
      })
      .catch(() => {
        if (!ignore) {
          setDetails(null);
          setWikiError(true);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [activeSpot]);

  const category = categoryById.get(activeSpot.access);

  return (
    <section className={`map-panel ${compact ? "map-panel-compact" : ""}`} aria-label="道路マップ">
      <div className="map-wrap">
        <div ref={nodeRef} className="leaflet-host" />
        <div className="legend" aria-label="凡例">
          {set.categories.map((item) => (
            <span key={item.id}>
              <i style={{ backgroundColor: item.color }} />
              {item.shortLabel}
            </span>
          ))}
          {visited.size > 0 && (
            <span>
              <i className="visited-dot" />
              踏破済み
            </span>
          )}
        </div>
      </div>

      {!compact && (
        <aside className="spot-detail" aria-live="polite">
          <div className="spot-detail-heading">
            <p>No.{activeSpot.number}</p>
            <h2>{activeSpot.name}</h2>
            <span style={{ borderColor: category?.color, color: category?.color }}>{category?.label}</span>
          </div>

          <div className="spot-photo">
            {loading && <div className="photo-placeholder">読み込み中</div>}
            {!loading && details?.imageUrl && <img src={details.imageUrl} alt={`${activeSpot.name}の参考写真`} />}
            {!loading && !details?.imageUrl && <div className="photo-placeholder">Wikipedia画像なし</div>}
          </div>

          <div className="spot-copy">
            <p>
              {details?.extract ||
                `${activeSpot.area}の${activeSpot.scene}として選ばれている道です。代表地点は地図表示のために道路・峠・半島・展望地の中心付近へ置いています。`}
            </p>
            {activeSpot.accessNote && <p className="note">{activeSpot.accessNote}</p>}
            {wikiError && <p className="note">Wikipedia情報を取得できませんでした。</p>}
          </div>

          <dl className="meta-grid">
            <div>
              <dt>地域</dt>
              <dd>{activeSpot.area}</dd>
            </div>
            <div>
              <dt>景観</dt>
              <dd>{activeSpot.scene}</dd>
            </div>
          </dl>

          <div className="attribution">
            {details ? (
              <>
                <a href={details.pageUrl} target="_blank" rel="noreferrer">
                  Wikipedia「{details.title}」
                </a>
                {details.imagePageUrl && (
                  <>
                    <br />
                    写真:
                    <a href={details.imagePageUrl} target="_blank" rel="noreferrer">
                      Wikimedia Commons
                    </a>
                    {details.imageArtist && ` / ${details.imageArtist}`}
                    {details.imageLicense && (
                      <>
                        {" / "}
                        {details.imageLicenseUrl ? (
                          <a href={details.imageLicenseUrl} target="_blank" rel="noreferrer">
                            {details.imageLicense}
                          </a>
                        ) : (
                          details.imageLicense
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              "紹介文と写真はWikipedia/Wikimedia Commonsを参照します。"
            )}
          </div>
        </aside>
      )}
    </section>
  );
}
