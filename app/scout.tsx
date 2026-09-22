"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Building2,
  ChartNoAxesCombined,
  Check,
  ChevronLeft,
  Compass,
  GitCompareArrows,
  Info,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
  Trash2,
  Calculator,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import {
  Market,
  markets,
  val,
  grossYield,
  confidence,
  MetricKey,
} from "@/lib/demo";
import { score, weights, peers } from "@/lib/scoring";
import { defaults, Property, Scenario } from "@/lib/finance";
import type { Saved } from "@/lib/store";
import Analyzer from "./analyzer";
import { median } from "@/lib/statistics";
import {ensureSession} from '@/lib/client-session';
import Research from './research';
const Map = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => <div className="map loading">Loading opportunity map…</div>,
});
const money = (n: number | null) =>
  n === null
    ? "Unavailable"
    : n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });
const num = (n: number | null, suffix = "%") =>
  n === null ? "Unavailable" : n.toFixed(1) + suffix;
const confLabel = (n: number) =>
  n >= 80 ? "High" : n >= 60 ? "Moderate" : "Low";
const metricLabels: Record<MetricKey, string> = {
  price: "Purchase-price indicator",
  rent: "Monthly rent indicator",
  vacancy: "Rental vacancy",
  population: "Population change",
  employment: "Employment change",
  tax: "Annual tax assumption",
  priceTrend: "Price change",
  rentTrend: "Rent change",
};
type Page =
  | "Discover"
  | "Market detail"
  | "Compare"
  | "Property analyzer"
  | "Watchlist"
  | "Methodology"
  | "Research";
export default function Scout() {
  const [page, setPage] = useState<Page>("Discover"),
    [selected, setSelected] = useState("rockford"),
    [compare, setCompare] = useState<string[]>([]),
    [saved, setSaved] = useState<Saved[]>([]),
    [storageError, setStorageError] = useState(""),
    [toast, setToast] = useState(""),
    [search, setSearch] = useState(""),
    [state, setState] = useState("All states"),
    [maxPrice, setMaxPrice] = useState(500000),
    [minPrice, setMinPrice] = useState(0),
    [minYield, setMinYield] = useState(0),
    [maxVacancy, setMaxVacancy] = useState(100),
    [minScore, setMinScore] = useState(0),
    [minConfidence, setMinConfidence] = useState(0),
    [view, setView] = useState("Opportunity"),
    [sort, setSort] = useState("score"),
    [ascending, setAscending] = useState(false),
    [advanced, setAdvanced] = useState(false),
    [property, setProperty] = useState<Property>(defaults),
    [editId, setEditId] = useState<string | undefined>(),
    [savedScenarios, setSavedScenarios] = useState<
      Record<string, Scenario> | undefined
    >(),
    [editorKey, setEditorKey] = useState(0),
    [loaded, setLoaded] = useState(false);
  async function load() {
    try {
      await ensureSession();
      const r = await fetch("/api/watchlist");
      if (!r.ok)
        throw new Error(
          "Saved research could not load. Check the storage configuration, then retry.",
        );
      setSaved(await r.json());
      setStorageError("");
    } catch (e) {
      setStorageError((e as Error).message);
    } finally {
      setLoaded(true);
    }
  }
  useEffect(() => {
    load();
    const sync = () => {
      const url = new URL(location.href),
        p = url.searchParams.get("view") as Page;
      if (
        [
          "Discover",
          "Market detail",
          "Compare",
          "Property analyzer",
          "Watchlist",
          "Methodology",
          "Research",
        ].includes(p)
      )
        setPage(p);
      const id = url.searchParams.get("market");
      if (id && markets.some((m) => m.id === id)) setSelected(id);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  function go(p: Page, id?: string) {
    setPage(p);
    if (id) setSelected(id);
    const url = new URL(location.href);
    url.searchParams.set("view", p);
    if (id) url.searchParams.set("market", id);
    history.pushState({}, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save(x: Saved) {
    const r = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(x),
    });
    if (!r.ok) {
      const body = await r.json();
      throw new Error(body.error || "Save failed");
    }
    await load();
    setToast("Saved to your watchlist.");
  }
  async function saveMarket(m: Market) {
    try {
      await save({
        id: "market-" + m.id,
        kind: "market",
        name: m.name + ", " + m.state,
        marketId: m.id,
        notes: saved.find((x) => x.id === "market-" + m.id)?.notes || "",
      });
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  async function remove(id: string) {
    try {
      const r = await fetch("/api/watchlist?id=" + encodeURIComponent(id), {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("Could not remove item.");
      await load();
      setToast("Removed from watchlist.");
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  function toggle(id: string) {
    if (compare.includes(id)) setCompare(compare.filter((x) => x !== id));
    else if (compare.length < 4) setCompare([...compare, id]);
    else
      setToast(
        "You can compare up to four markets. Remove one to add another.",
      );
  }
  function analyze(m?: Market) {
    setProperty(
      m
        ? {
            ...defaults,
            market: m.name,
            price: val(m, "price") || defaults.price,
            rent: val(m, "rent") || defaults.rent,
            taxes:
              ((val(m, "price") || defaults.price) * (val(m, "tax") || 2)) /
              100,
          }
        : defaults,
    );
    setEditId(undefined);
    setSavedScenarios(undefined);
    setEditorKey((x) => x + 1);
    go("Property analyzer");
  }
  const filtered = useMemo(
    () =>
      markets
        .filter(
          (m) =>
            (state === "All states" || m.state === state) &&
            (m.name + " " + m.county)
              .toLowerCase()
              .includes(search.toLowerCase()) &&
            (val(m, "price") ?? Infinity) <= maxPrice &&
            (val(m, "price") ?? -Infinity) >= minPrice &&
            (minYield === 0 || (grossYield(m) ?? -1) >= minYield) &&
            (maxVacancy === 100 ||
              (val(m, "vacancy") ?? Infinity) <= maxVacancy) &&
            (minScore === 0 || (score(m, markets).total ?? -1) >= minScore) &&
            confidence(m) >= minConfidence,
        )
        .sort((a, b) => {
          const get = (m: Market) =>
            sort === "name"
              ? m.name
              : sort === "price"
                ? val(m, "price")
                : sort === "yield"
                  ? grossYield(m)
                  : sort === "vacancy"
                    ? val(m, "vacancy")
                    : sort === "confidence"
                      ? confidence(m)
                      : score(m, markets).total;
          const aa = get(a),
            bb = get(b);
          if (aa === null) return bb === null ? 0 : 1;
          if (bb === null) return -1;
          return (
            (typeof aa === "string"
              ? aa.localeCompare(String(bb))
              : Number(aa) - Number(bb)) * (ascending ? 1 : -1)
          );
        }),
    [
      state,
      search,
      maxPrice,
      minPrice,
      minYield,
      maxVacancy,
      minScore,
      minConfidence,
      sort,
      ascending,
    ],
  );
  const m = markets.find((x) => x.id === selected) || markets[0],
    s = score(m, markets),
    picked = compare.map((id) => markets.find((x) => x.id === id)!);
  function reset() {
    setSearch("");
    setState("All states");
    setMinPrice(0);
    setMaxPrice(500000);
    setMinYield(0);
    setMaxVacancy(100);
    setMinScore(0);
    setMinConfidence(0);
  }
  const nav: [Page, typeof Compass][] = [
    ["Research", MessageSquare],
    ["Discover", Compass],
    ["Compare", GitCompareArrows],
    ["Property analyzer", Calculator],
    ["Watchlist", Bookmark],
  ];
  function card(m: Market) {
    const ss = score(m, markets).total;
    return (
      <article className="market-card" key={m.id}>
        <div className="section-heading">
          <span className="state-tag">{m.state} · CITY</span>
          <button
            className="icon-button"
            aria-label={"Save " + m.name}
            onClick={() => saveMarket(m)}
          >
            <Bookmark
              size={17}
              fill={
                saved.some((x) => x.id === "market-" + m.id)
                  ? "currentColor"
                  : "none"
              }
            />
          </button>
        </div>
        <button
          className="market-title"
          onClick={() => go("Market detail", m.id)}
        >
          {m.name}
          <ArrowUpRight size={19} />
        </button>
        <p>{m.county} County context</p>
        <div className="card-metrics">
          <div>
            Price indicator<strong>{money(val(m, "price"))}</strong>
          </div>
          <div>
            Gross yield proxy<strong>{num(grossYield(m))}</strong>
          </div>
        </div>
        <div className="card-foot">
          <span>
            Rent {money(val(m, "rent"))}/mo · {num(val(m, "rentTrend"))} change
          </span>
          <span className="score-pill">{ss ?? "—"}</span>
        </div>
        <div className="muted small">
          {confLabel(confidence(m))} demo completeness · synthetic
        </div>
      </article>
    );
  }
  return (
    <div className="app">
      <aside className="sidebar">
        <a
          className="brand"
          href="?view=Discover"
          onClick={(e) => {
            e.preventDefault();
            go("Discover");
          }}
        >
          <span className="brand-icon">
            <Building2 size={25} />
          </span>
          <span>
            Midwest<span>Property Scout</span>
          </span>
        </a>
        <div className="workspace-label">RESEARCH WORKSPACE</div>
        <nav>
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              className={
                page === name ||
                (name === "Discover" && page === "Market detail")
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => go(name)}
            >
              <Icon size={19} />
              {name}
              {name === "Compare" && compare.length > 0 && (
                <span className="nav-count">{compare.length}</span>
              )}
              {name === "Watchlist" && saved.length > 0 && (
                <span className="nav-count">{saved.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={page === "Methodology" ? "nav-item active" : "nav-item"}
            onClick={() => go("Methodology")}
          >
            <BookOpen size={18} /> Data & methodology
          </button>
          <div className="region-box">
            <MapPin size={17} />
            <div>
              Wisconsin & Illinois<small>24 demo markets · city level</small>
            </div>
          </div>
          <div className="local-user">
            <span>LS</span>
            <div>
              Local workspace<small>Single-user · saved on this machine</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            Workspace <span>/</span> <strong>{page}</strong>
          </div>
          <span className="local-badge">
            <span /> Local mode
          </span>
        </header>
        <div className="demo-banner">
          <Info size={16} />
          <b>Demo — synthetic data</b>
          <span>
            Illustrative research signals. No live listings or investment
            recommendations.
          </span>
          <button onClick={() => go("Methodology")}>
            About the data <ArrowUpRight size={14} />
          </button>
        </div>
        <main>
          {page === "Discover" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">FIND YOUR NEXT MARKET</div>
                  <h1>A better place to start.</h1>
                  <p>
                    Explore rental economics, demand, and risk across Wisconsin
                    and Illinois.
                  </p>
                </div>
                <button
                  onClick={() => go("Compare")}
                  disabled={compare.length === 0}
                >
                  <GitCompareArrows size={17} /> Compare markets{" "}
                  {compare.length > 0 && `(${compare.length})`}
                </button>
              </div>
              <div className="overview-grid">
                <div>
                  <span>Markets in view</span>
                  <strong>
                    {filtered.length}
                    <small> / 24</small>
                  </strong>
                  <p>Wisconsin & Illinois</p>
                </div>
                <div>
                  <span>Median price indicator</span>
                  <strong>
                    {money(
                      median(
                        filtered
                          .map((x) => val(x, "price")!)
                          .filter((x) => x !== null),
                      ),
                    )}
                  </strong>
                  <p>Synthetic city-level indicator</p>
                </div>
                <div>
                  <span>Median gross yield proxy</span>
                  <strong>
                    {num(
                      median(
                        filtered
                          .map((x) => grossYield(x)!)
                          .filter((x) => x !== null),
                      ),
                    )}
                  </strong>
                  <p>Before operating costs & financing</p>
                </div>
                <div className="overview-note">
                  <ChartNoAxesCombined size={24} />
                  <b>Price is only the beginning.</b>
                  <p>
                    Use yield, demand, and cost signals together. Verify every
                    property.
                  </p>
                </div>
              </div>
              <section className="filters panel">
                <div className="filter-top">
                  <label className="search">
                    <Search size={18} />
                    <input
                      aria-label="Search town or county"
                      placeholder="Search a town or county…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  <label className="compact-label">
                    State
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    >
                      <option>All states</option>
                      <option>WI</option>
                      <option>IL</option>
                    </select>
                  </label>
                  <label className="compact-label">
                    Max price
                    <select
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                    >
                      {[150000, 200000, 250000, 300000, 400000, 500000].map(
                        (n) => (
                          <option key={n} value={n}>
                            {money(n)}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <button
                    className={advanced ? "selected" : ""}
                    onClick={() => setAdvanced(!advanced)}
                    aria-expanded={advanced}
                  >
                    <SlidersHorizontal size={16} /> Filters
                  </button>
                  <button className="text-button" onClick={reset}>
                    Reset
                  </button>
                </div>
                {advanced && (
                  <div className="advanced-filters">
                    {(
                      [
                        ["Minimum price", minPrice, setMinPrice, "$"],
                        ["Minimum yield", minYield, setMinYield, "%"],
                        ["Maximum vacancy", maxVacancy, setMaxVacancy, "%"],
                        ["Minimum score", minScore, setMinScore, "/100"],
                        [
                          "Minimum confidence",
                          minConfidence,
                          setMinConfidence,
                          "%",
                        ],
                      ] as [string, number, (n: number) => void, string][]
                    ).map(([label, value, set, unit]) => (
                      <label key={label}>
                        {label} ({unit})
                        <input
                          type="number"
                          min="0"
                          max={unit === "$" ? 500000 : 100}
                          value={value}
                          onChange={(e) => set(Number(e.target.value))}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </section>
              <section className="explore-grid">
                <div className="panel map-panel">
                  <div className="section-heading">
                    <h2>Opportunity map</h2>
                    <div className="segmented">
                      {["Opportunity", "Rental yield", "Market risk"].map(
                        (x) => (
                          <button
                            key={x}
                            onClick={() => setView(x)}
                            className={view === x ? "selected" : ""}
                          >
                            {x}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                  <Map
                    items={filtered}
                    all={markets}
                    selected={selected}
                    onSelect={setSelected}
                    view={view}
                  />
                  <div className="map-footer">
                    <span>
                      <i className="dot green" />{" "}
                      {view === "Market risk"
                        ? "Lower vacancy"
                        : "Stronger signal"}{" "}
                      <i
                        className={
                          view === "Market risk" ? "dot orange" : "dot blue"
                        }
                      />{" "}
                      {view === "Market risk"
                        ? "Higher vacancy"
                        : "Other signal"}{" "}
                      <i className="dot gray" /> Missing
                    </span>
                    <span>Synthetic · city markers</span>
                  </div>
                </div>
                <aside className="panel focus-card">
                  <div className="eyebrow">
                    {filtered.some((x) => x.id === m.id)
                      ? "SELECTED MARKET"
                      : "SELECT A VISIBLE MARKET"}
                  </div>
                  {filtered.some((x) => x.id === m.id) ? (
                    <>
                      <div className="focus-title">
                        <div>
                          <h2>{m.name}</h2>
                          <p>{m.state} · city/place</p>
                        </div>
                        <span className="score-big">
                          {s.total ?? "—"}
                          <small>/ 100</small>
                        </span>
                      </div>
                      <div className="confidence">
                        <span>{confLabel(confidence(m))} demo confidence</span>
                        <b>{confidence(m)}%</b>
                        <div>
                          <i style={{ width: confidence(m) + "%" }} />
                        </div>
                      </div>
                      <dl className="statement">
                        <div>
                          <dt>Price indicator</dt>
                          <dd>{money(val(m, "price"))}</dd>
                        </div>
                        <div>
                          <dt>Monthly rent indicator</dt>
                          <dd>{money(val(m, "rent"))}</dd>
                        </div>
                        <div>
                          <dt>Gross yield proxy</dt>
                          <dd className="positive">{num(grossYield(m))}</dd>
                        </div>
                        <div>
                          <dt>Rental vacancy</dt>
                          <dd>{num(val(m, "vacancy"))}</dd>
                        </div>
                      </dl>
                      <p className="focus-insight">
                        {s.total === null
                          ? "Missing demand or cost data prevents a reliable demo rank."
                          : `The ${num(grossYield(m))} gross yield proxy is a starting point. Factor in the ${num(val(m, "tax"))} annual tax assumption and ${num(val(m, "vacancy"))} vacancy.`}
                      </p>
                      <button
                        className="primary full"
                        onClick={() => go("Market detail", m.id)}
                      >
                        Explore market <ArrowRight size={17} />
                      </button>
                      <button className="full" onClick={() => toggle(m.id)}>
                        {compare.includes(m.id) ? (
                          <Check size={16} />
                        ) : (
                          <GitCompareArrows size={16} />
                        )}{" "}
                        {compare.includes(m.id)
                          ? "Added to comparison"
                          : "Add to comparison"}
                      </button>
                    </>
                  ) : (
                    <p>
                      Choose a marker or table row to inspect a market matching
                      your filters.
                    </p>
                  )}
                </aside>
              </section>
              <section className="panel market-table">
                <div className="section-heading">
                  <div>
                    <h2>
                      Markets worth a closer look{" "}
                      <span className="count">{filtered.length}</span>
                    </h2>
                    <p>
                      Research signals, not verified property returns · all
                      metrics synthetic
                    </p>
                  </div>
                  <label className="sort-label">
                    Sort by
                    <select
                      aria-label="Sort markets"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="score">Opportunity score</option>
                      <option value="name">Market name</option>
                      <option value="price">Price</option>
                      <option value="yield">Rental yield</option>
                      <option value="vacancy">Vacancy</option>
                      <option value="confidence">Confidence</option>
                    </select>
                    <button
                      aria-label="Reverse sort order"
                      onClick={() => setAscending(!ascending)}
                    >
                      {ascending ? "↑" : "↓"}
                    </button>
                  </label>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Compare</th>
                        <th>Market</th>
                        <th>Price indicator</th>
                        <th>Rent / mo</th>
                        <th>Gross yield</th>
                        <th>Vacancy</th>
                        <th>Score</th>
                        <th>Confidence</th>
                        <th>Save</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((mm) => (
                        <tr
                          key={mm.id}
                          className={selected === mm.id ? "selected-row" : ""}
                        >
                          <td>
                            <input
                              type="checkbox"
                              aria-label={"Compare " + mm.name}
                              checked={compare.includes(mm.id)}
                              onChange={() => toggle(mm.id)}
                            />
                          </td>
                          <td>
                            <button
                              className="table-market"
                              onClick={() => {
                                setSelected(mm.id);
                              }}
                              onDoubleClick={() => go("Market detail", mm.id)}
                            >
                              {mm.name}
                              <small>
                                {mm.state} · {mm.county} County · city
                              </small>
                            </button>
                            <button
                              className="detail-link"
                              onClick={() => go("Market detail", mm.id)}
                            >
                              View details <ArrowUpRight size={12} />
                            </button>
                          </td>
                          <td>{money(val(mm, "price"))}</td>
                          <td>{money(val(mm, "rent"))}</td>
                          <td className="positive">{num(grossYield(mm))}</td>
                          <td>{num(val(mm, "vacancy"))}</td>
                          <td>
                            <span className="score-pill">
                              {score(mm, markets).total ?? "Insufficient data"}
                            </span>
                          </td>
                          <td>
                            <span
                              className={
                                "confidence-tag " +
                                (confidence(mm) < 60 ? "low" : "")
                              }
                            >
                              {confLabel(confidence(mm))} · {confidence(mm)}%
                            </span>
                          </td>
                          <td>
                            <button
                              className="icon-button"
                              aria-label={"Save " + mm.name + " from table"}
                              onClick={() => saveMarket(mm)}
                            >
                              <Bookmark
                                size={17}
                                fill={
                                  saved.some((x) => x.id === "market-" + mm.id)
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filtered.length === 0 && (
                  <div className="empty">
                    <Search size={28} />
                    <h3>No markets match these filters.</h3>
                    <button onClick={reset}>Reset filters</button>
                  </div>
                )}
              </section>
              <div className="section-heading">
                <h2>A few markets to explore</h2>
                <span className="muted">
                  Synthetic examples · not recommendations
                </span>
              </div>
              <div className="cards-grid">{filtered.slice(0, 3).map(card)}</div>
            </>
          )}
          {page === "Market detail" && (
            <>
              <button
                className="text-button back"
                onClick={() => go("Discover")}
              >
                <ChevronLeft size={16} /> Back to discovery
              </button>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {m.state} · CITY / PLACE · SYNTHETIC DEMO
                  </div>
                  <h1>{m.name}</h1>
                  <p>
                    {m.county} County is location context; every metric below
                    refers to the city.
                  </p>
                </div>
                <div className="actions">
                  <button onClick={() => toggle(m.id)}>
                    {compare.includes(m.id)
                      ? "Remove from comparison"
                      : "Add to comparison"}
                  </button>
                  <button onClick={() => saveMarket(m)}>
                    <Bookmark size={16} /> Save market
                  </button>
                  <button className="primary" onClick={() => analyze(m)}>
                    Analyze a property <ArrowRight size={16} />
                  </button>
                </div>
              </div>
              <div className="detail-summary">
                <div>
                  <h2>The research case</h2>
                  <p>
                    At a synthetic price indicator of {money(val(m, "price"))}{" "}
                    and rent indicator of {money(val(m, "rent"))}/month, the
                    gross yield proxy is {num(grossYield(m))}. This ratio
                    combines market indicators; it does not describe any
                    individual rental property.
                  </p>
                  <p>
                    Vacancy of {num(val(m, "vacancy"))} and population change of{" "}
                    {num(val(m, "population"))} help frame demand. Verify local
                    conditions and actual comparable rents before using these
                    assumptions.
                  </p>
                </div>
                <div>
                  <span>Opportunity score</span>
                  <strong>
                    {s.total ?? "Insufficient data"}
                    <small>{s.total !== null ? " / 100" : ""}</small>
                  </strong>
                  <span>
                    Data confidence {confidence(m)}% ·{" "}
                    {confLabel(confidence(m))}
                  </span>
                </div>
              </div>
              <div className="cards-grid">
                {[
                  ["Price indicator", money(val(m, "price"))],
                  ["Monthly rent indicator", money(val(m, "rent"))],
                  ["Rental vacancy", num(val(m, "vacancy"))],
                ].map(([a, b]) => (
                  <div className="panel metric-block" key={a}>
                    <span>{a}</span>
                    <strong>{b}</strong>
                    <small>Synthetic · 2025 demo scenario</small>
                  </div>
                ))}
              </div>
              <div className="two-col">
                <section className="panel">
                  <h2>Demand & cost context</h2>
                  <dl className="statement">
                    {(
                      [
                        "population",
                        "employment",
                        "tax",
                        "priceTrend",
                        "rentTrend",
                      ] as MetricKey[]
                    ).map((k) => (
                      <div key={k}>
                        <dt>{metricLabels[k]}</dt>
                        <dd>{num(val(m, k))}</dd>
                      </div>
                    ))}
                  </dl>
                  <p>
                    Tax is an illustrative percentage of purchase price, not an
                    assessed bill. Insurance, utilities, maintenance, and
                    management require property-specific quotes.
                  </p>
                </section>
                <section className="panel">
                  <h2>Signals & open questions</h2>
                  <p>
                    <b>Rental economics:</b> {num(grossYield(m))} gross yield
                    proxy before expenses.{" "}
                    {grossYield(m)! >= 7
                      ? "Higher gross income relative to price in this demo."
                      : "Operating costs may leave a narrow margin."}
                  </p>
                  <p>
                    <b>Demand:</b>{" "}
                    {val(m, "employment") === null
                      ? "Employment coverage is missing."
                      : `${num(val(m, "employment"))} employment change in the synthetic scenario.`}
                  </p>
                  <p>
                    <b>Risks:</b> {num(val(m, "vacancy"))} vacancy and{" "}
                    {num(val(m, "tax"))} annual tax assumption can materially
                    affect cash flow.
                  </p>
                  <p>
                    <b>Missing:</b> verified comparable sales, listing
                    liquidity, neighborhood detail, actual insurance, property
                    condition, and rent history.
                  </p>
                </section>
              </div>
              <section className="panel">
                <h2>Price & rent history</h2>
                <div className="empty compact">
                  <ChartNoAxesCombined size={26} />
                  <p>
                    No historical series in this dataset. Single-period
                    synthetic changes are shown above; a history has not been
                    invented.
                  </p>
                </div>
              </section>
              <section className="panel">
                <div className="section-heading">
                  <h2>What drives the score</h2>
                  <button
                    className="text-button"
                    onClick={() => go("Methodology")}
                  >
                    Read methodology <ArrowUpRight size={15} />
                  </button>
                </div>
                {Object.entries(s.components).map(([k, v]) => (
                  <div className="score-line" key={k}>
                    <span>
                      {
                        (
                          {
                            economics: "Rental economics",
                            value: "Relative value",
                            demand: "Demand trends",
                            vacancy: "Vacancy",
                            cost: "Operating-cost burden",
                          } as Record<string, string>
                        )[k]
                      }{" "}
                      <small>
                        {weights[k as keyof typeof weights]}% weight
                      </small>
                    </span>
                    <div className="bar">
                      <i style={{ width: (v ?? 0) + "%" }} />
                    </div>
                    <b>{v === null ? "Missing" : Math.round(v)}</b>
                  </div>
                ))}
                <p>
                  Weighted metric coverage: {s.coverage}%. Missing values are
                  excluded and available weights are renormalized; coverage
                  below 75% or missing economics/demand is not ranked.
                </p>
              </section>
              <div className="section-heading">
                <h2>Similar demo markets</h2>
                <p>Same state and illustrative size group: {m.size}</p>
              </div>
              <div className="cards-grid">
                {peers(m, markets).slice(0, 3).map(card)}
              </div>
              <section className="panel">
                <h2>Metric provenance</h2>
                <p>
                  All financial and trend values are synthetic. No external
                  source is claimed.
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Metric / units</th>
                        <th>Value</th>
                        <th>Source & kind</th>
                        <th>Reference period</th>
                        <th>Retrieval / fixture date</th>
                        <th>Geographic coverage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(m.metrics).map(([key, x]) => (
                        <tr key={key}>
                          <td>
                            {metricLabels[key as MetricKey]}
                            <small>{x.units}</small>
                          </td>
                          <td>{x.value ?? "Missing"}</td>
                          <td>
                            {x.source}
                            <small>{x.kind} · no source URL</small>
                          </td>
                          <td>{x.period}</td>
                          <td>{x.retrievedAt.slice(0, 10)}</td>
                          <td>
                            {x.geography}
                            <small>{x.geoId}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="muted">
                  Coverage: illustrative city values, no surveyed homes. Fixture
                  timestamps demonstrate freshness handling and are not real
                  retrieval claims.
                </p>
              </section>
            </>
          )}
          {page === "Compare" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">SIDE BY SIDE</div>
                  <h1>See the tradeoffs.</h1>
                  <p>
                    Compare up to four city-level markets. All values are
                    synthetic.
                  </p>
                </div>
                <button onClick={() => go("Discover")}>
                  Add markets <ArrowRight size={16} />
                </button>
              </div>
              {picked.length === 0 ? (
                <div className="panel empty">
                  <GitCompareArrows size={40} />
                  <h2>Choose markets to compare</h2>
                  <p>
                    Use the checkboxes in discovery to build your shortlist.
                  </p>
                  <button className="primary" onClick={() => go("Discover")}>
                    Explore markets
                  </button>
                </div>
              ) : (
                <section className="panel table-scroll">
                  <table className="comparison">
                    <thead>
                      <tr>
                        <th>Research metric</th>
                        {picked.map((mm) => (
                          <th key={mm.id}>
                            <button
                              className="market-title"
                              onClick={() => go("Market detail", mm.id)}
                            >
                              {mm.name}
                            </button>
                            <small>{mm.state} · city/place</small>
                            <button
                              className="text-button"
                              onClick={() => toggle(mm.id)}
                            >
                              <X size={13} /> Remove
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        [
                          "Price indicator",
                          (x: Market) => money(val(x, "price")),
                        ],
                        ["Rent / month", (x: Market) => money(val(x, "rent"))],
                        [
                          "Gross yield proxy",
                          (x: Market) => num(grossYield(x)),
                        ],
                        ["Vacancy", (x: Market) => num(val(x, "vacancy"))],
                        [
                          "Population change",
                          (x: Market) => num(val(x, "population")),
                        ],
                        [
                          "Employment change",
                          (x: Market) => num(val(x, "employment")),
                        ],
                        [
                          "Annual tax assumption",
                          (x: Market) => num(val(x, "tax")),
                        ],
                        [
                          "Other operating costs",
                          () => "Property-specific inputs required",
                        ],
                        [
                          "Opportunity score",
                          (x: Market) =>
                            score(x, markets).total ?? "Insufficient data",
                        ],
                        ...Object.keys(weights).map((k) => [
                          `${k} component (${weights[k as keyof typeof weights]}%)`,
                          (x: Market) => {
                            const n = score(x, markets).components[
                              k as keyof typeof weights
                            ];
                            return n === null
                              ? "Missing"
                              : Math.round(n) + "/100";
                          },
                        ]),
                        [
                          "Confidence",
                          (x: Market) =>
                            confidence(x) + "% · " + confLabel(confidence(x)),
                        ],
                        [
                          "Fixture date",
                          (x: Market) =>
                            x.metrics.price.retrievedAt.slice(0, 10),
                        ],
                        [
                          "Tradeoff",
                          (x: Market) =>
                            `${num(grossYield(x))} gross yield before a ${num(val(x, "tax"))} tax assumption and ${num(val(x, "vacancy"))} vacancy.`,
                        ],
                      ].map(([label, fn]) => (
                        <tr key={String(label)}>
                          <th>{String(label)}</th>
                          {picked.map((mm) => (
                            <td key={mm.id}>
                              {(fn as (x: Market) => React.ReactNode)(mm)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}
            </>
          )}
          {page === "Property analyzer" && (
            <Analyzer
              onChange={setProperty}
              key={editorKey}
              initial={property}
              id={editId}
              initialScenarios={savedScenarios}
              initialNotes={saved.find((x) => x.id === editId)?.notes}
              onSave={save}
              notify={setToast}
            />
          )}
          {page === "Watchlist" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">YOUR RESEARCH, IN ONE PLACE</div>
                  <h1>The shortlist.</h1>
                  <p>
                    Saved markets, property analyses, and your next questions.
                  </p>
                </div>
                <button className="primary" onClick={() => analyze()}>
                  New property analysis
                </button>
              </div>
              {storageError ? (
                <div className="panel error" role="alert">
                  {storageError}
                  <button onClick={load}>Retry</button>
                </div>
              ) : !loaded ? (
                <p role="status">Loading saved research…</p>
              ) : saved.length === 0 ? (
                <div className="panel empty">
                  <Bookmark size={36} />
                  <h2>Your next investigation starts here.</h2>
                  <p>
                    Save a market or property analysis to keep your research
                    together.
                  </p>
                  <button onClick={() => go("Discover")}>
                    Discover markets
                  </button>
                </div>
              ) : (
                <div className="watch-grid">
                  {saved.map((x) => (
                    <WatchCard
                      key={x.id}
                      item={x}
                      onSave={save}
                      notify={setToast}
                      onRemove={() => remove(x.id)}
                      onOpen={() => {
                        if (x.kind === "market")
                          go("Market detail", x.marketId);
                        else if (x.property) {
                          setProperty(x.property);
                          setEditId(x.id);
                          setSavedScenarios(x.scenarios);
                          setEditorKey((k) => k + 1);
                          go("Property analyzer");
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
          {page === "Methodology" && <Methodology />}
          <Research full={page==='Research'} onFull={()=>go('Research')} onMarket={id=>go(id?'Market detail':'Discover',id||undefined)} onAnalyze={p=>{setProperty(p||defaults);setEditId(undefined);setSavedScenarios(undefined);setEditorKey(x=>x+1);go('Property analyzer');}} onCompare={ids=>{setCompare(ids);go('Compare');}} onSaved={load} context={page==='Market detail'?{marketId:selected}:page==='Property analyzer'?{property}: {}} contextLabel={page==='Market detail'?`${m.name}, ${m.state} · synthetic market data`:page==='Property analyzer'?`${property.address} · unsaved/user assumptions`:'No page context'}/>
          <footer>
            <span>Midwest Property Scout</span>
            <span>
              Initial screening only. Verify the market. Underwrite the
              property.
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {compare.length > 0 && page === "Discover" && (
        <div className="compare-tray">
          <span>{compare.length} markets selected</span>
          <button className="primary" onClick={() => go("Compare")}>
            Compare shortlist <ArrowRight size={16} />
          </button>
          <button aria-label="Clear comparison" onClick={() => setCompare([])}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function WatchCard({
  item,
  onSave,
  onRemove,
  onOpen,
  notify,
}: {
  item: Saved;
  onSave: (x: Saved) => Promise<void>;
  onRemove: () => void;
  onOpen: () => void;
  notify: (s: string) => void;
}) {
  const [notes, setNotes] = useState(item.notes),
    [busy, setBusy] = useState(false);
  return (
    <article className="panel">
      <div className="section-heading">
        <span className="eyebrow">
          {item.kind === "market"
            ? "MARKET · SYNTHETIC"
            : "PROPERTY · USER ASSUMPTIONS"}
        </span>
        <button
          className="icon-button"
          aria-label={"Remove " + item.name}
          onClick={onRemove}
        >
          <Trash2 size={17} />
        </button>
      </div>
      <h2>{item.name}</h2>
      <p>
        {item.kind === "property"
          ? `${item.property?.units} units · ${money(item.property?.price ?? null)}`
          : "City-level demo research"}
      </p>
      <label>
        Research notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What should you investigate next?"
        />
      </label>
      <div className="actions">
        <button
          disabled={busy || notes === item.notes}
          onClick={async () => {
            setBusy(true);
            try {
              await onSave({ ...item, notes });
            } catch (e) {
              notify((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : "Save notes"}
        </button>
        <button className="primary" onClick={onOpen}>
          {item.kind === "market" ? "Open market" : "Reopen analysis"}{" "}
          <ArrowRight size={16} />
        </button>
      </div>
    </article>
  );
}
function Methodology() {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">TRANSPARENT BY DESIGN</div>
          <h1>Know what’s behind the number.</h1>
          <p>
            A screening model, not a valuation or a prediction of future
            returns.
          </p>
        </div>
      </div>
      <div className="methodology">
        <section className="panel">
          <h2>Demo data, clearly separated</h2>
          <p>
            The 24 place names and approximate map positions refer to real
            places. Every price, rent, demand trend, tax, and vacancy value is a
            deterministic synthetic fixture. Rankings are illustrations, not
            investment recommendations. No real statewide coverage is claimed.
          </p>
          <p>
            Metrics carry a source, optional source URL, reference period,
            fixture/retrieval timestamp, geographic identifier, units, kind, and
            coverage note. Synthetic sources have no fabricated URL. The
            provider pipeline rejects synthetic observations in real mode and
            never falls back to demo values on failure.
          </p>
        </section>
        <section className="panel">
          <h2>Opportunity score · 0–100</h2>
          <p>
            Each input is linearly normalized and clamped to 0–100. The weighted
            mean uses available components, with a minimum of 75% weighted
            coverage and both economics and demand required. Otherwise we
            display “Insufficient data.”
          </p>
          <table>
            <thead>
              <tr>
                <th>Component</th>
                <th>Weight</th>
                <th>Normalization & direction</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Rental economics</td>
                <td>35%</td>
                <td>Gross yield proxy 3–12%; higher is better.</td>
              </tr>
              <tr>
                <td>Relative value</td>
                <td>20%</td>
                <td>
                  Yield minus peer mean, −3 to +3 percentage points; higher is
                  better.
                </td>
              </tr>
              <tr>
                <td>Demand</td>
                <td>20%</td>
                <td>
                  Mean of population (−2 to +3%) and employment (−2 to +4%)
                  scores; higher is better.
                </td>
              </tr>
              <tr>
                <td>Vacancy</td>
                <td>15%</td>
                <td>
                  3–12%, reversed; lower is better. Liquidity is unavailable and
                  not inferred.
                </td>
              </tr>
              <tr>
                <td>Cost burden</td>
                <td>10%</td>
                <td>
                  Annual tax assumption 1–3.5%, reversed; lower is better. Other
                  costs belong in property underwriting.
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            Peers share a state and illustrative small/mid/large group. At least
            two peers with yield data are required. These demo group assignments
            are not Census classifications. Configuration lives in{" "}
            <code>lib/scoring.ts</code>; weights must be nonnegative and sum to
            100.
          </p>
          <p>
            The model has not been validated as a predictor of future returns.
            Gross yield divides aggregate indicators, not matched rent/sale
            observations. “Relative value” is a peer screening signal, not an
            undervaluation claim.
          </p>
        </section>
        <section className="panel">
          <h2>Confidence is a separate measure</h2>
          <p>
            For each of eight metrics, completeness is 0 if missing; otherwise
            freshness decays linearly from 1 at retrieval to 0 after three
            years. Average these contributions and multiply by 100. High is ≥80;
            moderate is 60–79; low is below 60. The demo uses a fixed evaluation
            date of September 21, 2026 for reproducibility.
          </p>
          <p>
            This is a demonstration of coverage/freshness, not statistical
            confidence in synthetic values. Real integrations must also account
            for sampling error, provider quality, period age, and geographic
            mismatch before using this indicator.
          </p>
        </section>
        <section className="panel">
          <h2>Connecting real sources</h2>
          <p>
            The provider interface supports ACS, FHFA, regional reports,
            licensed feeds, and manual inputs. Authorized imports are
            implemented with schema validation, caching, request spacing, and
            failure logs. Live source adapters and geography reconciliation
            require development before real data can appear here.
          </p>
          <ul>
            <li>
              ACS: retain the full five-year reference window and margins of
              error. Overlapping windows are not independent annual
              observations.
            </li>
            <li>
              FHFA: retain index units and published geography. Never relabel an
              index as a median sale price.
            </li>
            <li>
              Regional reports: import only authorized tables with their exact
              geography and period.
            </li>
            <li>
              Licensed feeds: use a contract-authorized API/import. Keep
              credentials server-side.
            </li>
            <li>
              Manual entries: identify user assumptions and preserve missing
              values.
            </li>
          </ul>
          <p>
            Map tiles: OpenStreetMap contributors and CARTO, attributed in the
            map. Internet is required for background tiles; the market table
            remains usable offline once the app is loaded.
          </p>
        </section>
      </div>
    </>
  );
}
