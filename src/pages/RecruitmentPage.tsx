import { useMemo, useState } from "react";

import { BackToTop } from "../components/BackToTop";
import { Modal } from "../components/common/Modal";
import { number, percent } from "../components/UI";
import type {
  AppModel,
  CountyRecord,
  RecruitmentEvents,
} from "../types";

import "../styles/recruitment.css";

interface RecruitmentPageProps {
  model: AppModel;
  openCounty: (name: string) => void;
}

interface EventDetail {
  key: keyof RecruitmentEvents;
  value: string;
  detail: string;
}

const eventLabels: Record<
  keyof RecruitmentEvents,
  string
> = {
  netHomeLoss: "Net loss of foster homes",
  highOutOfCounty:
    "High out-of-county placement rate",
  expiringSoon:
    "Licenses expiring within 30 days",
  lowEngagement:
    "High share of low-engagement homes",
  recruitmentStalled: "Recruitment stalled",
};

function eventDetails(
  county: CountyRecord,
): EventDetail[] {
  const metric = county.recruitment;

  return [
    {
      key: "netHomeLoss",
      value:
        metric.netLicenseChangeLast6Months > 0
          ? `+${number(
              metric.netLicenseChangeLast6Months,
            )}`
          : number(
              metric.netLicenseChangeLast6Months,
            ),
      detail: `${number(
        metric.endedLicensesLast6Months,
      )} licenses ended and ${number(
        metric.newLicensesLast6Months,
      )} started in the latest completed six months.`,
    },
    {
      key: "highOutOfCounty",
      value: percent(metric.outOfCountyRate),
      detail: `${number(
        metric.outOfCountyPlacements,
      )} of ${number(
        metric.totalFosterPlacements,
      )} foster-home placements occurred outside the removal county.`,
    },
    {
      key: "expiringSoon",
      value: number(
        metric.expiringWithin30Days,
      ),
      detail: `${number(
        metric.expiringWithin30Days,
      )} currently licensed homes expire within 30 days of the reporting date.`,
    },
    {
      key: "lowEngagement",
      value: percent(
        metric.lowEngagementRate,
      ),
      detail: `${number(
        metric.lowEngagementHomes,
      )} currently licensed homes have engagement below 20%.`,
    },
    {
      key: "recruitmentStalled",
      value: `${number(
        metric.recentFosterPlacements,
      )} placements / ${number(
        metric.newLicensesLast6Months,
      )} new homes`,
      detail: `${number(
        metric.recentFosterPlacements,
      )} foster-home placements and ${number(
        metric.newLicensesLast6Months,
      )} new licenses were recorded in the latest completed six months.`,
    },
  ];
}

export function RecruitmentPage({
  model,
  openCounty,
}: RecruitmentPageProps) {
  const [query, setQuery] = useState("");
  const [minimumScore, setMinimumScore] =
    useState(0);
  const [expandedCounty, setExpandedCounty] =
    useState<string | null>(null);
  const [metricsOpen, setMetricsOpen] =
    useState(false);

  const counties = useMemo(() => {
    const normalizedQuery = query
      .trim()
      .toLowerCase();

    return model.counties
      .filter(
        (county) =>
          county.recruitment.score >=
          minimumScore,
      )
      .filter(
        (county) =>
          !normalizedQuery ||
          county.name
            .toLowerCase()
            .includes(normalizedQuery),
      )
      .sort(
        (first, second) =>
          second.recruitment.score -
            first.recruitment.score ||
          first.name.localeCompare(second.name),
      );
  }, [
    minimumScore,
    model.counties,
    query,
  ]);

  return (
    <>
      <div className="hero recruitment-hero">
        <div>
          <h1>Recruitment urgency</h1>

          <p>
            Counties are ranked by triggered
            recruitment events. Each event adds
            exactly one point.
          </p>
        </div>

        <button
          type="button"
          className="btn"
          onClick={() =>
            setMetricsOpen(true)
          }
        >
          Metrics
        </button>
      </div>

      <div className="filters recruitment-filters">
        <input
          type="search"
          value={query}
          placeholder="Search county"
          aria-label="Search county"
          onChange={(event) =>
            setQuery(event.target.value)
          }
        />

        <select
          value={minimumScore}
          aria-label="Minimum event score"
          onChange={(event) =>
            setMinimumScore(
              Number(event.target.value),
            )
          }
        >
          <option value={0}>All scores</option>
          <option value={1}>
            At least 1 event
          </option>
          <option value={2}>
            At least 2 events
          </option>
          <option value={3}>
            At least 3 events
          </option>
          <option value={4}>
            At least 4 events
          </option>
          <option value={5}>
            All 5 events
          </option>
        </select>

        <span className="filter-count">
          {number(counties.length)} counties
        </span>
      </div>

      {counties.length === 0 ? (
        <div className="notice">
          No counties match the selected filters.
        </div>
      ) : (
        <div className="recruitment-list">
          {counties.map((county, index) => {
          const expanded =
            expandedCounty === county.name;

          const details =
            eventDetails(county);

          const triggered = details.filter(
            (item) =>
              county.recruitment.events[
                item.key
              ],
          );

          return (
            <article
              className="recruitment-row"
              key={county.name}
            >
              <button
                type="button"
                className="recruitment-row-main"
                aria-expanded={expanded}
                onClick={() =>
                  setExpandedCounty(
                    expanded
                      ? null
                      : county.name,
                  )
                }
              >
                <span className="recruitment-rank">
                  {index + 1}
                </span>

                <strong>
                  {county.name} County
                </strong>

                <span className="recruitment-event-chips">
                  {triggered.length > 0 ? (
                    triggered.map((item) => (
                      <span
                        className="reason-chip"
                        key={item.key}
                      >
                        {eventLabels[item.key]}
                      </span>
                    ))
                  ) : (
                    <span className="reason-chip">
                      No events triggered
                    </span>
                  )}
                </span>

                <span className="recruitment-score">
                  {county.recruitment.score}/5
                </span>

                <span
                  className={`simple-chevron ${
                    expanded ? "open" : ""
                  }`}
                  aria-hidden="true"
                >
                  ⌄
                </span>
              </button>

              {expanded ? (
                <div className="recruitment-row-details">
                  <div className="recruitment-detail-grid">
                    {details.map((item) => (
                      <div
                        className={`metric-detail ${
                          county.recruitment
                            .events[item.key]
                            ? "triggered"
                            : ""
                        }`}
                        key={item.key}
                      >
                        <div className="metric-detail-heading">
                          <h3>
                            {
                              eventLabels[
                                item.key
                              ]
                            }
                          </h3>

                          <strong>
                            {item.value}
                          </strong>
                        </div>

                        <p>{item.detail}</p>
                      </div>
                    ))}
                  </div>

                  <div className="actions">
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        openCounty(
                          county.name,
                        )
                      }
                    >
                      View county details
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          );
          })}
        </div>
      )}

      <Modal
        open={metricsOpen}
        title="How the score works"
        description="Five independent recruitment events are evaluated for every county."
        onClose={() =>
          setMetricsOpen(false)
        }
      >
        <div className="score-rule">
          Each triggered event adds exactly 1
          point. Scores range from 0 to 5.
        </div>

        <div className="modal-metric-list">
          <div className="modal-metric">
            <b>+1</b>

            <div>
              <h3>
                Net loss of foster homes
              </h3>

              <p>
                More licenses ended than started
                in the latest completed six
                months.
              </p>
            </div>
          </div>

          <div className="modal-metric">
            <b>+1</b>

            <div>
              <h3>
                High out-of-county placement
                rate
              </h3>

              <p>
                At least 40% of foster-home
                placements occurred outside the
                removal county.
              </p>
            </div>
          </div>

          <div className="modal-metric">
            <b>+1</b>

            <div>
              <h3>
                Licenses expiring within 30
                days
              </h3>

              <p>
                At least one currently licensed
                home expires within 30 days.
              </p>
            </div>
          </div>

          <div className="modal-metric">
            <b>+1</b>

            <div>
              <h3>
                High share of low-engagement
                homes
              </h3>

              <p>
                At least 30% of currently
                licensed homes have engagement
                below 20%.
              </p>
            </div>
          </div>

          <div className="modal-metric">
            <b>+1</b>

            <div>
              <h3>
                Recruitment stalled
              </h3>

              <p>
                The county had foster-home
                placements but licensed no new
                foster homes in the latest
                completed six months.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      <BackToTop />
    </>
  );
}