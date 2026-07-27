import {
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import { KpiCard, number } from "../components/UI";
import {
  SearchBox,
  type SearchBoxResult,
} from "../components/common/SearchBox";
import type { AppModel, PageName } from "../types";

import "../styles/home.css";

interface HomePageProps {
  model: AppModel;
  navigate: (page: PageName) => void;
  openProvider: (id: string) => void;
  openCounty: (name: string) => void;
}

interface DashboardLink {
  title: string;
  description: string;
  page: PageName;
  action: string;
}

const dashboardLinks: DashboardLink[] = [
  {
    title: "Recruitment",
    description:
      "Review home supply, new licenses, placement demand, and county recruitment conditions.",
    page: "recruitment",
    action: "Open recruitment dashboard",
  },
  {
    title: "Retention",
    description:
      "Review license expiry, placement activity, engagement, and follow-up indicators.",
    page: "retention",
    action: "Open retention dashboard",
  },
  {
    title: "Counties",
    description:
      "Compare children in care, licensed homes, placement movement, and county conditions.",
    page: "counties",
    action: "Open counties dashboard",
  },
  {
    title: "Foster homes",
    description:
      "Search provider records, license details, preferences, engagement, and placement history.",
    page: "providers",
    action: "Browse foster homes",
  },
];

function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function HomePage({
  model,
  navigate,
  openProvider,
  openCounty,
}: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAboutModal, setShowAboutModal] =
    useState(false);

  const searchResults = useMemo<SearchBoxResult[]>(() => {
    const query = normalizeSearchText(searchQuery);

    if (!query) {
      return [];
    }

    const countyResults: SearchBoxResult[] =
      model.counties
        .filter((county) =>
          normalizeSearchText(county.name).includes(query),
        )
        .slice(0, 4)
        .map((county) => ({
          id: `county:${county.name}`,
          title: `${county.name} County`,
          description: "Open the Counties dashboard",
        }));

    const providerResults: SearchBoxResult[] =
      model.providers
        .filter((provider) =>
          normalizeSearchText(
            provider.id_provider,
          ).includes(query),
        )
        .slice(0, 4)
        .map((provider) => ({
          id: `provider:${provider.id_provider}`,
          title: `Provider ${provider.id_provider}`,
          description: provider.county_provider
            ? `${provider.county_provider} County`
            : "Open provider record",
        }));

    return [
      ...countyResults,
      ...providerResults,
    ].slice(0, 6);
  }, [
    model.counties,
    model.providers,
    searchQuery,
  ]);

  const handleSearchResult = (
    result: SearchBoxResult,
  ): void => {
    if (result.id.startsWith("provider:")) {
      const providerId = result.id.replace(
        "provider:",
        "",
      );

      openProvider(providerId);
      return;
    }

    if (result.id.startsWith("county:")) {
      const countyName = result.id.replace(
        "county:",
        "",
      );

      openCounty(countyName);
    }
  };

  return (
    <>
      <section className="hero home-hero">
        <div className="home-hero-content">

          <h1>Foster-home capacity overview</h1>

          <p className="home-hero-description">
            Review statewide foster-care data and open
            the dashboard needed for more detail.
          </p>
        </div>

        <button
          type="button"
          className="btn primary"
          onClick={() => navigate("upload")}
        >
          Update CSV data
        </button>
      </section>

      <section
        className="section home-summary-section"
        aria-labelledby="statewide-summary-heading"
      >
        <div className="section-heading">
          <div>
            <h2 id="statewide-summary-heading">
              Statewide summary
            </h2>
          </div>
        </div>

        <div className="grid kpis home-kpis">
          <KpiCard
            title="Licensed foster homes"
            value={number(
              model.summary.licensedHomes,
            )}
            caption="Licensed on the reporting date"
          />

          <KpiCard
            title="Children in care"
            value={number(
              model.summary.childrenInCare,
            )}
            caption="In care on the reporting date"
          />

          <KpiCard
            title="Total placements"
            value={number(model.placements.length)}
            caption="Placement records in the dataset"
          />

          <KpiCard
            title="Provider records"
            value={number(model.providers.length)}
            caption="All foster-home records"
          />
        </div>
      </section>

      <section
        className="section"
        aria-labelledby="home-search-heading"
      >
        <div className="home-search-panel">
          <div className="home-search-heading">
            <h2 id="home-search-heading">
              Find a county or foster home
            </h2>

            <p className="muted">
              Search by county name or provider ID.
            </p>
          </div>

          <SearchBox
            value={searchQuery}
            results={searchResults}
            onChange={setSearchQuery}
            onSelect={handleSearchResult}
            placeholder="Search by provider ID or county"
            label=""
            ariaLabel="Search by provider ID or county"
            emptyMessage="No matching county or provider found."
          />
        </div>
      </section>

      <section
        className="section"
        aria-labelledby="dashboard-overview-heading"
      >
        <div className="section-heading home-dashboard-heading">
          <div>
            <div className="home-heading-with-info">
              <h2 id="dashboard-overview-heading">
                Explore the dashboards
              </h2>

              <button
                type="button"
                className="home-info-button"
                aria-label="About this overview page"
                onClick={() =>
                  setShowAboutModal(true)
                }
              >
                i
              </button>
            </div>

            <p className="muted">
              Choose the area that matches the work
              you need to do.
            </p>
          </div>
        </div>

        <div className="home-dashboard-grid">
          {dashboardLinks.map((dashboard) => (
            <button
              key={dashboard.page}
              type="button"
              className="home-dashboard-card"
              onClick={() =>
                navigate(dashboard.page)
              }
            >
              <span className="home-dashboard-card-content">
                <strong>{dashboard.title}</strong>
                <span>{dashboard.description}</span>
              </span>

              <span className="home-dashboard-card-action">
                <span>{dashboard.action}</span>
                <span aria-hidden="true">→</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {showAboutModal ? (
        <div
          className="app-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setShowAboutModal(false);
            }
          }}
        >
          <section
            className="app-modal home-about-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-about-modal-title"
            style={
              {
                "--modal-width": "760px",
              } as CSSProperties
            }
          >
            <header className="app-modal-header">
              <div>
                <h2 id="home-about-modal-title">
                  About this overview
                </h2>

                <p className="muted">
                  Current purpose and possible future
                  uses.
                </p>
              </div>

              <button
                type="button"
                className="app-modal-close"
                aria-label="Close"
                onClick={() =>
                  setShowAboutModal(false)
                }
              >
                ×
              </button>
            </header>

            <div className="app-modal-body">
              <p className="home-about-intro">
                This page currently gives users a quick
                statewide summary and directs them to
                the correct dashboard. Detailed analysis
                remains inside the Recruitment,
                Retention, Counties, and Foster Homes
                pages.
              </p>

              <h3>How Home Page could grow:</h3>

              <div className="home-roadmap-list">
                <article>
                  <strong>
                    Personalized work lists
                  </strong>

                  <p>
                    Show counties, providers, and
                    follow-up work assigned to the
                    logged-in user.
                  </p>
                </article>

                <article>
                  <strong>
                    Alerts and reminders
                  </strong>

                  <p>
                    Surface upcoming license
                    expirations, major placement
                    changes, and incomplete follow-up
                    work.
                  </p>
                </article>

                <article>
                  <strong>Saved views</strong>

                  <p>
                    Let staff save counties, providers,
                    filters, and reports they review
                    often.
                  </p>
                </article>

                <article>
                  <strong>Recent activity</strong>

                  <p>
                    Show recently viewed counties and
                    foster-home records so users can
                    quickly continue their work.
                  </p>
                </article>

                <article>
                  <strong>Role-based content</strong>

                  <p>
                    Show different homepage content for
                    recruitment, retention, county, and
                    supervisory teams.
                  </p>
                </article>

                <article>
                  <strong>Quick actions</strong>

                  <p>
                    Start outreach, upload data, export
                    a report, or open a county review
                    directly from the homepage.
                  </p>
                </article>

                <article>
                  <strong>
                    Data update status
                  </strong>

                  <p>
                    Show when each dataset was updated
                    and whether any expected file is
                    missing.
                  </p>
                </article>

                <article>
                  <strong>
                    Team notes and handoffs
                  </strong>

                  <p>
                    Allow staff to record notes, assign
                    follow-up work, and share context
                    with other team members.
                  </p>
                </article>
              </div>

              <p className="home-about-closing">
                The current version keeps the homepage
                simple while leaving room for it to
                become a personalized work hub in a
                production system.
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}