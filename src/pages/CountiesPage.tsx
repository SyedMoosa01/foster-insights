/**
 * Counties page.
 *
 * Displays county-level recruitment, licensing, placement, kinship, and
 * placement-stability metrics. Supports county search, combined multi-metric
 * comparison, county detail views, provider navigation, and back-to-top
 * navigation.
 */

import {
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import { BackToTop } from "../components/BackToTop";
import "../styles/counties.css";
import { Modal } from "../components/common/Modal";

import {
  Badge,
  Empty,
  KpiCard,
  Table,
  number,
  percent,
} from "../components/UI";

import type {
  AppModel,
  CountyRecord,
  CountyPlacementStats,
} from "../types";

type ComparisonField =
  | "children"
  | "licensedHomes"
  | "activeHomes"
  | "outRate"
  | "kinshipRate"
  | "childrenWithTwoPlusPlacements"
  | "childrenWithThreePlusPlacements"
  | "inactiveHomes";

type ComparisonDirection =
  | "most"
  | "least";

interface ComparisonRule {
  id: number;
  field: ComparisonField;
  direction: ComparisonDirection;
}

interface CountyListProps {
  counties: CountyRecord[];
  placementStatsByCounty: Map<
    string,
    CountyPlacementStats
  >;
  openCounty: (name: string) => void;
  openMetricChart: () => void;
}

interface CountiesPageProps {
  model: AppModel;
  selectedCounty: string | null;
  openCounty: (name: string) => void;
  closeCounty: () => void;
  openProvider: (id: string) => void;
}

interface CountyDetailProps {
  model: AppModel;
  county: CountyRecord;
  placementStats: CountyPlacementStats;
  closeCounty: () => void;
  openProvider: (id: string) => void;
  openMetricChart: () => void;
}

interface MetricRange {
  minimum: number;
  maximum: number;
}

interface CountyComparisonRow {
  county: CountyRecord;
  placementStats: CountyPlacementStats;
  matchScore: number;
}

type ReviewStatus =
  | "good"
  | "watch"
  | "focus";

interface CountyReviewMetric {
  label: string;
  value: string;
  status: ReviewStatus;
}

const EMPTY_PLACEMENT_STATS: CountyPlacementStats = {
  totalPlacements: 0,
  uniqueChildren: 0,
  kinshipPlacements: 0,
  kinshipRate: 0,
  childrenWithTwoPlusPlacements: 0,
  childrenWithTwoPlusPlacementsRate: 0,
  childrenWithThreePlusPlacements: 0,
  childrenWithThreePlusPlacementsRate: 0,
};

const COMPARISON_FIELD_LABELS: Record<
  ComparisonField,
  string
> = {
  children: "Children currently in care",
  licensedHomes: "Licensed homes",
  activeHomes: "Active homes",
  outRate: "Out-of-county rate",
  kinshipRate: "Share of placements with kin",
  childrenWithTwoPlusPlacements:
    "Children with 2+ placements",
  childrenWithThreePlusPlacements:
    "Children with 3+ placements",
  inactiveHomes: "Inactive homes",
};

const COMPARISON_FIELDS = Object.keys(
  COMPARISON_FIELD_LABELS,
) as ComparisonField[];

function getComparisonValue(
  county: CountyRecord,
  placementStats: CountyPlacementStats,
  field: ComparisonField,
): number {
  if (field === "children") {
    return county.children;
  }

  if (field === "licensedHomes") {
    return county.licensedHomes;
  }

  if (field === "activeHomes") {
    return county.activeHomes;
  }

  if (field === "outRate") {
    return county.outRate;
  }

  if (field === "kinshipRate") {
    return placementStats.kinshipRate;
  }

  if (
    field ===
    "childrenWithTwoPlusPlacements"
  ) {
    return (
      placementStats
        .childrenWithTwoPlusPlacements
    );
  }

  if (
    field ===
    "childrenWithThreePlusPlacements"
  ) {
    return (
      placementStats
        .childrenWithThreePlusPlacements
    );
  }

  return county.inactiveHomes;
}

function getMetricRange(
  counties: CountyRecord[],
  placementStatsByCounty: Map<
    string,
    CountyPlacementStats
  >,
  field: ComparisonField,
): MetricRange {
  const values = counties.map((county) =>
    getComparisonValue(
      county,
      placementStatsByCounty.get(
        county.name,
      ) ?? EMPTY_PLACEMENT_STATS,
      field,
    ),
  );

  if (values.length === 0) {
    return {
      minimum: 0,
      maximum: 0,
    };
  }

  return {
    minimum: Math.min(...values),
    maximum: Math.max(...values),
  };
}

function normalizeValue(
  value: number,
  range: MetricRange,
): number {
  const difference =
    range.maximum - range.minimum;

  if (difference === 0) {
    return 0.5;
  }

  return (
    (value - range.minimum) /
    difference
  );
}

function calculateCombinedScore(
  county: CountyRecord,
  placementStats: CountyPlacementStats,
  rules: ComparisonRule[],
  ranges: Map<ComparisonField, MetricRange>,
): number {
  if (rules.length === 0) {
    return 0;
  }

  const preferenceScores = rules.map((rule) => {
    const range = ranges.get(rule.field);

    if (!range) {
      return 0;
    }

    const rawValue = getComparisonValue(
      county,
      placementStats,
      rule.field,
    );

    const normalizedValue = normalizeValue(
      rawValue,
      range,
    );

    return rule.direction === "most"
      ? normalizedValue
      : 1 - normalizedValue;
  });

  const adjustedScores = preferenceScores.map(
    (score) => Math.max(score, 0.001),
  );

  const scoreProduct = adjustedScores.reduce(
    (product, score) => product * score,
    1,
  );

  return Math.pow(
    scoreProduct,
    1 / adjustedScores.length,
  );
}

function formatMatchScore(
  score: number,
): string {
  return `${Math.round(score * 100)}%`;
}


function judgeRate(
  value: number,
  goodMaximum: number,
  watchMaximum: number,
): ReviewStatus {
  if (value < goodMaximum) {
    return "good";
  }

  if (value <= watchMaximum) {
    return "watch";
  }

  return "focus";
}


function getStatusLabel(
  status: ReviewStatus,
): string {
  if (status === "good") {
    return "Good";
  }

  if (status === "watch") {
    return "Watch";
  }

  return "Needs focus";
}

function getCountyReviewMetrics(
  county: CountyRecord,
  placementStats: CountyPlacementStats,
): CountyReviewMetric[] {
  const inactiveHomeRate =
    county.licensedHomes > 0
      ? county.inactiveHomes /
        county.licensedHomes
      : 0;

  return [
    {
      label: "Out-of-county placements",
      value: percent(county.outRate),
      status: judgeRate(
        county.outRate,
        0.1,
        0.2,
      ),
    },
    {
      label: "Children with 2+ placements",
      value: percent(
        placementStats
          .childrenWithTwoPlusPlacementsRate,
      ),
      status: judgeRate(
        placementStats
          .childrenWithTwoPlusPlacementsRate,
        0.2,
        0.35,
      ),
    },
    {
      label: "Children with 3+ placements",
      value: percent(
        placementStats
          .childrenWithThreePlusPlacementsRate,
      ),
      status: judgeRate(
        placementStats
          .childrenWithThreePlusPlacementsRate,
        0.1,
        0.2,
      ),
    },
    {
      label: "Inactive licensed homes",
      value: percent(inactiveHomeRate),
      status: judgeRate(
        inactiveHomeRate,
        0.15,
        0.3,
      ),
    },
  ];
}

function getCountyOverview(
  reviewMetrics: CountyReviewMetric[],
): string {
  const focusMetrics =
    reviewMetrics.filter(
      (metric) =>
        metric.status === "focus",
    );

  const watchMetrics =
    reviewMetrics.filter(
      (metric) =>
        metric.status === "watch",
    );

  if (focusMetrics.length === 0) {
    if (watchMetrics.length === 0) {
      return "The available metrics do not indicate any significant concerns for this county at this time.";
    }

    const watchLabels = watchMetrics.map(
      (metric) =>
        metric.label.toLowerCase(),
    );

    return `No area currently meets the needs-focus threshold. ${watchLabels.join(
      ", ",
    )} should continue to be monitored.`;
  }

  const focusLabels = focusMetrics.map(
    (metric) =>
      metric.label.toLowerCase(),
  );

  if (focusLabels.length === 1) {
    return `The clearest area of concern is ${focusLabels[0]}. This indicator is above the dashboard's needs-focus threshold.`;
  }

  const lastLabel = focusLabels.pop();

  return `The county shows elevated concern across ${focusLabels.join(
    ", ",
  )}, and ${lastLabel}. These indicators are above the dashboard's needs-focus thresholds and warrant closer review.`;
}

function MetricChartModal({ close }: { close: () => void }) {
  return (
    <Modal
      open
      title="Metric chart"
      description="These dashboard review thresholds judge each county independently. They are not official government standards."
      width="900px"
      onClose={close}
    >
      <Table headers={["Metric", "Good", "Watch", "Needs focus"]}>
        <tr><td><b>Out-of-county placement rate</b></td><td>Under 10%</td><td>10% to 20%</td><td>Above 20%</td></tr>
        <tr><td><b>Children with 2+ placements</b></td><td>Under 20%</td><td>20% to 35%</td><td>Above 35%</td></tr>
        <tr><td><b>Children with 3+ placements</b></td><td>Under 10%</td><td>10% to 20%</td><td>Above 20%</td></tr>
        <tr><td><b>Inactive-home rate</b></td><td>Under 15%</td><td>15% to 30%</td><td>Above 30%</td></tr>
      </Table>
      <div className="notice section"><b>Informational only:</b> Share of placements with kin is displayed but is not rated.</div>
    </Modal>
  );
}

export function CountiesPage({
  model,
  selectedCounty,
  openCounty,
  closeCounty,
  openProvider,
}: CountiesPageProps) {
  const [showMetricChart, setShowMetricChart] =
    useState(false);

  const placementStatsByCounty = useMemo(
    () =>
      new Map(
        model.counties.map((county) => [
          county.name,
          county.placementStats,
        ]),
      ),
    [model.counties],
  );

  const county = selectedCounty
    ? model.counties.find(
        (currentCounty) =>
          currentCounty.name ===
          selectedCounty,
      )
    : null;

  return (
    <>
      {selectedCounty ? (
        county ? (
          <CountyDetail
            model={model}
            county={county}
            placementStats={
              placementStatsByCounty.get(
                county.name,
              ) ?? EMPTY_PLACEMENT_STATS
            }
            closeCounty={closeCounty}
            openProvider={openProvider}
            openMetricChart={() =>
              setShowMetricChart(true)
            }
          />
        ) : (
          <div className="error-box">
            County not found.
          </div>
        )
      ) : (
        <CountyList
          counties={model.counties}
          placementStatsByCounty={
            placementStatsByCounty
          }
          openCounty={openCounty}
          openMetricChart={() =>
            setShowMetricChart(true)
          }
        />
      )}

      {showMetricChart && (
        <MetricChartModal
          close={() =>
            setShowMetricChart(false)
          }
        />
      )}

      <BackToTop />
    </>
  );
}

function CountyList({
  counties,
  placementStatsByCounty,
  openCounty,
  openMetricChart,
}: CountyListProps) {
  const [query, setQuery] =
    useState("");

  const [
    comparisonRules,
    setComparisonRules,
  ] = useState<ComparisonRule[]>([]);

  const [nextRuleId, setNextRuleId] =
    useState(1);

  const metricRanges = useMemo(() => {
    const ranges = new Map<
      ComparisonField,
      MetricRange
    >();

    for (const field of COMPARISON_FIELDS) {
      ranges.set(
        field,
        getMetricRange(
          counties,
          placementStatsByCounty,
          field,
        ),
      );
    }

    return ranges;
  }, [
    counties,
    placementStatsByCounty,
  ]);

  const visibleCounties = useMemo<
    CountyComparisonRow[]
  >(() => {
    const normalizedQuery =
      query.trim().toLowerCase();

    const filteredCounties =
      counties.filter((county) =>
        county.name
          .toLowerCase()
          .includes(normalizedQuery),
      );

    if (comparisonRules.length === 0) {
      return filteredCounties
        .map((county) => ({
          county,
          placementStats:
            placementStatsByCounty.get(
              county.name,
            ) ?? EMPTY_PLACEMENT_STATS,
          matchScore: 0,
        }))
        .sort((firstRow, secondRow) =>
          firstRow.county.name.localeCompare(
            secondRow.county.name,
          ),
        );
    }

    return filteredCounties
      .map((county) => {
        const placementStats =
          placementStatsByCounty.get(
            county.name,
          ) ?? EMPTY_PLACEMENT_STATS;

        return {
          county,
          placementStats,
          matchScore:
            calculateCombinedScore(
              county,
              placementStats,
              comparisonRules,
              metricRanges,
            ),
        };
      })
      .sort(
        (firstRow, secondRow) =>
          secondRow.matchScore -
            firstRow.matchScore ||
          firstRow.county.name.localeCompare(
            secondRow.county.name,
          ),
      );
  }, [
    counties,
    query,
    comparisonRules,
    metricRanges,
    placementStatsByCounty,
  ]);

  const availableFields = useMemo(
    () =>
      COMPARISON_FIELDS.filter(
        (field) =>
          !comparisonRules.some(
            (rule) =>
              rule.field === field,
          ),
      ),
    [comparisonRules],
  );

  const handleSearchChange = (
    event: ChangeEvent<HTMLInputElement>,
  ): void => {
    setQuery(event.target.value);
  };

  const addComparisonRule = (): void => {
    const firstAvailableField =
      availableFields[0];

    if (!firstAvailableField) {
      return;
    }

    setComparisonRules((currentRules) => [
      ...currentRules,
      {
        id: nextRuleId,
        field: firstAvailableField,
        direction: "most",
      },
    ]);

    setNextRuleId(
      (currentId) => currentId + 1,
    );
  };

  const removeComparisonRule = (
    ruleId: number,
  ): void => {
    setComparisonRules((currentRules) =>
      currentRules.filter(
        (rule) => rule.id !== ruleId,
      ),
    );
  };

  const updateComparisonField = (
    ruleId: number,
    field: ComparisonField,
  ): void => {
    setComparisonRules((currentRules) => {
      const fieldAlreadySelected =
        currentRules.some(
          (rule) =>
            rule.id !== ruleId &&
            rule.field === field,
        );

      if (fieldAlreadySelected) {
        return currentRules;
      }

      return currentRules.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              field,
            }
          : rule,
      );
    });
  };

  const updateComparisonDirection = (
    ruleId: number,
    direction: ComparisonDirection,
  ): void => {
    setComparisonRules((currentRules) =>
      currentRules.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              direction,
            }
          : rule,
      ),
    );
  };

  const clearComparisonRules = (): void => {
    setComparisonRules([]);
  };

  const clearAll = (): void => {
    setQuery("");
    setComparisonRules([]);
  };

  const openCountyFromKeyboard = (
    event: KeyboardEvent<HTMLTableRowElement>,
    countyName: string,
  ): void => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      openCounty(countyName);
    }
  };

  return (
    <>
<div className="hero">
        <div>
          <h1>Counties</h1>

          <p>
            Browse licensing, kinship, placement
            stability, and local placement conditions
            county by county.
          </p>

          <p className="muted">
            Kinship and repeated-placement metrics use
            the full placement history in the latest
            uploaded placement file.
          </p>
        </div>

        <button
          type="button"
          className="btn"
          onClick={openMetricChart}
        >
          Metric chart
        </button>
      </div>

      <div className="filters county-filters">
        <label className="county-search">
          <span className="sr-only">
            Search counties
          </span>

          <input
            type="search"
            value={query}
            onChange={handleSearchChange}
            placeholder="Search county"
            aria-label="Search counties"
          />
        </label>

        <span className="filter-count">
          {number(visibleCounties.length)} counties
        </span>

        {(query ||
          comparisonRules.length > 0) && (
          <button
            type="button"
            className="btn"
            onClick={clearAll}
          >
            Clear all
          </button>
        )}
      </div>

      <div className="card section comparison-builder">
        <div className="section-heading">
          <div>
            <h2>Compare counties</h2>

            <p className="muted">
              Select multiple metrics and choose
              whether you prefer the most or the
              least. A county must perform well across
              all selected metrics to rank near the
              top. One strong result cannot cancel out
              a poor result on another selected metric.
            </p>
          </div>

          <div className="comparison-builder-actions">
            <button
              type="button"
              className="btn"
              onClick={addComparisonRule}
              disabled={
                availableFields.length === 0
              }
            >
              + Add metric
            </button>

            {comparisonRules.length > 0 && (
              <button
                type="button"
                className="btn"
                onClick={clearComparisonRules}
              >
                Clear comparison
              </button>
            )}
          </div>
        </div>

        {comparisonRules.length === 0 ? (
          <div className="notice">
            Add metrics such as Out-of-county
            rate: Most, Share of placements with
            kin: Most, or Children with 3+
            placements: Most.
          </div>
        ) : (
          <div className="comparison-rules">
            {comparisonRules.map(
              (rule, index) => (
                <div
                  className="comparison-rule"
                  key={rule.id}
                >
                  <span className="comparison-rule-number">
                    {index + 1}
                  </span>

                  <label>
                    <span>Metric</span>

                    <select
                      value={rule.field}
                      onChange={(
                        event: ChangeEvent<HTMLSelectElement>,
                      ) =>
                        updateComparisonField(
                          rule.id,
                          event.target
                            .value as ComparisonField,
                        )
                      }
                    >
                      {COMPARISON_FIELDS.map(
                        (field) => {
                          const isSelectedElsewhere =
                            comparisonRules.some(
                              (otherRule) =>
                                otherRule.id !==
                                  rule.id &&
                                otherRule.field ===
                                  field,
                            );

                          return (
                            <option
                              key={field}
                              value={field}
                              disabled={
                                isSelectedElsewhere
                              }
                            >
                              {
                                COMPARISON_FIELD_LABELS[
                                  field
                                ]
                              }
                              {isSelectedElsewhere
                                ? " (already selected)"
                                : ""}
                            </option>
                          );
                        },
                      )}
                    </select>
                  </label>

                  <label>
                    <span>Preference</span>

                    <select
                      value={rule.direction}
                      onChange={(
                        event: ChangeEvent<HTMLSelectElement>,
                      ) =>
                        updateComparisonDirection(
                          rule.id,
                          event.target
                            .value as ComparisonDirection,
                        )
                      }
                    >
                      <option value="most">
                        Most
                      </option>

                      <option value="least">
                        Least
                      </option>
                    </select>
                  </label>

                  <button
                    type="button"
                    className="btn comparison-remove"
                    onClick={() =>
                      removeComparisonRule(
                        rule.id,
                      )
                    }
                    aria-label={`Remove ${
                      COMPARISON_FIELD_LABELS[
                        rule.field
                      ]
                    } comparison`}
                  >
                    Remove
                  </button>
                </div>
              ),
            )}
          </div>
        )}

        {comparisonRules.length > 0 && (
          <div className="comparison-summary">
            <strong>
              Ranking counties by:
            </strong>

            <div className="comparison-summary-items">
              {comparisonRules.map(
                (rule) => (
                  <span
                    className="comparison-summary-item"
                    key={rule.id}
                  >
                    {
                      COMPARISON_FIELD_LABELS[
                        rule.field
                      ]
                    }
                    :{" "}
                    {rule.direction === "most"
                      ? "Most"
                      : "Least"}
                  </span>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      {visibleCounties.length === 0 ? (
        <Empty>
          No counties match your search.
        </Empty>
      ) : (
        <div className="county-results-table">
          <Table
            headers={[
              "County",
            "Children currently in care",
            "Licensed homes",
            "Active homes",
            "Out-of-county",
            "Kinship share",
            "Children with 2+ placements",
            "Children with 3+ placements",
            ...(comparisonRules.length > 0
              ? ["Combined match"]
              : []),
          ]}
        >
          {visibleCounties.map(
            ({
              county,
              placementStats,
              matchScore,
            }) => (
              <tr
                key={county.name}
                role="button"
                tabIndex={0}
                onClick={() =>
                  openCounty(county.name)
                }
                onKeyDown={(event) =>
                  openCountyFromKeyboard(
                    event,
                    county.name,
                  )
                }
              >
                <td>
                  <b>{county.name}</b>
                </td>

                <td>
                  {number(county.children)}
                </td>

                <td>
                  {number(
                    county.licensedHomes,
                  )}
                </td>

                <td>
                  {number(
                    county.activeHomes,
                  )}
                </td>

                <td>
                  {percent(county.outRate)}
                </td>

                <td>
                  {percent(
                    placementStats.kinshipRate,
                  )}
                </td>

                <td>
                  {percent(
                    placementStats
                      .childrenWithTwoPlusPlacementsRate,
                  )}
                </td>

                <td>
                  {percent(
                    placementStats
                      .childrenWithThreePlusPlacementsRate,
                  )}
                </td>

                {comparisonRules.length > 0 && (
                  <td>
                    <strong>
                      {formatMatchScore(
                        matchScore,
                      )}
                    </strong>
                  </td>
                )}
              </tr>
            ),
          )}
          </Table>
        </div>
      )}
    </>
  );
}

function CountyDetail({
  model,
  county,
  placementStats,
  closeCounty,
  openProvider,
  openMetricChart,
}: CountyDetailProps) {
  const providers = useMemo(
    () =>
      model.providers
        .filter(
          (provider) =>
            provider.county_provider ===
              county.name &&
            provider.isLicensed,
        )
        .sort(
          (
            firstProvider,
            secondProvider,
          ) =>
            secondProvider.outreachScore -
            firstProvider.outreachScore,
        )
        .slice(0, 50),
    [
      county.name,
      model.providers,
    ],
  );

  const reviewMetrics =
    getCountyReviewMetrics(
      county,
      placementStats,
    );

  const countyOverview =
    getCountyOverview(reviewMetrics);

  const openProviderFromKeyboard = (
    event: KeyboardEvent<HTMLTableRowElement>,
    providerId: string,
  ): void => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      openProvider(providerId);
    }
  };

  return (
    <>
      <div className="hero">
        <div>
          <button
            type="button"
            className="back-link back-link-highlighted"
            onClick={closeCounty}
          >
            ← Back to counties
          </button>

          <h1>{county.name} County</h1>

          <p>
            Licensing, kinship, placement stability,
            and local placement conditions for
            children from this county.
          </p>

          <p className="muted">
            Kinship and repeated-placement metrics use
            the full placement history in the latest
            uploaded placement file.
          </p>
        </div>

        <div className="county-detail-actions">
          <button
            type="button"
            className="btn"
            onClick={openMetricChart}
          >
            Metric chart
          </button>

          <Badge priority={county.priority} />
        </div>
      </div>

      <div className="grid kpis">
        <KpiCard
          title="Children currently in care"
          value={number(county.children)}
        />

        <KpiCard
          title="Total children placement"
          value={number(
            placementStats.uniqueChildren,
          )}
        />

        <KpiCard
          title="Licensed homes"
          value={number(
            county.licensedHomes,
          )}
        />

        <KpiCard
          title="Active homes"
          value={number(county.activeHomes)}
        />

        <KpiCard
          title="Out-of-county rate"
          value={percent(county.outRate)}
        />

        <KpiCard
          title="Share of placements with kin"
          value={`${percent(
            placementStats.kinshipRate,
          )} (${number(
            placementStats.kinshipPlacements,
          )} out of ${number(
            placementStats.totalPlacements,
          )} placements)`}
        />

        <KpiCard
          title="Children with 2+ placements"
          value={`${percent(
            placementStats
              .childrenWithTwoPlusPlacementsRate,
          )} (${number(
            placementStats
              .childrenWithTwoPlusPlacements,
          )})`}
        />

        <KpiCard
          title="Children with 3+ placements"
          value={`${percent(
            placementStats
              .childrenWithThreePlusPlacementsRate,
          )} (${number(
            placementStats
              .childrenWithThreePlusPlacements,
          )})`}
        />

        <KpiCard
          title="Inactive homes"
          value={number(
            county.inactiveHomes,
          )}
        />

        <KpiCard
          title="Placement events in history"
          value={number(
            placementStats.totalPlacements,
          )}
        />
      </div>

      <div className="callout section">
        <b>County overview:</b>{" "}
        {countyOverview}
      </div>
<div className="card section">
        <h2>Local licensed homes</h2>

        {providers.length === 0 ? (
          <Empty>
            No currently licensed homes were
            found in this county.
          </Empty>
        ) : (
          <div className="local-licensed-homes-table">
            <Table
              headers={[
                "Provider",
                "License end",
                "Engagement",
                "Active days",
                "Priority",
              ]}
            >
            {providers.map((provider) => (
              <tr
                key={provider.id_provider}
                role="button"
                tabIndex={0}
                onClick={() =>
                  openProvider(
                    provider.id_provider,
                  )
                }
                onKeyDown={(event) =>
                  openProviderFromKeyboard(
                    event,
                    provider.id_provider,
                  )
                }
              >
                <td>
                  <b>
                    {provider.id_provider}
                  </b>
                </td>

                <td>
                  {
                    provider.license_end_date
                  }
                </td>

                <td>
                  {percent(
                    provider.engagement,
                  )}
                </td>

                <td>
                  {number(
                    provider.activeDays,
                  )}
                </td>

                <td>
                  <Badge
                    priority={
                      provider.outreachPriority
                    }
                  />
                </td>
              </tr>
            ))}
            </Table>
          </div>
        )}
      </div>
    </>
  );
}