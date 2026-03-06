"""Tests for py/util.py."""

import json
from pathlib import Path

import pytest

from util import TYPE_NAMES, get_file_hash, load_enriched_cards, load_json, save_json


# ── get_file_hash ─────────────────────────────────────────────────────────────

def test_get_file_hash_returns_empty_for_nonexistent_file(tmp_path):
    assert get_file_hash(tmp_path / "missing.json") == ""


def test_get_file_hash_returns_hex_string(tmp_path):
    f = tmp_path / "data.json"
    f.write_text("hello", encoding="utf-8")
    result = get_file_hash(f)
    assert isinstance(result, str)
    assert len(result) == 64
    assert all(c in "0123456789abcdef" for c in result)


def test_get_file_hash_is_deterministic(tmp_path):
    f = tmp_path / "data.json"
    f.write_text("hello", encoding="utf-8")
    assert get_file_hash(f) == get_file_hash(f)


def test_get_file_hash_changes_when_content_changes(tmp_path):
    f = tmp_path / "data.json"
    f.write_text("hello", encoding="utf-8")
    h1 = get_file_hash(f)
    f.write_text("world", encoding="utf-8")
    h2 = get_file_hash(f)
    assert h1 != h2


# ── load_json ─────────────────────────────────────────────────────────────────

def test_load_json_returns_parsed_data(tmp_path):
    f = tmp_path / "data.json"
    f.write_text(json.dumps({"key": "value"}), encoding="utf-8")
    result = load_json(f)
    assert result == {"key": "value"}


def test_load_json_exits_on_missing_file(tmp_path, capsys):
    with pytest.raises(SystemExit):
        load_json(tmp_path / "nonexistent.json")
    assert "file not found" in capsys.readouterr().err


def test_load_json_exits_on_invalid_json(tmp_path, capsys):
    f = tmp_path / "bad.json"
    f.write_text("{not valid json}", encoding="utf-8")
    with pytest.raises(SystemExit):
        load_json(f)
    assert "failed to parse JSON" in capsys.readouterr().err


def test_load_json_handles_list(tmp_path):
    f = tmp_path / "list.json"
    f.write_text(json.dumps([1, 2, 3]), encoding="utf-8")
    assert load_json(f) == [1, 2, 3]


# ── load_enriched_cards ───────────────────────────────────────────────────────

def test_load_enriched_cards_new_format(enriched_cards_file):
    cards = load_enriched_cards(enriched_cards_file)
    assert isinstance(cards, list)
    assert len(cards) == 4
    assert cards[0]["name"] == "Grass Wonder"


def test_load_enriched_cards_legacy_format(legacy_enriched_cards_file):
    cards = load_enriched_cards(legacy_enriched_cards_file)
    assert isinstance(cards, list)
    assert len(cards) == 4


def test_load_enriched_cards_exits_on_wrong_structure(tmp_path, capsys):
    f = tmp_path / "bad.json"
    f.write_text('"just a string"', encoding="utf-8")
    with pytest.raises(SystemExit):
        load_enriched_cards(f)
    assert "expected" in capsys.readouterr().err


# ── save_json ─────────────────────────────────────────────────────────────────

def test_save_json_creates_file(tmp_path):
    path = tmp_path / "out.json"
    save_json(path, {"a": 1})
    assert path.exists()


def test_save_json_pretty_has_indentation(tmp_path):
    path = tmp_path / "out.json"
    save_json(path, {"a": 1}, pretty=True)
    content = path.read_text(encoding="utf-8")
    assert "\n" in content
    assert "  " in content


def test_save_json_compact_has_no_indent(tmp_path):
    path = tmp_path / "out.json"
    save_json(path, {"a": 1}, pretty=False)
    content = path.read_text(encoding="utf-8")
    assert content.strip() == '{"a": 1}'


def test_save_json_creates_parent_dirs(tmp_path):
    path = tmp_path / "nested" / "dir" / "out.json"
    save_json(path, [1, 2, 3])
    assert path.exists()


def test_save_json_preserves_unicode(tmp_path):
    path = tmp_path / "out.json"
    save_json(path, {"name": "スペシャルウィーク"})
    content = path.read_text(encoding="utf-8")
    assert "スペシャルウィーク" in content


def test_save_json_roundtrip(tmp_path):
    path = tmp_path / "out.json"
    data = {"name": "test", "value": 42}
    save_json(path, data)
    assert load_json(path) == data


# ── TYPE_NAMES ────────────────────────────────────────────────────────────────

def test_type_names_all_six_types_present():
    assert set(TYPE_NAMES.keys()) == {0, 1, 2, 3, 4, 5}


def test_type_names_correct_values():
    assert TYPE_NAMES[0] == "Speed"
    assert TYPE_NAMES[1] == "Stamina"
    assert TYPE_NAMES[2] == "Power"
    assert TYPE_NAMES[3] == "Guts"
    assert TYPE_NAMES[4] == "Wit"
    assert TYPE_NAMES[5] == "Friend"
