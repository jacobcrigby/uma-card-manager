"""Shared fixtures for the Uma Musume test suite."""

import json
import sys
from pathlib import Path

# Add py/ to sys.path so bare imports like `from util import ...` work
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest


SAMPLE_USER_CARDS = [
    {"name": "Grass Wonder", "type": 0, "rarity": 3, "lb": 2},
    {"name": "Special Week", "type": 1, "rarity": 2, "lb": 0},
    {"name": "El Condor Pasa", "type": 0, "rarity": 3, "lb": 4},
]

SAMPLE_TIERLIST = {
    "cards": {
        "101": {
            "id": 101,
            "name": "Grass Wonder",
            "type": 0,
            "rarity": 3,
            "scores": [28000, 30000, 32000, 34000, 36000],
            "tiers": ["B", "A", "A", "S", "S+"],
        },
        "102": {
            "id": 102,
            "name": "Special Week",
            "type": 1,
            "rarity": 2,
            "scores": [20000, 22000, 24000, 26000, 28000],
            "tiers": ["C", "C", "B", "B", "A"],
        },
        "201": {
            "id": 201,
            "name": "Silence Suzuka",
            "type": 0,
            "rarity": 3,
            "scores": [40000, 42000, 44000, 46000, 48000],
            "tiers": ["A", "A", "S", "S", "S+"],
        },
    }
}

SAMPLE_ENRICHED_CARDS = [
    {"name": "Grass Wonder", "type": 0, "rarity": 3, "lb": 2, "id": 101, "score": 32000, "tier": "A"},
    {"name": "Special Week", "type": 1, "rarity": 2, "lb": 0, "id": 102, "score": 20000, "tier": "C"},
    {"name": "El Condor Pasa", "type": 0, "rarity": 3, "lb": 4, "id": 103, "score": 35000, "tier": "S"},
    {"name": "Friend Card", "type": 5, "rarity": 3, "lb": 1, "id": 40001, "score": None, "tier": None},
]


@pytest.fixture
def my_cards_file(tmp_path):
    path = tmp_path / "my_cards.json"
    path.write_text(json.dumps(SAMPLE_USER_CARDS), encoding="utf-8")
    return path


@pytest.fixture
def tierlist_file(tmp_path):
    path = tmp_path / "precomputed-tierlist.json"
    path.write_text(json.dumps(SAMPLE_TIERLIST), encoding="utf-8")
    return path


@pytest.fixture
def enriched_cards_file(tmp_path):
    """New-format enriched file with metadata wrapper."""
    data = {
        "metadata": {"input_hash": "abc123", "tierlist_hash": "def456"},
        "cards": SAMPLE_ENRICHED_CARDS,
    }
    path = tmp_path / "my_cards_enriched.json"
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


@pytest.fixture
def legacy_enriched_cards_file(tmp_path):
    """Old-format enriched file (bare list, no metadata wrapper)."""
    path = tmp_path / "my_cards_enriched.json"
    path.write_text(json.dumps(SAMPLE_ENRICHED_CARDS), encoding="utf-8")
    return path
