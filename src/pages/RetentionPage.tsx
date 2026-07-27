/**
 * Retention page for reviewing licensed foster homes, provider engagement,
 * recently inactive homes, licenses expiring within 90 days, and homes whose
 * licenses recently lapsed.
 */

import { BackToTop } from "../components/BackToTop";
import "../styles/retention.css";
import { Modal } from "../components/common/Modal";
import {
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

import {
  Empty,
  KpiCard,
  Table,
  number,
  percent,
} from "../components/UI";

import type {
  AppModel,
  ProviderRecord,
} from "../types";

type View =
  | "licensed"
  | "engagement"
  | "renewal"
  | "lapsed";

type EngagementView =
  | "level"
  | "recentlyInactive";

type EngagementBand =
  | "low"
  | "limited"
  | "moderate"
  | "high";

type InactivityWindow = 30 | 60 | 90;

type Sort =
  | "engagementAsc"
  | "engagementDesc"
  | "expirationAsc"
  | "countyAsc";

type RenewalGroup =
  | "urgent"
  | "upcoming"
  | "planAhead";

interface RetentionTableProps {
  providers: ProviderRecord[];
  view: View;
  engagementView: EngagementView | null;
  lastActivityByProvider: Map<string, Date | null>;
  daysInactiveByProvider: Map<string, number | null>;
  openProvider: (id: string) => void;
  openRenewalReminder: (provider: ProviderRecord) => void;
}

interface RetentionPageProps {
  model: AppModel;
  openProvider: (id: string) => void;
}

const RECENTLY_LAPSED_DAYS = 90;

const ENGAGEMENT_BANDS: Record<
  EngagementBand,
  {
    label: string;
    description: string;
  }
> = {
  low: {
    label: "Low",
    description: "Less than 10%",
  },
  limited: {
    label: "Limited",
    description: "10% to 30%",
  },
  moderate: {
    label: "Moderate",
    description: "More than 30% to 50%",
  },
  high: {
    label: "High",
    description: "More than 50%",
  },
};

function formatDate(
  date: Date | null,
): string {
  if (!date) {
    return "No recorded placement";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getEngagementBand(
  engagement: number,
): EngagementBand {
  if (engagement < 0.1) {
    return "low";
  }

  if (engagement <= 0.3) {
    return "limited";
  }

  if (engagement <= 0.5) {
    return "moderate";
  }

  return "high";
}

function sortByExpirationSoonest(
  providers: ProviderRecord[],
): ProviderRecord[] {
  return [...providers].sort(
    (firstProvider, secondProvider) =>
      (firstProvider.daysUntilExpiration ??
        Number.POSITIVE_INFINITY) -
      (secondProvider.daysUntilExpiration ??
        Number.POSITIVE_INFINITY),
  );
}

interface RetentionActionCardProps {
  title: string;
  caption: string;
  selected: boolean;
  tone: "renewal" | "engagement";
  onClick: () => void;
}

function RetentionActionCard({
  title,
  caption,
  selected,
  tone,
  onClick,
}: RetentionActionCardProps) {

  return (
    <button
      type="button"
      className={`retention-card retention-action-card retention-action-card--${tone} ${
        selected ? "selected" : ""
      }`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <strong className="retention-action-card__title">
        {title}
      </strong>

      <span className="retention-action-card__caption">
        {caption}
      </span>
    </button>
  );
}

function RetentionTable({
  providers,
  view,
  engagementView,
  lastActivityByProvider,
  daysInactiveByProvider,
  openProvider,
  openRenewalReminder,
}: RetentionTableProps) {
  if (providers.length === 0) {
    return (
      <Empty>
        No homes match the selected filters.
      </Empty>
    );
  }

  const isLapsedView = view === "lapsed";
  const isRecentlyInactiveView =
    view === "engagement" &&
    engagementView === "recentlyInactive";

  const headers = isRecentlyInactiveView
    ? [
        "Provider",
        "County",
        "Last placement activity",
        "Days since activity",
        "Active days",
        "Licensed days",
        "Lifetime engagement",
      ]
    : [
        "Provider",
        "County",
        "License end",
        isLapsedView
          ? "Days since expiration"
          : "Days remaining",
        "Active days",
        "Licensed days",
        "Engagement",
        ...(view === "renewal" || isLapsedView
          ? ["Renewal reminder"]
          : []),
      ];

  return (
    <div className="retention-results-table">
      <Table headers={headers}>
      {providers.map((provider) => {
        if (isRecentlyInactiveView) {
          const lastActivity =
            lastActivityByProvider.get(
              provider.id_provider,
            ) ?? null;

          const daysInactive =
            daysInactiveByProvider.get(
              provider.id_provider,
            ) ?? null;

          return (
            <tr
              key={provider.id_provider}
              role="button"
              tabIndex={0}
              onClick={() =>
                openProvider(
                  provider.id_provider,
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  event.preventDefault();
                  openProvider(provider.id_provider);
                }
              }}
            >
              <td>
                <b>{provider.id_provider}</b>
              </td>

              <td>
                {provider.county_provider}
              </td>

              <td>
                {formatDate(lastActivity)}
              </td>

              <td>
                {daysInactive === null
                  ? "No recorded placement"
                  : number(daysInactive)}
              </td>

              <td>
                {number(provider.activeDays)}
              </td>

              <td>
                {number(provider.licensedDays)}
              </td>

              <td>
                {percent(provider.engagement)}
              </td>
            </tr>
          );
        }

        const expirationDays =
          provider.daysUntilExpiration;

        let displayedExpirationDays:
          | number
          | string = "—";

        if (expirationDays !== null) {
          displayedExpirationDays =
            isLapsedView
              ? Math.abs(expirationDays)
              : expirationDays;
        }

        return (
          <tr
            key={provider.id_provider}
            role="button"
            tabIndex={0}
            onClick={() =>
              openProvider(
                provider.id_provider,
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                openProvider(provider.id_provider);
              }
            }}
          >
            <td>
              <b>{provider.id_provider}</b>
            </td>

            <td>
              {provider.county_provider}
            </td>

            <td>
              {provider.license_end_date}
            </td>

            <td>
              {displayedExpirationDays}
            </td>

            <td>
              {number(provider.activeDays)}
            </td>

            <td>
              {number(provider.licensedDays)}
            </td>

            <td>
              {percent(provider.engagement)}
            </td>

            {(view === "renewal" || isLapsedView) && (
              <td>
                <button
                  type="button"
                  className="btn renewal-reminder-button"
                  title="Preview renewal reminder"
                  aria-label={`Preview renewal reminder for ${provider.id_provider}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    openRenewalReminder(provider);
                  }}
                >
                  Preview reminder
                </button>
              </td>
            )}
          </tr>
        );
      })}
      </Table>
    </div>
  );
}

export function RetentionPage({
  model,
  openProvider,
}: RetentionPageProps) {
  const [infoOpen, setInfoOpen] =
    useState(false);

  const [view, setView] =
    useState<View | null>(null);

  const [
    engagementView,
    setEngagementView,
  ] = useState<EngagementView | null>(null);

  const [
    engagementBand,
    setEngagementBand,
  ] = useState<EngagementBand | null>(null);

  const [
    inactivityWindow,
    setInactivityWindow,
  ] = useState<InactivityWindow | null>(null);

  const [renewalGroup, setRenewalGroup] =
    useState<RenewalGroup | null>(null);

  const [query, setQuery] =
    useState("");

  const [sort, setSort] =
    useState<Sort>("engagementAsc");

  const [
    renewalReminderProvider,
    setRenewalReminderProvider,
  ] = useState<ProviderRecord | null>(null);

  const licensedHomes = useMemo(
    () =>
      model.providers.filter(
        (provider) => provider.isLicensed,
      ),
    [model.providers],
  );

  const engagementHomesByBand = useMemo(
    () => {
      const groups: Record<
        EngagementBand,
        ProviderRecord[]
      > = {
        low: [],
        limited: [],
        moderate: [],
        high: [],
      };

      licensedHomes.forEach((provider) => {
        groups[
          getEngagementBand(
            provider.engagement,
          )
        ].push(provider);
      });

      Object.values(groups).forEach(
        (providers) => {
          providers.sort(
            (
              firstProvider,
              secondProvider,
            ) =>
              firstProvider.engagement -
              secondProvider.engagement,
          );
        },
      );

      return groups;
    },
    [licensedHomes],
  );

  const placementActivity = useMemo(() => {
    const lastActivityByProvider = new Map<string, Date | null>();
    const daysInactiveByProvider = new Map<string, number | null>();
    const hasActivityWithinWindow = new Map<InactivityWindow, Set<string>>([
      [30, new Set<string>()],
      [60, new Set<string>()],
      [90, new Set<string>()],
    ]);

    licensedHomes.forEach((provider) => {
      lastActivityByProvider.set(
        provider.id_provider,
        provider.lastPlacementActivityDate,
      );
      daysInactiveByProvider.set(
        provider.id_provider,
        provider.daysSinceLastActivity,
      );
      if (!provider.inactive30) hasActivityWithinWindow.get(30)?.add(provider.id_provider);
      if (!provider.inactive60) hasActivityWithinWindow.get(60)?.add(provider.id_provider);
      if (!provider.inactive90) hasActivityWithinWindow.get(90)?.add(provider.id_provider);
    });

    return {
      lastActivityByProvider,
      daysInactiveByProvider,
      hasActivityWithinWindow,
    };
  }, [licensedHomes]);

  const recentlyInactiveHomesByWindow =
    useMemo(() => {
      const result: Record<
        InactivityWindow,
        ProviderRecord[]
      > = {
        30: [],
        60: [],
        90: [],
      };

      (
        [30, 60, 90] as InactivityWindow[]
      ).forEach((window) => {
        const activeProviderIds =
          placementActivity
            .hasActivityWithinWindow
            .get(window) ??
          new Set<string>();

        result[window] = licensedHomes
          .filter(
            (provider) =>
              !activeProviderIds.has(
                provider.id_provider,
              ),
          )
          .sort(
            (
              firstProvider,
              secondProvider,
            ) => {
              const firstDays =
                placementActivity
                  .daysInactiveByProvider
                  .get(
                    firstProvider.id_provider,
                  );

              const secondDays =
                placementActivity
                  .daysInactiveByProvider
                  .get(
                    secondProvider.id_provider,
                  );

              if (
                firstDays === null ||
                firstDays === undefined
              ) {
                return 1;
              }

              if (
                secondDays === null ||
                secondDays === undefined
              ) {
                return -1;
              }

              return secondDays - firstDays;
            },
          );
      });

      return result;
    }, [
      licensedHomes,
      placementActivity,
    ]);

  const recentlyLapsedHomes = useMemo(
    () =>
      model.providers
        .filter((provider) => {
          const daysUntilExpiration =
            provider.daysUntilExpiration;

          return (
            !provider.isLicensed &&
            daysUntilExpiration !== null &&
            daysUntilExpiration < 0 &&
            daysUntilExpiration >=
              -RECENTLY_LAPSED_DAYS
          );
        })
        .sort(
          (
            firstProvider,
            secondProvider,
          ) =>
            (secondProvider.daysUntilExpiration ??
              Number.NEGATIVE_INFINITY) -
            (firstProvider.daysUntilExpiration ??
              Number.NEGATIVE_INFINITY),
        ),
    [model.providers],
  );

  const urgentRenewals = useMemo(
    () =>
      sortByExpirationSoonest(
        licensedHomes.filter(
          (provider) => {
            const daysUntilExpiration =
              provider.daysUntilExpiration;

            return (
              daysUntilExpiration !== null &&
              daysUntilExpiration >= 0 &&
              daysUntilExpiration <= 30
            );
          },
        ),
      ),
    [licensedHomes],
  );

  const upcomingRenewals = useMemo(
    () =>
      sortByExpirationSoonest(
        licensedHomes.filter(
          (provider) => {
            const daysUntilExpiration =
              provider.daysUntilExpiration;

            return (
              daysUntilExpiration !== null &&
              daysUntilExpiration >= 31 &&
              daysUntilExpiration <= 60
            );
          },
        ),
      ),
    [licensedHomes],
  );

  const plannedRenewals = useMemo(
    () =>
      sortByExpirationSoonest(
        licensedHomes.filter(
          (provider) => {
            const daysUntilExpiration =
              provider.daysUntilExpiration;

            return (
              daysUntilExpiration !== null &&
              daysUntilExpiration >= 61 &&
              daysUntilExpiration <= 90
            );
          },
        ),
      ),
    [licensedHomes],
  );


  const renewalProviders = useMemo(() => {
    if (renewalGroup === "urgent") {
      return urgentRenewals;
    }

    if (renewalGroup === "upcoming") {
      return upcomingRenewals;
    }

    if (renewalGroup === "planAhead") {
      return plannedRenewals;
    }

    return [];
  }, [
    renewalGroup,
    urgentRenewals,
    upcomingRenewals,
    plannedRenewals,
  ]);

  const engagementProviders = useMemo(() => {
    if (
      engagementView === "level" &&
      engagementBand
    ) {
      return engagementHomesByBand[
        engagementBand
      ];
    }

    if (
      engagementView === "recentlyInactive" &&
      inactivityWindow
    ) {
      return recentlyInactiveHomesByWindow[
        inactivityWindow
      ];
    }

    return [];
  }, [
    engagementView,
    engagementBand,
    inactivityWindow,
    engagementHomesByBand,
    recentlyInactiveHomesByWindow,
  ]);

  const selectedProviders = useMemo(() => {
    if (!view) {
      return [];
    }

    let providers: ProviderRecord[];

    if (view === "licensed") {
      providers = licensedHomes;
    } else if (view === "engagement") {
      providers = engagementProviders;
    } else if (view === "renewal") {
      providers = renewalProviders;
    } else {
      providers = recentlyLapsedHomes;
    }

    const normalizedQuery =
      query.trim().toLowerCase();

    if (normalizedQuery) {
      providers = providers.filter(
        (provider) => {
          const providerId =
            provider.id_provider.toLowerCase();

          const county =
            provider.county_provider.toLowerCase();

          return (
            providerId.includes(
              normalizedQuery,
            ) ||
            county.includes(
              normalizedQuery,
            )
          );
        },
      );
    }

    if (view !== "licensed") {
      return providers;
    }

    return [...providers].sort(
      (
        firstProvider,
        secondProvider,
      ) => {
        if (sort === "engagementAsc") {
          return (
            firstProvider.engagement -
            secondProvider.engagement
          );
        }

        if (sort === "engagementDesc") {
          return (
            secondProvider.engagement -
            firstProvider.engagement
          );
        }

        if (sort === "countyAsc") {
          return firstProvider
            .county_provider
            .localeCompare(
              secondProvider
                .county_provider,
            );
        }

        return (
          (firstProvider.daysUntilExpiration ??
            Number.POSITIVE_INFINITY) -
          (secondProvider.daysUntilExpiration ??
            Number.POSITIVE_INFINITY)
        );
      },
    );
  }, [
    view,
    query,
    sort,
    licensedHomes,
    engagementProviders,
    renewalProviders,
    recentlyLapsedHomes,
  ]);

  const openView = (
    nextView: View,
  ): void => {
    setView(nextView);
    setQuery("");

    if (nextView === "licensed") {
      setSort("engagementAsc");
    }

    if (nextView === "engagement") {
      setEngagementView(null);
      setEngagementBand(null);
      setInactivityWindow(null);
    }

    setRenewalGroup(null);

    window.setTimeout(() => {
      document
        .getElementById(
          "retention-results",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 0);
  };

  const closeResults = (): void => {
    setView(null);
    setRenewalGroup(null);
    setQuery("");
  };

  const getTitle = (): string => {
    if (view === "licensed") {
      return "Currently licensed homes";
    }

    if (view === "engagement") {
      return "Provider engagement";
    }

    if (view === "renewal") {
      return "License expiring soon";
    }

    return "Recently lapsed homes";
  };

  const getResultsDescription =
    (): string => {
      if (
        view === "engagement" &&
        engagementView === null
      ) {
        return "Select an engagement level or a recent-inactivity window to view homes.";
      }

      if (
        view === "engagement" &&
        engagementView === "level" &&
        engagementBand
      ) {
        const band =
          ENGAGEMENT_BANDS[
            engagementBand
          ];

        return `${number(
          selectedProviders.length,
        )} homes with ${band.description.toLowerCase()} lifetime engagement`;
      }

      if (
        view === "engagement" &&
        engagementView ===
          "recentlyInactive" &&
        inactivityWindow
      ) {
        return `${number(
          selectedProviders.length,
        )} licensed homes with no recorded placement activity in the past ${inactivityWindow} days`;
      }

      if (
        view === "renewal" &&
        renewalGroup === null
      ) {
        return "Select a renewal window to view homes.";
      }

      return `${number(
        selectedProviders.length,
      )} matching homes`;
    };

  const handleSortChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ): void => {
    setSort(
      event.target.value as Sort,
    );
  };

  const handleSearchChange = (
    event: ChangeEvent<HTMLInputElement>,
  ): void => {
    setQuery(event.target.value);
  };

  return (
    <>
      <div className="hero retention-hero">
        <div>
          <div className="page-title-row">
            <h1>Retention</h1>

            <button
              type="button"
              className="info-button"
              aria-label="About the retention page"
              aria-expanded={infoOpen}
              onClick={() =>
                setInfoOpen(
                  (currentValue) =>
                    !currentValue,
                )
              }
            >
              i
            </button>
          </div>

          <p>
            Track license status, renewal timing,
            and placement activity so teams can
            focus follow-up where it matters most.
          </p>
        </div>
      </div>

      {infoOpen && (
        <div className="card retention-info-panel">
          <div className="section-heading">
            <div>
              <h2>What this page shows</h2>

              <p className="muted">
                Retention means keeping foster
                homes licensed and engaged in
                accepting placements.
              </p>
            </div>

            <button
              type="button"
              className="btn"
              onClick={() =>
                setInfoOpen(false)
              }
            >
              Close
            </button>
          </div>

          <div className="retention-info-grid">
            <div>
              <h3>Engagement levels</h3>

              <p>
                Lifetime engagement is active
                placement days divided by
                licensed days. Levels are low,
                limited, moderate, and high.
              </p>
            </div>

            <div>
              <h3>Recently inactive homes</h3>

              <p>
                Currently licensed homes with
                no recorded placement activity
                during the selected 30, 60, or
                90-day period.
              </p>
            </div>

            <div>
              <h3>License expiring soon</h3>

              <p>
                Licensed homes ending within
                the next 90 days, grouped by
                renewal urgency.
              </p>
            </div>

            <div>
              <h3>Recently lapsed</h3>

              <p>
                Homes whose licenses ended
                within the last 90 days.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid retention-kpis">
        <KpiCard
          title="Currently licensed homes"
          value={number(
            licensedHomes.length,
          )}
          caption="Open the complete licensed-home list"
          onClick={() =>
            openView("licensed")
          }
          selected={view === "licensed"}
        />

        <KpiCard
          title="Recently lapsed"
          value={number(
            recentlyLapsedHomes.length,
          )}
          caption="Review licenses that ended in the past 90 days"
          onClick={() =>
            openView("lapsed")
          }
          selected={view === "lapsed"}
        />

        <RetentionActionCard
          title="Licenses approaching expiration"
          caption="See which homes expire in the next 30, 60, or 90 days and prioritize renewal follow-up."
          tone="renewal"
          onClick={() =>
            openView("renewal")
          }
          selected={view === "renewal"}
        />

        <RetentionActionCard
          title="Provider engagement"
          caption="Review engagement levels and find licensed homes with no placement activity in the last 30, 60, or 90 days."
          tone="engagement"
          onClick={() =>
            openView("engagement")
          }
          selected={
            view === "engagement"
          }
        />
      </div>

      {view && (
        <section
          id="retention-results"
          className="card section retention-results"
        >
          <BackToTop />

          <div className="section-heading">
            <div>
              <h2>{getTitle()}</h2>

              <p className="muted">
                {getResultsDescription()}
              </p>
            </div>

            <button
              type="button"
              className="btn"
              onClick={closeResults}
            >
              Close
            </button>
          </div>

          {view === "engagement" && (
            <div className="retention-toolbar retention-toolbar--engagement">
              <label className="retention-control retention-control--wide">
                <span>Engagement level</span>

                <select
                  value={engagementBand ?? ""}
                  className="retention-select retention-select--engagement"
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    if (!value) {
                      setEngagementView(null);
                      setEngagementBand(null);
                      return;
                    }

                    setEngagementView("level");
                    setEngagementBand(
                      value as EngagementBand,
                    );
                    setInactivityWindow(null);
                    setQuery("");
                  }}
                >
                  <option value="">
                    Select engagement level
                  </option>

                  <option value="low">
                    Low: less than 10%
                  </option>

                  <option value="limited">
                    Limited: 10% to 30%
                  </option>

                  <option value="moderate">
                    Moderate: more than 30% to 50%
                  </option>

                  <option value="high">
                    High: more than 50%
                  </option>
                </select>
              </label>

              <label className="retention-control retention-control--wide">
                <span>Recently inactive</span>

                <select
                  value={inactivityWindow ?? ""}
                  className="retention-select retention-select--engagement"
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    if (!value) {
                      setEngagementView(null);
                      setInactivityWindow(null);
                      return;
                    }

                    setEngagementView(
                      "recentlyInactive",
                    );
                    setInactivityWindow(
                      Number(
                        value,
                      ) as InactivityWindow,
                    );
                    setEngagementBand(null);
                    setQuery("");
                  }}
                >
                  <option value="">
                    Select inactivity period
                  </option>

                  <option value={30}>
                    No activity in 30 days
                  </option>

                  <option value={60}>
                    No activity in 60 days
                  </option>

                  <option value={90}>
                    No activity in 90 days
                  </option>
                </select>
              </label>
            </div>
          )}

          {view === "renewal" && (
            <div className="retention-toolbar retention-toolbar--renewal">
              <label className="retention-control retention-control--wide">
                <span>Renewal urgency</span>

                <select
                  value={renewalGroup ?? ""}
                  className="retention-select retention-select--renewal"
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    setRenewalGroup(
                      value
                        ? (value as RenewalGroup)
                        : null,
                    );
                    setQuery("");
                  }}
                >
                  <option value="">
                    Select renewal window
                  </option>

                  <option value="urgent">
                    Urgent: expires in 0–30 days
                  </option>

                  <option value="upcoming">
                    Upcoming: expires in 31–60 days
                  </option>

                  <option value="planAhead">
                    Plan ahead: expires in 61–90 days
                  </option>
                </select>
              </label>
            </div>
          )}

          {(
            view === "licensed" ||
            view === "lapsed" ||
            (view === "engagement" &&
              engagementView !== null) ||
            (view === "renewal" &&
              renewalGroup !== null)
          ) && (
            <>
              <div className="retention-toolbar">
                {view === "licensed" && (
                  <label className="retention-control">
                    <span>Sort</span>

                    <select
                      value={sort}
                      onChange={handleSortChange}
                    >
                      <option value="engagementAsc">
                        Engagement: low to high
                      </option>

                      <option value="engagementDesc">
                        Engagement: high to low
                      </option>

                      <option value="expirationAsc">
                        License end: soonest
                      </option>

                      <option value="countyAsc">
                        County: A to Z
                      </option>
                    </select>
                  </label>
                )}

                <label className="retention-control retention-search-control">
                  <span>Search</span>

                  <input
                    value={query}
                    onChange={handleSearchChange}
                    placeholder="Search provider ID or county"
                  />
                </label>
              </div>

              <RetentionTable
                providers={selectedProviders}
                view={view}
                engagementView={
                  engagementView
                }
                lastActivityByProvider={
                  placementActivity
                    .lastActivityByProvider
                }
                daysInactiveByProvider={
                  placementActivity
                    .daysInactiveByProvider
                }
                openProvider={openProvider}
                openRenewalReminder={
                  setRenewalReminderProvider
                }
              />
            </>
          )}
        </section>
      )}

      <Modal
        open={renewalReminderProvider !== null}
        title="Renewal reminder"
        description="Delivery integration can be connected later."
        width="520px"
        onClose={() => setRenewalReminderProvider(null)}
      >
        {renewalReminderProvider && (
          <>
            <p>
              This previews a reminder for foster home{" "}
              <strong>{renewalReminderProvider.id_provider}</strong>{" "}
              to renew their license.
            </p>
            <p className="muted">
              The reminder can also be automated based on license expiration dates.
            </p>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setRenewalReminderProvider(null)}>Close</button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}