/**
 * Foster Homes page.
 *
 * Displays the complete provider directory, supports filtering by license
 * status, allows searching by provider ID or county, and opens a detailed
 * provider view with license information, engagement metrics, and placement
 * history.
 */

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import { BackToTop } from "../components/BackToTop";
import {
  Badge,
  Table,
  number,
  percent,
} from "../components/UI";
import type {
  AppModel,
  ProviderRecord,
} from "../types";

import "../styles/providers.css";

type ProviderStatusFilter =
  | "all"
  | "licensed"
  | "expired";

interface ProvidersPageProps {
  model: AppModel;
  selectedProvider: string | null;
  openProvider: (id: string) => void;
  closeProvider: () => void;
}

interface ProviderListProps {
  model: AppModel;
  openProvider: (id: string) => void;
}

interface ProviderDetailProps {
  model: AppModel;
  id: string;
  closeProvider: () => void;
}

const MAX_VISIBLE_PROVIDERS = 100;
const SEARCH_DELAY_MS = 200;

function LicenseCheckNote() {
  return (
    <p className="license-check-note">
      License status is based on the reporting date and
      the latest uploaded license end date.
    </p>
  );
}

function getProviderStatusLabel(
  provider: ProviderRecord,
): string {
  return provider.isLicensed
    ? "Currently licensed"
    : "Expired";
}

function getProviderStatusPriority(
  provider: ProviderRecord,
): "low" | "neutral" {
  return provider.isLicensed
    ? "low"
    : "neutral";
}

export function ProvidersPage({
  model,
  selectedProvider,
  openProvider,
  closeProvider,
}: ProvidersPageProps) {
  return (
    <>
      {selectedProvider ? (
        <ProviderDetail
          model={model}
          id={selectedProvider}
          closeProvider={closeProvider}
        />
      ) : (
        <ProviderList
          model={model}
          openProvider={openProvider}
        />
      )}

      <BackToTop />
    </>
  );
}

function ProviderList({
  model,
  openProvider,
}: ProviderListProps) {
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] =
    useState("");

  const [status, setStatus] =
    useState<ProviderStatusFilter>("all");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(query);
    }, SEARCH_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);

  const providers = useMemo(() => {
    const normalizedQuery = searchQuery
      .trim()
      .toLowerCase();

    return model.providers
      .filter((provider) => {
        if (status === "licensed") {
          return provider.isLicensed;
        }

        if (status === "expired") {
          return !provider.isLicensed;
        }

        return true;
      })
      .filter((provider) => {
        if (!normalizedQuery) {
          return true;
        }

        const providerId =
          provider.id_provider.toLowerCase();

        const county =
          provider.county_provider.toLowerCase();

        return (
          providerId.includes(normalizedQuery) ||
          county.includes(normalizedQuery)
        );
      })
      .sort(
        (firstProvider, secondProvider) =>
          firstProvider.county_provider.localeCompare(
            secondProvider.county_provider,
          ) ||
          firstProvider.id_provider.localeCompare(
            secondProvider.id_provider,
          ),
      );
  }, [
    model.providers,
    searchQuery,
    status,
  ]);

  const visibleProviders = useMemo(
    () =>
      providers.slice(
        0,
        MAX_VISIBLE_PROVIDERS,
      ),
    [providers],
  );

  const handleStatusChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ): void => {
    setStatus(
      event.target.value as ProviderStatusFilter,
    );
  };

  const isSearchUpdating =
    query !== searchQuery;

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
          <h1>Foster homes</h1>

          <p>
            Complete provider directory using IDs,
            including currently licensed and expired
            homes.
          </p>

          <LicenseCheckNote />
        </div>
      </div>

      <div className="filters providers-filters">
        <input
          type="search"
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Search provider ID or county"
          aria-label="Search foster homes"
        />

        <select
          value={status}
          onChange={handleStatusChange}
          aria-label="Filter by license status"
        >
          <option value="all">
            All homes
          </option>

          <option value="licensed">
            Currently licensed
          </option>

          <option value="expired">
            Expired
          </option>
        </select>

        <span
          className="filter-count"
          aria-live="polite"
        >
          {isSearchUpdating
            ? "Searching…"
            : providers.length >
                MAX_VISIBLE_PROVIDERS
              ? `Showing ${number(
                  visibleProviders.length,
                )} of ${number(
                  providers.length,
                )} homes`
              : `${number(
                  providers.length,
                )} homes`}
        </span>
      </div>

      <Table
        headers={[
          "Provider",
          "County",
          "License start",
          "License end",
          "Status",
          "Active days",
          "Licensed days",
          "Engagement",
        ]}
      >
        {visibleProviders.map(
          (provider) => (
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
                {provider.county_provider}
              </td>

              <td>
                {provider.license_start_date}
              </td>

              <td>
                {provider.license_end_date}
              </td>

              <td>
                <Badge
                  priority={getProviderStatusPriority(
                    provider,
                  )}
                  label={getProviderStatusLabel(
                    provider,
                  )}
                />
              </td>

              <td>
                {number(provider.activeDays)}
              </td>

              <td>
                {number(
                  provider.licensedDays,
                )}
              </td>

              <td>
                {percent(
                  provider.engagement,
                )}
              </td>
            </tr>
          ),
        )}
      </Table>

      {providers.length >
        MAX_VISIBLE_PROVIDERS && (
        <div className="notice">
          Only the first{" "}
          {number(
            MAX_VISIBLE_PROVIDERS,
          )} matching homes are shown. Use the
          search or license-status filter to narrow
          the results.
        </div>
      )}
    </>
  );
}

function ProviderDetail({
  model,
  id,
  closeProvider,
}: ProviderDetailProps) {
  const provider =
    model.providerById.get(id);

  const placements = useMemo(
    () =>
      model.fosterPlacements
        .filter(
          (placement) =>
            placement.id_provider === id,
        )
        .sort(
          (
            firstPlacement,
            secondPlacement,
          ) =>
            (firstPlacement.start?.getTime() ??
              0) -
            (secondPlacement.start?.getTime() ??
              0),
        ),
    [
      id,
      model.fosterPlacements,
    ],
  );

  if (!provider) {
    return (
      <div className="error-box">
        Provider not found.
      </div>
    );
  }

  const daysUntilExpiration =
    provider.daysUntilExpiration;

  const expirationLabel =
    daysUntilExpiration === null
      ? "—"
      : provider.isLicensed
        ? `${daysUntilExpiration} days`
        : `${Math.abs(
            daysUntilExpiration,
          )} days ago`;

  const reviewContext =
    provider.outreachReasons.length > 0
      ? provider.outreachReasons.join("; ")
      : "No urgent outreach indicators.";

  return (
    <>
      <div className="hero">
        <div>
          <button
            type="button"
            className="back-link"
            onClick={closeProvider}
          >
            ← Foster homes
          </button>

          <h1>
            Foster home{" "}
            {provider.id_provider}
          </h1>

          <p>
            {provider.county_provider} County
            {" · "}
            Anonymous provider record
          </p>

          <LicenseCheckNote />
        </div>

        <Badge
          priority={getProviderStatusPriority(
            provider,
          )}
          label={getProviderStatusLabel(
            provider,
          )}
        />
      </div>

      <div className="grid detail-grid">
        <div className="card">
          <h2>
            License and preferences
          </h2>

          <div className="metric-list">
            <div>
              License start

              <strong>
                {
                  provider.license_start_date
                }
              </strong>
            </div>

            <div>
              License end

              <strong>
                {
                  provider.license_end_date
                }
              </strong>
            </div>

            <div>
              Accepted ages

              <strong>
                {provider.minAge}
                {"–"}
                {provider.maxAge}
              </strong>
            </div>

            <div>
              {provider.isLicensed
                ? "Days until expiration"
                : "Expired"}

              <strong>
                {expirationLabel}
              </strong>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>
            Placement engagement
          </h2>

          <div className="metric-list">
            <div>
              Licensed days

              <strong>
                {number(
                  provider.licensedDays,
                )}
              </strong>
            </div>

            <div>
              Active days

              <strong>
                {number(
                  provider.activeDays,
                )}
              </strong>
            </div>

            <div>
              Engagement

              <strong>
                {percent(
                  provider.engagement,
                )}
              </strong>
            </div>

            <div>
              Placements

              <strong>
                {number(
                  placements.length,
                )}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="callout section">
        <b>Review context:</b>{" "}
        {reviewContext}
      </div>

      <div className="card section">
        <h2>Placement history</h2>

        <Table
          headers={[
            "Child",
            "Start",
            "End",
            "Length",
            "Child home county",
            "Placement county",
          ]}
        >
          {placements.map(
            (
              placement,
              index,
            ) => (
              <tr
                key={`${placement.placement_start_date}-${index}`}
              >
                <td>
                  {placement.id_child}
                </td>

                <td>
                  {
                    placement.placement_start_date
                  }
                </td>

                <td>
                  {placement.placement_end_date ||
                    "Current"}
                </td>

                <td>
                  {placement.length} days
                </td>

                <td>
                  {
                    placement.removal_county
                  }
                </td>

                <td>
                  {
                    placement.placement_county
                  }
                </td>
              </tr>
            ),
          )}
        </Table>
      </div>
    </>
  );
}