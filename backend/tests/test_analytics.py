from pathlib import Path

import pandas as pd

from app.analytics import process_datasets

DATA = Path(__file__).resolve().parents[2] / "public" / "data"


def test_sample_processing_builds_counties_and_scores() -> None:
    model = process_datasets(
        pd.read_csv(DATA / "child_level.csv", dtype=str),
        pd.read_csv(DATA / "placement_level.csv", dtype=str),
        pd.read_csv(DATA / "provider_level_updated.csv", dtype=str),
    )

    assert model["counties"]
    assert model["providers"]
    assert model["children"]
    assert model["placements"]

    for county in model["counties"]:
        events = county["recruitment"]["events"]
        expected_score = sum(bool(value) for value in events.values())

        assert len(events) == 5
        assert county["recruitmentScore"] == expected_score
        assert county["recruitment"]["score"] == expected_score
        assert 0 <= expected_score <= 5

    scores = [
        county["recruitmentScore"]
        for county in model["counties"]
    ]

    assert scores == sorted(scores, reverse=True)

    assert model["summary"]["licensedHomes"] == sum(
        1
        for provider in model["providers"]
        if provider["isLicensed"]
    )

    assert model["summary"]["activeHomes"] == sum(
        1
        for provider in model["providers"]
        if provider["isLicensed"] and provider["activeDays"] > 0
    )

    assert all(
        child["age"] is None or child["age"] >= 0
        for child in model["children"]
    )