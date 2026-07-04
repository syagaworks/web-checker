import { Check, ExternalLink, Home, MapPinned, Save, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MapPanel } from "./MapPanel";
import { hyakumeido2020 } from "./data/hyakumeido2020";
import { absoluteResultUrl, decodeSelection, encodeSelection, loadSelection, resultPath, saveSelection } from "./storage";
import type { AccessCategoryId, Spot } from "./types";

const set = hyakumeido2020;

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || "#/");

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const [path, queryString = ""] = hash.slice(1).split("?");
  return {
    path: path || "/",
    params: new URLSearchParams(queryString),
  };
}

function countByCategory(visited: Set<string>) {
  const counts = new Map<AccessCategoryId, number>();
  set.spots.forEach((spot) => {
    if (visited.has(spot.id)) counts.set(spot.access, (counts.get(spot.access) ?? 0) + 1);
  });
  return counts;
}

function totalByCategory() {
  const totals = new Map<AccessCategoryId, number>();
  set.spots.forEach((spot) => totals.set(spot.access, (totals.get(spot.access) ?? 0) + 1));
  return totals;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell">
      {children}
      <footer className="footer">
        <p>{set.footerNotice}</p>
        <p>
          道名一覧の参照元:
          <a href={set.sourceUrl} target="_blank" rel="noreferrer">
            {set.sourceLabel}
          </a>
        </p>
      </footer>
    </div>
  );
}

function HomePage() {
  return (
    <Shell>
      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">非公式トラッカー</p>
            <h1>{set.title}</h1>
            <p>{set.intro}</p>
          </div>
        </section>

        <MapPanel set={set} />

        <div className="primary-action-row">
          <a className="primary-action" href="#/record">
            <MapPinned size={22} />
            記録を作成する
          </a>
        </div>
      </main>
    </Shell>
  );
}

function RecordPage() {
  const [visited, setVisited] = useState<Set<string>>(() => loadSelection(set));

  const toggle = (spot: Spot) => {
    setVisited((current) => {
      const next = new Set(current);
      if (next.has(spot.id)) next.delete(spot.id);
      else next.add(spot.id);
      return next;
    });
  };

  const save = () => {
    const encoded = saveSelection(set, visited);
    window.location.hash = resultPath(encoded);
  };

  return (
    <Shell>
      <main className="page-stack">
        <nav className="top-nav">
          <a href="#/">
            <Home size={18} />
            ホーム
          </a>
        </nav>

        <section className="page-heading">
          <p className="eyebrow">踏破記録</p>
          <h1>走った道を選択</h1>
          <p>この端末に保存済みの記録を読み込んでいます。保存するまで変更は反映されません。</p>
        </section>

        <div className="record-toolbar">
          <strong>{visited.size} / {set.spots.length} 本</strong>
          <div>
            <button type="button" className="ghost-button" onClick={() => setVisited(new Set(set.spots.map((spot) => spot.id)))}>
              すべて選択
            </button>
            <button type="button" className="ghost-button" onClick={() => setVisited(new Set())}>
              クリア
            </button>
          </div>
        </div>

        <section className="spot-grid" aria-label="百名道選択リスト">
          {set.spots.map((spot) => {
            const category = set.categories.find((item) => item.id === spot.access);
            const checked = visited.has(spot.id);
            return (
              <button
                key={spot.id}
                type="button"
                className={`spot-card ${checked ? "spot-card-active" : ""}`}
                onClick={() => toggle(spot)}
                aria-pressed={checked}
              >
                <span className="spot-number">{spot.number}</span>
                <span className="spot-name">{spot.name}</span>
                <span className="spot-card-meta">
                  {spot.area} / {spot.scene}
                </span>
                <span className="spot-chip" style={{ color: category?.color, borderColor: category?.color }}>
                  {category?.shortLabel}
                </span>
                {checked && <Check className="card-check" size={20} />}
              </button>
            );
          })}
        </section>

        <div className="sticky-save">
          <button type="button" className="primary-action" onClick={save}>
            <Save size={22} />
            保存して確認する
          </button>
        </div>
      </main>
    </Shell>
  );
}

function ResultPage({ encoded }: { encoded: string | null }) {
  const visited = useMemo(() => (encoded ? decodeSelection(set, encoded) : loadSelection(set)), [encoded]);
  const encodedForShare = useMemo(() => encoded ?? encodeSelection(set, visited), [encoded, visited]);
  const counts = countByCategory(visited);
  const totals = totalByCategory();
  const shareUrl = absoluteResultUrl(encodedForShare);
  const tweetText = set.shareText(visited.size);
  const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <Shell>
      <main className="page-stack">
        <nav className="top-nav">
          <a href="#/">
            <Home size={18} />
            ホーム
          </a>
          <a href="#/record">
            <MapPinned size={18} />
            記録を編集
          </a>
        </nav>

        <section className="page-heading">
          <p className="eyebrow">{encoded ? "共有された確認画面" : "保存済み記録"}</p>
          <h1>{set.shareText(visited.size)}</h1>
          <p>
            {encoded
              ? "URL内の共有データを表示しています。この画面を開いても、あなたの端末の保存記録は上書きされません。"
              : "この端末に保存された記録を表示しています。"}
          </p>
        </section>

        <MapPanel set={set} visited={visited} compact />

        <section className="summary-panel" aria-label="踏破数">
          {set.categories.map((category) => {
            const count = counts.get(category.id) ?? 0;
            const total = totals.get(category.id) ?? 0;
            const percent = total === 0 ? 0 : Math.floor((count / total) * 100);
            return (
              <article key={category.id} className="summary-card">
                <span className="summary-dot" style={{ backgroundColor: category.color }} />
                <h2>{category.label}</h2>
                <strong>
                  {count} / {total} 本
                </strong>
                <p>{percent}% 踏破</p>
              </article>
            );
          })}
        </section>

        <div className="share-row">
          <a className="x-share" href={tweetUrl} target="_blank" rel="noreferrer">
            <Share2 size={22} />
            Xに投稿する
            <ExternalLink size={16} />
          </a>
          <p>投稿前にX側の画面で内容を確認できます。</p>
        </div>
      </main>
    </Shell>
  );
}

export function App() {
  const { path, params } = useHashRoute();

  if (path === "/record") return <RecordPage />;
  if (path === "/result") return <ResultPage encoded={params.get("r")} />;
  return <HomePage />;
}
