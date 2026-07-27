import "../styles/methodology.css";

interface MetricRow {
  metric: string;
  formula: string;
  explanation: string;
}

interface MetricGroup {
  title: string;
  summary: string;
  metrics: MetricRow[];
}

const metricGroups: MetricGroup[] = [
  {
    title: "Provider activity and retention",
    summary:
      "How foster homes are classified as licensed, engaged, inactive, expiring, or recently lapsed.",
    metrics: [
      {
        metric: "Currently licensed",
        formula:
          "License start ≤ July 1, 2026 ≤ license end",
        explanation:
          "The provider's license period includes the reporting date.",
      },
      {
        metric: "Licensed days",
        formula: "Provider field: n_days_licensed",
        explanation:
          "Uses the eligible licensed-day value supplied in the provider dataset.",
      },
      {
        metric: "Active days",
        formula: "Provider field: n_days_active",
        explanation:
          "Uses the active-placement-day value supplied in the provider dataset.",
      },
      {
        metric: "Engagement",
        formula: "Active days ÷ licensed days",
        explanation:
          "Measures the share of licensed days during which the home had an active placement.",
      },
      {
        metric: "Engagement bands",
        formula:
          "Low <10% · Limited 10–30% · Moderate >30–50% · High >50%",
        explanation:
          "Groups currently licensed homes by placement engagement.",
      },
      {
        metric: "Recently inactive",
        formula:
          "Last activity < reporting date − 30, 60, or 90 days",
        explanation:
          "The home had no placement activity during the selected inactivity window.",
      },
      {
        metric: "Days until expiration",
        formula:
          "License end date − reporting date",
        explanation:
          "Positive values show days remaining. Negative values show days since expiration.",
      },
      {
        metric: "Renewal windows",
        formula:
          "Urgent 0–30 · Upcoming 31–60 · Plan ahead 61–90",
        explanation:
          "Groups licensed homes according to how soon their licenses expire.",
      },
      {
        metric: "Recently lapsed",
        formula:
          "License ended within the previous 90 days",
        explanation:
          "The license ended before the reporting date, but no more than 90 days earlier.",
      },
    ],
  },
  {
    title: "Placement geography and stability",
    summary:
      "How placement location, kinship care, and repeated placements are calculated.",
    metrics: [
      {
        metric: "Out-of-county placement",
        formula:
          "Placement county ≠ removal county",
        explanation:
          "The placement occurred outside the child's removal county.",
      },
      {
        metric: "Out-of-county rate",
        formula:
          "Out-of-county foster placements ÷ all foster placements",
        explanation:
          "Measures the share of foster-home placements occurring outside the removal county.",
      },
      {
        metric: "Kinship rate",
        formula:
          "Kinship placements ÷ all placement records",
        explanation:
          "Measures the share of placement events identified as kinship placements.",
      },
      {
        metric: "Unique children",
        formula:
          "Distinct child IDs in placement records",
        explanation:
          "A child is counted once even when several placement records exist.",
      },
      {
        metric: "Children with 2+ placements",
        formula:
          "Children with 2+ records ÷ unique children",
        explanation:
          "Measures the share of children with at least two recorded placements.",
      },
      {
        metric: "Children with 3+ placements",
        formula:
          "Children with 3+ records ÷ unique children",
        explanation:
          "Measures the share of children with at least three recorded placements.",
      },
    ],
  },
  {
    title: "Recruitment urgency",
    summary:
      "The five one-point events used to rank counties from 0 to 5.",
    metrics: [
      {
        metric: "Net home loss",
        formula:
          "+1 when ended licenses > new licenses",
        explanation:
          "The county lost more licenses than it added during the latest six months.",
      },
      {
        metric: "High out-of-county use",
        formula:
          "+1 when out-of-county rate ≥ 40%",
        explanation:
          "At least 40% of foster-home placements occurred outside the removal county.",
      },
      {
        metric: "Expiring soon",
        formula:
          "+1 when at least one license expires within 30 days",
        explanation:
          "One or more currently licensed homes are approaching expiration.",
      },
      {
        metric: "Low engagement",
        formula:
          "+1 when at least 30% of homes have engagement below 20%",
        explanation:
          "A substantial share of currently licensed homes have very low engagement.",
      },
      {
        metric: "Recruitment stalled",
        formula:
          "+1 when recent placements > 0 and new licenses = 0",
        explanation:
          "The county had recent foster-home placements but added no new licenses.",
      },
      {
        metric: "Final urgency score",
        formula:
          "Total number of triggered events",
        explanation:
          "Low priority: 0–1 · Medium priority: 2–3 · High priority: 4–5.",
      },
    ],
  },
  {
    title: "County comparison",
    summary:
      "How selected metrics are standardized and combined when comparing counties.",
    metrics: [
      {
        metric: "Normalized metric",
        formula:
          "(County value − minimum) ÷ (maximum − minimum)",
        explanation:
          "Converts different county measures to a common scale between 0 and 1.",
      },
      {
        metric: "Least-value preference",
        formula:
          "1 − normalized value",
        explanation:
          "Reverses the score when lower values represent a better match.",
      },
      {
        metric: "Combined county match",
        formula:
          "(Score₁ × Score₂ × ... × Scoreₙ)^(1 ÷ n)",
        explanation:
          "Uses a geometric mean so one strong result cannot fully cancel a poor result.",
      },
    ],
  },
];

export function MethodologyPage() {
  return (
    <>
      <div className="hero methodology-hero">
        <div>
          <h1>Methodology</h1>

          <p>
            How Foster Insights converts provider, child,
            and placement records into decision-support
            metrics.
          </p>
        </div>
      </div>

      <section className="methodology-section">
        <div className="methodology-section-heading">
          <h2>Data used</h2>

          <p className="muted">
            The Python analytics service processes three
            CSV datasets using a fixed reporting date of
            July 1, 2026.
          </p>
        </div>

        <div className="methodology-source-grid">
          <article className="methodology-source-card">
            <span className="methodology-source-number">
              01
            </span>

            <div>
              <h3>Provider data</h3>

              <p>
                License dates, county, active days,
                licensed days, and accepted ages.
              </p>
            </div>
          </article>

          <article className="methodology-source-card">
            <span className="methodology-source-number">
              02
            </span>

            <div>
              <h3>Child data</h3>

              <p>
                Child ID, age, removal date, discharge
                date, and removal county.
              </p>
            </div>
          </article>

          <article className="methodology-source-card">
            <span className="methodology-source-number">
              03
            </span>

            <div>
              <h3>Placement data</h3>

              <p>
                Placement dates, resource type, provider,
                removal county, and placement county.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="methodology-section">
        <div className="methodology-section-heading">
          <h2>Metric definitions</h2>

          <p className="muted">
            Open a section to review the formulas used for
            that part of the dashboard.
          </p>
        </div>

        <div className="methodology-groups">
          {metricGroups.map((group, index) => (
            <details
              className="methodology-group"
              key={group.title}
            >
              <summary className="methodology-group-summary">
                <div>
                  <h3>{group.title}</h3>

                  <p>{group.summary}</p>
                </div>

                <span
                  className="methodology-group-icon"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>

              <div className="methodology-table-wrapper">
                <table className="methodology-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Formula or rule</th>
                      <th>What it means</th>
                    </tr>
                  </thead>

                  <tbody>
                    {group.metrics.map((metric) => (
                      <tr key={metric.metric}>
                        <td>
                          <strong>{metric.metric}</strong>
                        </td>

                        <td>
                          <code>{metric.formula}</code>
                        </td>

                        <td>{metric.explanation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="methodology-section">
        <div className="methodology-limitations">
          <h2>Privacy and limitations</h2>

          <p>
            Only anonymous child and provider IDs are
            displayed. License dates do not explain why a
            license ended, and county mismatches do not
            measure travel distance, placement quality, or
            whether an out-of-county placement was
            appropriate.
          </p>

          <p>
            Active-day and licensed-day values come from
            the provider dataset. Recruitment thresholds
            are transparent prototype rules intended to
            support staff review, not official government
            standards, predictions, or automated
            decisions.
          </p>
        </div>
      </section>
    </>
  );
}