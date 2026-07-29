#!/usr/bin/env python3

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parent))

import hn_ticket


class PlaceholderDetectionTests(unittest.TestCase):
    def test_warns_for_unresolved_prose_placeholder(self) -> None:
        self.assertTrue(hn_ticket.contains_angle_placeholder("## Context\n<Describe it>"))

    def test_ignores_inline_code(self) -> None:
        self.assertFalse(
            hn_ticket.contains_angle_placeholder(
                "Keep the existing `<img>` element and its loading behavior."
            )
        )

    def test_ignores_fenced_code(self) -> None:
        self.assertFalse(
            hn_ticket.contains_angle_placeholder(
                "```html\n<img src=\"preview.webp\">\n```"
            )
        )

    def test_ignores_common_raw_html(self) -> None:
        self.assertFalse(
            hn_ticket.contains_angle_placeholder(
                '<details><summary>Example</summary><img src="preview.webp"></details>'
            )
        )


class PlanValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.config = hn_ticket.load_config()
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.body_path = Path(self.temp_dir.name) / "body.md"
        self.body_path.write_text("## Summary\nKeep `<img>` intact.\n", encoding="utf-8")

    def write_plan(self, **overrides: object) -> Path:
        plan: dict[str, object] = {
            "schemaVersion": self.config["schemaVersion"],
            "operation": "create",
            "repository": self.config["repository"],
            "title": "[Feature] Test ticket adapter",
            "bodyFile": str(self.body_path),
            "type": "Feature",
            "area": next(iter(self.config["fields"]["Area"]["options"])),
            "priority": "P2",
            "effort": "S",
            "labels": [],
            "assignees": [],
            "relationships": {
                "parent": None,
                "blockedBy": [],
                "blocking": [],
            },
        }
        plan.update(overrides)
        path = Path(self.temp_dir.name) / "plan.json"
        path.write_text(json.dumps(plan), encoding="utf-8")
        return path

    def test_create_plan_remains_backward_compatible(self) -> None:
        plan, warnings = hn_ticket.validate_plan(self.write_plan(), self.config)
        self.assertEqual(plan["operation"], "create")
        self.assertEqual(plan["projectStatus"], self.config["defaults"]["status"])
        self.assertEqual(plan["updates"], [])
        self.assertEqual(warnings, [])

    def test_refine_plan_requires_explicit_updates(self) -> None:
        with self.assertRaisesRegex(
            hn_ticket.AdapterError, "updates must be an array"
        ):
            hn_ticket.validate_plan(
                self.write_plan(operation="refine"), self.config
            )

    def test_refine_plan_accepts_authorized_body_update(self) -> None:
        plan, warnings = hn_ticket.validate_plan(
            self.write_plan(
                operation="refine",
                updates=["body"],
                projectStatus="In Progress",
            ),
            self.config,
        )
        self.assertEqual(plan["updates"], ["body"])
        self.assertEqual(plan["projectStatus"], "In Progress")
        self.assertEqual(warnings, [])

    def test_refine_plan_rejects_unsupported_update(self) -> None:
        with self.assertRaisesRegex(hn_ticket.AdapterError, "unsupported: labels"):
            hn_ticket.validate_plan(
                self.write_plan(operation="refine", updates=["labels"]),
                self.config,
            )


class RefineIssueTests(unittest.TestCase):
    def test_edits_only_authorized_fields_then_verifies(self) -> None:
        plan = {
            "updates": ["body"],
            "bodyFile": "/tmp/body.md",
            "title": "[Feature] Unchanged title",
        }
        verification = {"ok": True, "checks": {}, "errors": []}

        with (
            patch.object(hn_ticket, "run_gh", return_value="") as run_gh,
            patch.object(hn_ticket, "verify", return_value=verification) as verify,
        ):
            result = hn_ticket.refine_issue(
                plan,
                {"repository": "valentinvieriu/hn-glance"},
                "https://github.com/valentinvieriu/hn-glance/issues/2",
            )

        run_gh.assert_called_once_with(
            [
                "issue",
                "edit",
                "https://github.com/valentinvieriu/hn-glance/issues/2",
                "--repo",
                "valentinvieriu/hn-glance",
                "--body-file",
                "/tmp/body.md",
            ]
        )
        verify.assert_called_once()
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["completed"], ["body"])


if __name__ == "__main__":
    unittest.main()
