from __future__ import annotations

from datetime import date, datetime
from typing import Any

import pandas as pd

from .config import (
    EXPIRING_WINDOWS,
    LATEST_PERIOD_MONTHS,
    RECRUITMENT_LOW_ENGAGEMENT_COUNTY_SHARE,
    RECRUITMENT_LOW_ENGAGEMENT_HOME_THRESHOLD,
    RECRUITMENT_OUT_OF_COUNTY_THRESHOLD,
    REPORTING_DATE,
)

AGE_GROUPS = (
    ("0–5", 0, 5),
    ("6–12", 6, 12),
    ("13–17", 13, 17),
)

REQUIRED_COLUMNS = {
    "child": {
        "id_child",
        "removal_date",
        "discharge_date",
        "age_at_removal",
        "most_recent_age",
        "removal_county",
    },
    "placement": {
        "id_child",
        "placement_start_date",
        "placement_end_date",
        "resource_type_on_this_placement",
        "placement_index",
        "removal_county",
        "placement_county",
        "id_provider",
        "placement_length",
    },
    "provider": {
        "id_provider",
        "license_start_date",
        "license_end_date",
        "county_provider",
        "n_days_licensed",
        "n_days_active",
        "min_age",
        "max_age",
    },
}


def _iso(value: Any) -> str | None:
    if value is None or pd.isna(value):
        return None

    if isinstance(value, pd.Timestamp):
        return value.date().isoformat()

    if isinstance(value, date | datetime):
        return value.isoformat()

    return str(value)


def _number(value: Any, default: float = 0.0) -> float:
    parsed = pd.to_numeric(value, errors="coerce")
    return default if pd.isna(parsed) else float(parsed)


def _int(value: Any, default: int = 0) -> int:
    return int(round(_number(value, default)))


def _clean_id(value: Any) -> str | None:
    if value is None or pd.isna(value):
        return None

    text = str(value).strip()

    if not text or text.upper() == "NA":
        return None

    try:
        numeric = float(text)

        if numeric.is_integer():
            return str(int(numeric))
    except ValueError:
        pass

    return text


def _date_series(frame: pd.DataFrame, column: str) -> pd.Series:
    return pd.to_datetime(
        frame[column],
        errors="coerce",
        format="mixed",
    )


def validate_frames(
    child: pd.DataFrame,
    placement: pd.DataFrame,
    provider: pd.DataFrame,
) -> None:
    frames = {
        "child": child,
        "placement": placement,
        "provider": provider,
    }
    errors: list[str] = []

    for kind, frame in frames.items():
        missing = sorted(REQUIRED_COLUMNS[kind] - set(frame.columns))

        if missing:
            errors.append(f"{kind}: missing {', '.join(missing)}")

        if frame.empty:
            errors.append(f"{kind}: file is empty")

    if errors:
        raise ValueError("; ".join(errors))


def _engagement_band(rate: float) -> str:
    if rate < 0.10:
        return "low"

    if rate <= 0.30:
        return "limited"

    if rate <= 0.50:
        return "moderate"

    return "high"


def _priority_from_score(score: float) -> str:
    if score >= 4:
        return "high"

    if score >= 2:
        return "medium"

    return "low"


def process_datasets(
    child: pd.DataFrame,
    placement: pd.DataFrame,
    provider: pd.DataFrame,
) -> dict[str, Any]:
    validate_frames(child, placement, provider)

    child = child.copy()
    placement = placement.copy()
    provider = provider.copy()

    child["removal_date_parsed"] = _date_series(
        child,
        "removal_date",
    )
    child["discharge_date_parsed"] = _date_series(
        child,
        "discharge_date",
    )
    child["age"] = pd.to_numeric(
        child["most_recent_age"],
        errors="coerce",
    ).fillna(
        pd.to_numeric(
            child["age_at_removal"],
            errors="coerce",
        )
    )

    placement["placement_start_parsed"] = _date_series(
        placement,
        "placement_start_date",
    )
    placement["placement_end_parsed"] = _date_series(
        placement,
        "placement_end_date",
    )
    placement["provider_id_clean"] = placement["id_provider"].map(_clean_id)
    placement["resource_clean"] = (
        placement["resource_type_on_this_placement"].astype(str).str.strip().str.lower()
    )

    provider["license_start_parsed"] = _date_series(
        provider,
        "license_start_date",
    )
    provider["license_end_parsed"] = _date_series(
        provider,
        "license_end_date",
    )
    provider["provider_id_clean"] = provider["id_provider"].map(_clean_id)
    provider["licensed_days"] = pd.to_numeric(
        provider["n_days_licensed"],
        errors="coerce",
    ).fillna(0)
    provider["active_days"] = pd.to_numeric(
        provider["n_days_active"],
        errors="coerce",
    ).fillna(0)
    provider["engagement"] = (
        (provider["active_days"] / provider["licensed_days"].replace(0, pd.NA)).fillna(0).clip(0, 1)
    )

    report_ts = pd.Timestamp(REPORTING_DATE)
    latest_end = report_ts
    latest_start = latest_end - pd.DateOffset(
        months=LATEST_PERIOD_MONTHS,
    )

    provider["is_licensed"] = (
        provider["license_start_parsed"].notna()
        & (provider["license_start_parsed"] <= report_ts)
        & provider["license_end_parsed"].notna()
        & (provider["license_end_parsed"] >= report_ts)
    )
    provider["days_until_expiration"] = (provider["license_end_parsed"] - report_ts).dt.days

    foster = placement[
        (placement["resource_clean"] == "foster_home") & placement["provider_id_clean"].notna()
    ].copy()

    last_activity = (
        foster.assign(
            effective_end=(foster["placement_end_parsed"].fillna(report_ts).clip(upper=report_ts))
        )
        .groupby("provider_id_clean")["effective_end"]
        .max()
        .to_dict()
    )

    provider_records: list[dict[str, Any]] = []

    for _, row in provider.iterrows():
        provider_id = row["provider_id_clean"] or str(row["id_provider"]).strip()
        last = last_activity.get(provider_id)
        engagement = float(row["engagement"])

        days_until = (
            None if pd.isna(row["days_until_expiration"]) else int(row["days_until_expiration"])
        )

        inactive_flags = {
            str(window): (last is None or last < report_ts - pd.to_timedelta(int(window), unit="D"))
            for window in EXPIRING_WINDOWS
        }

        if engagement == 0:
            engagement_category = "inactive"
        elif engagement < 0.25:
            engagement_category = "low"
        elif engagement < 0.60:
            engagement_category = "moderate"
        else:
            engagement_category = "high"

        provider_records.append(
            {
                "id_provider": provider_id,
                "county_provider": str(
                    row.get("county_provider", ""),
                ).strip(),
                "license_start_date": (_iso(row["license_start_parsed"]) or ""),
                "license_end_date": (_iso(row["license_end_parsed"]) or ""),
                "licensedDays": _int(row["licensed_days"]),
                "activeDays": _int(row["active_days"]),
                "engagement": engagement,
                "licenseStart": _iso(row["license_start_parsed"]),
                "licenseEnd": _iso(row["license_end_parsed"]),
                "daysUntilExpiration": days_until,
                "minAge": _int(row.get("min_age", 0)),
                "maxAge": _int(row.get("max_age", 0)),
                "isLicensed": bool(row["is_licensed"]),
                "engagementCategory": engagement_category,
                "retentionEngagementBand": _engagement_band(engagement),
                "lastPlacementActivityDate": _iso(last),
                "daysSinceLastActivity": (
                    None
                    if last is None
                    else max(
                        0,
                        int((report_ts - last).days),
                    )
                ),
                "inactive30": inactive_flags["30"],
                "inactive60": inactive_flags["60"],
                "inactive90": inactive_flags["90"],
                "outreachScore": 0.0,
                "outreachPriority": "low",
                "outreachReasons": [],
            }
        )

    child_records: list[dict[str, Any]] = []

    for _, row in child.iterrows():
        age_value = row["age"]

        if pd.isna(age_value):
            age = None
            group = "Unknown"
        else:
            age = int(round(float(age_value)))

            if age <= 5:
                group = "0–5"
            elif age <= 12:
                group = "6–12"
            elif age <= 17:
                group = "13–17"
            else:
                group = "18+"

        child_records.append(
            {
                "id_child": str(row["id_child"]).strip(),
                "removal_county": str(
                    row.get("removal_county", ""),
                ).strip(),
                "age": age,
                "ageGroup": group,
                "removal_date": _iso(row["removal_date_parsed"]),
                "discharge_date": _iso(row["discharge_date_parsed"]),
            }
        )

    placement_records: list[dict[str, Any]] = []

    for _, row in placement.iterrows():
        end = row["placement_end_parsed"] if pd.notna(row["placement_end_parsed"]) else report_ts

        placement_records.append(
            {
                "id_child": str(row["id_child"]).strip(),
                "removal_county": str(
                    row.get("removal_county", ""),
                ).strip(),
                "placement_county": str(
                    row.get("placement_county", ""),
                ).strip(),
                "resource_type_on_this_placement": str(
                    row.get(
                        "resource_type_on_this_placement",
                        "",
                    )
                ).strip(),
                "placement_start_date": (_iso(row["placement_start_parsed"]) or ""),
                "placement_end_date": (_iso(row["placement_end_parsed"]) or ""),
                "id_provider": row["provider_id_clean"],
                "start": _iso(row["placement_start_parsed"]),
                "end": (_iso(end) or REPORTING_DATE.isoformat()),
                "length": _int(row.get("placement_length", 0)),
            }
        )

    reporting_date_string = REPORTING_DATE.isoformat()

    current_children = [
        item
        for item in child_records
        if (item["discharge_date"] is None or item["discharge_date"] >= reporting_date_string)
    ]

    county_names = sorted(
        {
            *(item["removal_county"] for item in child_records if item["removal_county"]),
            *(item["county_provider"] for item in provider_records if item["county_provider"]),
        }
    )

    counties: list[dict[str, Any]] = []

    for name in county_names:
        county_children = [item for item in current_children if item["removal_county"] == name]

        county_homes = [item for item in provider_records if item["county_provider"] == name]

        licensed_homes = [item for item in county_homes if item["isLicensed"]]

        active_homes = [item for item in licensed_homes if item["activeDays"] > 0]

        county_placements_df = foster[foster["removal_county"].astype(str).str.strip() == name]

        outside_count = int(
            (county_placements_df["placement_county"].astype(str).str.strip() != name).sum()
        )

        total_placements = int(len(county_placements_df))

        out_rate = outside_count / total_placements if total_placements else 0.0

        provider_county_matches = provider["county_provider"].astype(str).str.strip() == name

        ended = int(
            (
                provider_county_matches
                & provider["license_end_parsed"].ge(latest_start)
                & provider["license_end_parsed"].lt(latest_end)
            ).sum()
        )

        started = int(
            (
                provider_county_matches
                & provider["license_start_parsed"].ge(latest_start)
                & provider["license_start_parsed"].lt(latest_end)
            ).sum()
        )

        net_change = started - ended

        expiring30 = sum(
            1
            for home in licensed_homes
            if (home["daysUntilExpiration"] is not None and 0 <= home["daysUntilExpiration"] <= 30)
        )

        low_engagement = sum(
            1
            for home in licensed_homes
            if (home["engagement"] < RECRUITMENT_LOW_ENGAGEMENT_HOME_THRESHOLD)
        )

        low_engagement_rate = low_engagement / len(licensed_homes) if licensed_homes else 0.0

        recent_placements = int(
            (
                county_placements_df["placement_start_parsed"].ge(latest_start)
                & county_placements_df["placement_start_parsed"].lt(latest_end)
            ).sum()
        )

        events = {
            "netHomeLoss": net_change < 0,
            "highOutOfCounty": (
                total_placements > 0 and out_rate >= RECRUITMENT_OUT_OF_COUNTY_THRESHOLD
            ),
            "expiringSoon": expiring30 > 0,
            "lowEngagement": (
                bool(licensed_homes)
                and low_engagement_rate >= RECRUITMENT_LOW_ENGAGEMENT_COUNTY_SHARE
            ),
            "recruitmentStalled": (recent_placements > 0 and started == 0),
        }

        recruitment_score = sum(events.values())

        county_placement_rows = placement[
            placement["removal_county"].astype(str).str.strip() == name
        ]

        unique_children = int(county_placement_rows["id_child"].astype(str).nunique())

        kinship = int((county_placement_rows["resource_clean"] == "kin").sum())

        counts_by_child = county_placement_rows.groupby(
            county_placement_rows["id_child"].astype(str)
        ).size()

        two_plus = int((counts_by_child >= 2).sum())

        three_plus = int((counts_by_child >= 3).sum())

        gaps: list[dict[str, Any]] = []

        for label, minimum, maximum in AGE_GROUPS:
            demand = sum(1 for item in county_children if item["ageGroup"] == label)

            supply = sum(
                1
                for home in licensed_homes
                if (home["minAge"] <= minimum and home["maxAge"] >= maximum)
            )

            ratio = demand / supply if supply else 999.0 if demand else 0.0

            gaps.append(
                {
                    "group": label,
                    "demand": demand,
                    "supply": supply,
                    "ratio": ratio,
                }
            )

        largest_gap = max(
            gaps,
            key=lambda item: item["ratio"],
        )

        total_county_placement_rows = len(county_placement_rows)

        counties.append(
            {
                "name": name,
                "children": len(county_children),
                "licensedHomes": len(licensed_homes),
                "activeHomes": len(active_homes),
                "inactiveHomes": (len(licensed_homes) - len(active_homes)),
                "childrenPerActive": (
                    len(county_children) / len(active_homes)
                    if active_homes
                    else float(len(county_children))
                ),
                "outRate": out_rate,
                "newLicenses": started,
                "gaps": gaps,
                "largestGap": largest_gap,
                "recruitmentScore": recruitment_score,
                "priority": _priority_from_score(recruitment_score),
                "placementStats": {
                    "totalPlacements": int(total_county_placement_rows),
                    "uniqueChildren": unique_children,
                    "kinshipPlacements": kinship,
                    "kinshipRate": (
                        kinship / total_county_placement_rows
                        if total_county_placement_rows
                        else 0.0
                    ),
                    "childrenWithTwoPlusPlacements": (two_plus),
                    "childrenWithTwoPlusPlacementsRate": (
                        two_plus / unique_children if unique_children else 0.0
                    ),
                    "childrenWithThreePlusPlacements": (three_plus),
                    "childrenWithThreePlusPlacementsRate": (
                        three_plus / unique_children if unique_children else 0.0
                    ),
                },
                "recruitment": {
                    "score": recruitment_score,
                    "events": events,
                    "endedLicensesLast6Months": ended,
                    "newLicensesLast6Months": started,
                    "netLicenseChangeLast6Months": (net_change),
                    "outOfCountyPlacements": (outside_count),
                    "totalFosterPlacements": (total_placements),
                    "outOfCountyRate": out_rate,
                    "expiringWithin30Days": expiring30,
                    "lowEngagementHomes": (low_engagement),
                    "lowEngagementRate": (low_engagement_rate),
                    "recentFosterPlacements": (recent_placements),
                },
            }
        )

    counties.sort(
        key=lambda item: (
            -item["recruitmentScore"],
            item["name"],
        )
    )

    county_by_name = {item["name"]: item for item in counties}

    for home in provider_records:
        expiration_score = (
            100
            if (home["daysUntilExpiration"] is not None and 0 <= home["daysUntilExpiration"] <= 30)
            else 0
        )

        inactivity_score = (1 - home["engagement"]) * 100

        county_score = (
            county_by_name.get(home["county_provider"], {}).get("recruitmentScore", 0) * 20
        )

        outreach = 0.5 * expiration_score + 0.35 * inactivity_score + 0.15 * county_score

        reasons: list[str] = []

        if expiration_score:
            reasons.append("License expires within 30 days")

        if home["engagement"] < 0.25:
            reasons.append("Low engagement")

        if home["activeDays"] == 0:
            reasons.append("No active placement days")

        if county_score >= 80:
            reasons.append("Located in a high-need county")

        home["outreachScore"] = outreach

        if outreach >= 67:
            home["outreachPriority"] = "high"
        elif outreach >= 34:
            home["outreachPriority"] = "medium"
        else:
            home["outreachPriority"] = "low"

        home["outreachReasons"] = reasons

    licensed = [home for home in provider_records if home["isLicensed"]]

    active = [home for home in licensed if home["activeDays"] > 0]

    total_active_days = sum(home["activeDays"] for home in licensed)

    total_licensed_days = sum(home["licensedDays"] for home in licensed)

    foster_placement_records = [
        item
        for item in placement_records
        if (
            item["resource_type_on_this_placement"].strip().lower() == "foster_home"
            and item["id_provider"] is not None
        )
    ]

    return {
        "reportingDate": reporting_date_string,
        "children": child_records,
        "placements": placement_records,
        "providers": provider_records,
        "fosterPlacements": foster_placement_records,
        "currentChildren": current_children,
        "counties": counties,
        "summary": {
            "licensedHomes": len(licensed),
            "activeHomes": len(active),
            "childrenInCare": len(current_children),
            "engagement": (total_active_days / total_licensed_days if total_licensed_days else 0.0),
            "expiring30": sum(
                1
                for home in licensed
                if (
                    home["daysUntilExpiration"] is not None
                    and 0 <= home["daysUntilExpiration"] <= 30
                )
            ),
            "inactive": sum(1 for home in licensed if home["activeDays"] == 0),
            "highOutreach": sum(1 for home in licensed if (home["outreachPriority"] == "high")),
        },
    }
