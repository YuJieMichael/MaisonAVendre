import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  Check,
  Earth,
  Handshake,
  House,
  KeyRound,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import homeCopy from "./home-copy.json";
import { SellerFlow } from "./seller-flow";
import { Dashboard } from "./dashboard";
import { ProjectProvider } from "./project";
import type { Language } from "./seller-copy";
import "./original.css";
import "./styles.css";
import "./dashboard.css";

const labels = { fr: "FR", en: "EN", zh: "中文" };
const notices = {
  fr: {
    search: "La recherche de propriétés n’est pas encore disponible.",
    portal: "L’espace client n’est pas encore disponible.",
    form: "Formulaire de démonstration : aucune information ne sera envoyée.",
    sent: "Démonstration terminée. Votre demande n’a pas été envoyée.",
    nav: "Navigation principale",
  },
  en: {
    search: "Property search is not available yet.",
    portal: "The client portal is not available yet.",
    form: "Demo form: no information will be sent.",
    sent: "Demo completed. Your request has not been sent.",
    nav: "Main navigation",
  },
  zh: {
    search: "房源搜索尚未开放。",
    portal: "客户后台尚未开放。",
    form: "演示表单：不会发送任何资料。",
    sent: "演示完成，您的咨询尚未发送。",
    nav: "主导航",
  },
};

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <a
      href="#top"
      className={`brand ${footer ? "footer-brand" : ""}`}
      aria-label="MaisonÀVendre"
    >
      <span className="brand-mark">
        <House aria-hidden="true" />
      </span>
      <span>
        Maison<span>À</span>Vendre
      </span>
    </a>
  );
}

function App() {
  const [lang, setLang] = useState<Language>("fr");
  const [hash, setHash] = useState(location.hash);
  const selling = hash.startsWith("#vendre");
  const dashboard = hash.startsWith("#dashboard");
  const [menu, setMenu] = useState(false);
  const d = homeCopy[lang];
  useEffect(() => {
    const change = () => {
      setHash(location.hash);
      setMenu(false);
    };
    addEventListener("hashchange", change);
    return () => removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-Hans" : lang;
  }, [lang]);
  useEffect(() => {
    if (selling || dashboard || !hash || hash === "#top")
      window.scrollTo({ top: 0, behavior: "instant" });
    else
      document
        .getElementById(hash.slice(1))
        ?.scrollIntoView({ block: "start" });
  }, [hash, selling, dashboard]);
  return (
    <>
      <header className="site-header">
        <Brand />
        <nav
          id="main-navigation"
          className={`main-nav ${menu ? "is-open" : ""}`}
          aria-label={notices[lang].nav}
        >
          {d.nav.map((n, i) => (
            <a
              key={i}
              href={
                i === 0
                  ? "#parcours"
                  : i === 1
                    ? "#vendre"
                    : i === 2
                      ? "#approche"
                      : "#processus"
              }
              onClick={() => setMenu(false)}
            >
              {n}
            </a>
          ))}
          <a
            className="mobile-workspace-link"
            href="#dashboard"
            onClick={() => setMenu(false)}
          >
            {
              {
                fr: "Mon espace vendeur",
                en: "Seller dashboard",
                zh: "卖家工作台",
              }[lang]
            }
          </a>
        </nav>
        <div className="header-actions">
          <div className="language-switch" aria-label="Language">
            <Earth aria-hidden="true" />
            {(Object.keys(labels) as Language[]).map((l) => (
              <button
                key={l}
                type="button"
                lang={l}
                className={lang === l ? "active" : ""}
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
              >
                {labels[l]}
              </button>
            ))}
          </div>
          <a className="account-button outline" href="#dashboard">
            {
              {
                fr: "Mon espace vendeur",
                en: "Seller dashboard",
                zh: "卖家工作台",
              }[lang]
            }
          </a>
          <button
            className="menu-button"
            type="button"
            onClick={() => setMenu(!menu)}
            aria-label="Menu"
            aria-expanded={menu}
            aria-controls="main-navigation"
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main>
        {dashboard ? (
          <Dashboard lang={lang} />
        ) : selling ? (
          <SellerFlow lang={lang} />
        ) : (
          <Home lang={lang} />
        )}
      </main>
      <footer>
        <Brand footer />
        <p>{d.footer}</p>
        <p>{d.legal}</p>
      </footer>
    </>
  );
}

function Home({ lang }: { lang: Language }) {
  const d = homeCopy[lang];
  const [value, setValue] = useState("650000");
  const [tab, setTab] = useState<"seller" | "buyer">("seller");
  const [searchNotice, setSearchNotice] = useState(false);
  const [sent, setSent] = useState(false);
  const formatted = new Intl.NumberFormat(
    lang === "zh" ? "zh-CN" : `${lang}-CA`,
    { style: "currency", currency: "CAD", maximumFractionDigits: 0 },
  ).format(Number(value) || 0);
  return (
    <>
      <section id="top" className="hero-section">
        <div className="hero-image" aria-hidden="true" />
        <div className="hero-shade" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow light">
            <Sparkles aria-hidden="true" />
            {d.eyebrow}
          </p>
          <h1>{d.heroTitle}</h1>
          <p className="hero-copy">{d.heroText}</p>
          <div className="hero-actions">
            <a className="primary-link" href="#vendre">
              {d.sell}
              <ArrowRight />
            </a>
            <a className="secondary-link" href="#parcours">
              {d.buy}
            </a>
          </div>
          <form
            className="search-bar"
            onSubmit={(e) => {
              e.preventDefault();
              setSearchNotice(true);
            }}
          >
            <MapPin aria-hidden="true" />
            <input
              placeholder={d.searchPlaceholder}
              aria-label={d.searchPlaceholder}
            />
            <button type="submit">
              <Search aria-hidden="true" />
              {d.searchButton}
            </button>
          </form>
          {searchNotice && (
            <p className="hero-notice" role="status">
              {notices[lang].search}
            </p>
          )}
        </div>
        <div className="trust-row">
          {d.trust.map((t, i) => (
            <span key={i}>
              {i === 0 ? <BadgeCheck /> : i === 1 ? <ShieldCheck /> : <Earth />}
              {t}
            </span>
          ))}
        </div>
      </section>
      <section id="parcours" className="section route-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{d.routeEyebrow}</p>
            <h2>{d.routeTitle}</h2>
          </div>
          <p className="section-note">MaisonÀVendre</p>
        </div>
        <div className="route-grid">
          {(["seller", "buyer"] as const).map((kind) => (
            <article key={kind} className={`route-card ${kind}-card`}>
              <div className="route-icon">
                {kind === "seller" ? <TrendingUp /> : <KeyRound />}
              </div>
              <h3>{d[`${kind}Title`]}</h3>
              <p>{d[`${kind}Text`]}</p>
              <ul>
                {d[`${kind}Points`].map((t) => (
                  <li key={t}>
                    <Check />
                    {t}
                  </li>
                ))}
              </ul>
              <a href={kind === "seller" ? "#vendre" : "#contact"}>
                {d[`${kind}Cta`]}
                <ArrowRight />
              </a>
            </article>
          ))}
        </div>
      </section>
      <section id="approche" className="difference-section">
        <div className="difference-intro">
          <p className="eyebrow light">{d.differenceEyebrow}</p>
          <h2>{d.differenceTitle}</h2>
          <p>{d.differenceText}</p>
        </div>
        <div className="feature-list">
          {[Calculator, ShieldCheck, Earth].map((Icon, i) => (
            <article key={i}>
              <span>
                <Icon />
              </span>
              <div>
                <h3>{d.featureTitles[i]}</h3>
                <p>{d.featureTexts[i]}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="section calculator-section">
        <div className="calculator-copy">
          <p className="eyebrow">{d.calcEyebrow}</p>
          <h2>{d.calcTitle}</h2>
          <p>{d.calcText}</p>
        </div>
        <div className="calculator-card">
          <div
            className="calculator-tabs"
            role="tablist"
            aria-label={d.calcTitle}
          >
            {(["seller", "buyer"] as const).map((kind, i) => (
              <button
                key={kind}
                id={`tab-${kind}`}
                type="button"
                role="tab"
                aria-selected={tab === kind}
                aria-controls="calculator-panel"
                tabIndex={tab === kind ? 0 : -1}
                onClick={() => setTab(kind)}
                onKeyDown={(e) => {
                  if (
                    ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                  ) {
                    e.preventDefault();
                    const next =
                      e.key === "Home"
                        ? "seller"
                        : e.key === "End"
                          ? "buyer"
                          : kind === "seller"
                            ? "buyer"
                            : "seller";
                    setTab(next);
                    document.getElementById(`tab-${next}`)?.focus();
                  }
                }}
              >
                {i === 0 ? d.calcSeller : d.calcBuyer}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id="calculator-panel"
            aria-labelledby={`tab-${tab}`}
          >
            <label htmlFor="property-value">
              {tab === "seller" ? d.propertyValue : d.buyerBudget}
            </label>
            <div className="money-input">
              <span>$</span>
              <input
                id="property-value"
                inputMode="numeric"
                value={value}
                onChange={(e) =>
                  setValue(e.target.value.replace(/\D/g, "").slice(0, 12))
                }
              />
            </div>
            <div className="result-box">
              <span>{tab === "seller" ? d.estimated : d.buyerBudget}</span>
              <strong aria-live="polite">{formatted}</strong>
            </div>
            <div className="strategy-row">
              <Handshake />
              <div>
                <span>{tab === "seller" ? d.strategy : d.buyerPlan}</span>
                <strong>
                  {tab === "seller" ? d.strategyText : d.buyerPlanText}
                </strong>
              </div>
            </div>
            <a
              href={tab === "seller" ? "#vendre" : "#contact"}
              className="wide-cta"
            >
              {d.calcCta}
              <ArrowRight />
            </a>
          </div>
        </div>
      </section>
      <section id="processus" className="section process-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{d.processEyebrow}</p>
            <h2>{d.processTitle}</h2>
          </div>
        </div>
        <div className="steps-grid">
          {d.steps.map(([n, title, text]) => (
            <article key={n}>
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="contact" className="contact-section">
        <div className="contact-copy">
          <div className="contact-mark">
            <House />
          </div>
          <h2>{d.ctaTitle}</h2>
          <p>{d.ctaText}</p>
          <div className="mini-proof">
            <BadgeCheck />
            Français <span />
            English <span />
            中文
          </div>
        </div>
        <form
          className="contact-form"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <p className="form-demo">{notices[lang].form}</p>
          <div className="form-row">
            <input
              required
              placeholder={d.name}
              aria-label={d.name}
              autoComplete="name"
            />
            <input
              required
              type="email"
              placeholder={d.email}
              aria-label={d.email}
              autoComplete="email"
            />
          </div>
          <input
            type="tel"
            placeholder={d.phone}
            aria-label={d.phone}
            autoComplete="tel"
          />
          <textarea required placeholder={d.project} aria-label={d.project} />
          <button type="submit">
            {d.contact}
            <ArrowRight />
          </button>
          {sent && <p role="status">{notices[lang].sent}</p>}
        </form>
      </section>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ProjectProvider>
      <App />
    </ProjectProvider>
  </React.StrictMode>,
);
