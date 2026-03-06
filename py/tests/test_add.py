"""Tests for py/add.py."""

import argparse
import copy

import pytest

from add import add_card, find_card_index, parse_rarity, parse_type


# ── parse_rarity ──────────────────────────────────────────────────────────────

def test_parse_rarity_r():
    assert parse_rarity("R") == 1


def test_parse_rarity_sr():
    assert parse_rarity("SR") == 2


def test_parse_rarity_ssr():
    assert parse_rarity("SSR") == 3


def test_parse_rarity_case_insensitive():
    assert parse_rarity("r") == 1
    assert parse_rarity("sr") == 2
    assert parse_rarity("ssr") == 3


def test_parse_rarity_numeric_strings():
    assert parse_rarity("1") == 1
    assert parse_rarity("2") == 2
    assert parse_rarity("3") == 3


def test_parse_rarity_invalid_raises():
    with pytest.raises(argparse.ArgumentTypeError):
        parse_rarity("UR")
    with pytest.raises(argparse.ArgumentTypeError):
        parse_rarity("4")
    with pytest.raises(argparse.ArgumentTypeError):
        parse_rarity("0")
    with pytest.raises(argparse.ArgumentTypeError):
        parse_rarity("")


# ── parse_type ────────────────────────────────────────────────────────────────

def test_parse_type_abbreviations():
    assert parse_type("spd") == 0
    assert parse_type("sta") == 1
    assert parse_type("pow") == 2
    assert parse_type("gut") == 3
    assert parse_type("wit") == 4
    assert parse_type("fri") == 5


def test_parse_type_case_insensitive():
    assert parse_type("SPD") == 0
    assert parse_type("Sta") == 1
    assert parse_type("POW") == 2


def test_parse_type_numeric_strings():
    for i in range(6):
        assert parse_type(str(i)) == i


def test_parse_type_invalid_raises():
    with pytest.raises(argparse.ArgumentTypeError):
        parse_type("speed")
    with pytest.raises(argparse.ArgumentTypeError):
        parse_type("6")
    with pytest.raises(argparse.ArgumentTypeError):
        parse_type("")


# ── find_card_index ───────────────────────────────────────────────────────────

def test_find_card_index_found():
    cards = [
        {"name": "Grass Wonder", "type": 0, "rarity": 3, "lb": 2},
        {"name": "Special Week", "type": 1, "rarity": 2, "lb": 0},
    ]
    assert find_card_index(cards, "Special Week", 1, 2) == 1


def test_find_card_index_first_card():
    cards = [
        {"name": "Grass Wonder", "type": 0, "rarity": 3, "lb": 2},
        {"name": "Special Week", "type": 1, "rarity": 2, "lb": 0},
    ]
    assert find_card_index(cards, "Grass Wonder", 0, 3) == 0


def test_find_card_index_not_found():
    cards = [{"name": "Grass Wonder", "type": 0, "rarity": 3, "lb": 2}]
    assert find_card_index(cards, "Missing Card", 0, 3) == -1


def test_find_card_index_empty_list():
    assert find_card_index([], "Any Card", 0, 3) == -1


def test_find_card_index_requires_all_three_fields():
    cards = [{"name": "Grass Wonder", "type": 0, "rarity": 3, "lb": 2}]
    # Same name+type, different rarity -> not found
    assert find_card_index(cards, "Grass Wonder", 0, 2) == -1
    # Same name+rarity, different type -> not found
    assert find_card_index(cards, "Grass Wonder", 1, 3) == -1


# ── add_card ──────────────────────────────────────────────────────────────────

def test_add_card_new_card_appended():
    cards = []
    updated, _ = add_card(cards, "New Card", 0, 3)
    assert len(updated) == 1
    assert updated[0]["name"] == "New Card"


def test_add_card_new_card_starts_at_lb0():
    cards = []
    updated, _ = add_card(cards, "New Card", 0, 3)
    assert updated[0]["lb"] == 0


def test_add_card_new_card_has_correct_fields():
    cards = []
    updated, _ = add_card(cards, "New Card", 2, 2)
    assert updated[0] == {"name": "New Card", "type": 2, "rarity": 2, "lb": 0}


def test_add_card_existing_increments_lb():
    cards = [{"name": "Grass Wonder", "type": 0, "rarity": 3, "lb": 2}]
    updated, _ = add_card(cards, "Grass Wonder", 0, 3)
    assert updated[0]["lb"] == 3


def test_add_card_at_max_lb_stays_unchanged():
    cards = [{"name": "Grass Wonder", "type": 0, "rarity": 3, "lb": 4}]
    updated, msg = add_card(cards, "Grass Wonder", 0, 3)
    assert updated[0]["lb"] == 4
    assert "max" in msg.lower()


def test_add_card_message_new_card():
    cards = []
    _, msg = add_card(cards, "New Card", 0, 3)
    assert "New Card" in msg
    assert "Added" in msg or "added" in msg


def test_add_card_message_increment():
    cards = [{"name": "Grass Wonder", "type": 0, "rarity": 3, "lb": 1}]
    _, msg = add_card(cards, "Grass Wonder", 0, 3)
    assert "Grass Wonder" in msg


def test_add_card_increments_from_zero_to_one():
    cards = [{"name": "Card", "type": 0, "rarity": 1, "lb": 0}]
    updated, _ = add_card(cards, "Card", 0, 1)
    assert updated[0]["lb"] == 1


def test_add_card_increments_to_max():
    cards = [{"name": "Card", "type": 0, "rarity": 1, "lb": 3}]
    updated, _ = add_card(cards, "Card", 0, 1)
    assert updated[0]["lb"] == 4
