#!/usr/bin/env python3
"""Validate, create, refine, configure, and verify HN Glance GitHub tickets."""

from __future__ import annotations

import argparse
import difflib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


CONFIG_PATH = (
    Path(__file__).resolve().parents[1] / "references" / "project-config.json"
)
ISSUE_URL_RE = re.compile(
    r"https://github\.com/[^/\s]+/[^/\s]+/issues/(?P<number>\d+)"
)
PROJECT_ITEM_ID_RE = re.compile(r"^PVTI_")
PLACEHOLDER_RE = re.compile(r"<[^>\n]{2,160}>")
FENCED_CODE_RE = re.compile(r"```.*?```|~~~.*?~~~", re.DOTALL)
INLINE_CODE_RE = re.compile(r"`+[^`\n]*`+")
HTML_TAG_RE = re.compile(
    (
        r"</?(?:a|abbr|b|blockquote|br|code|details|div|em|h[1-6]|hr|i|img|"
        r"kbd|li|ol|p|pre|s|span|strong|sub|summary|sup|table|tbody|td|th|"
        r"thead|tr|ul)(?:\s+[^<>]*)?\s*/?>"
    ),
    re.IGNORECASE,
)
STOP_WORDS = {
    "a",
    "an",
    "and",
    "for",
    "from",
    "in",
    "of",
    "on",
    "the",
    "to",
    "with",
}


class AdapterError(RuntimeError):
    """An expected validation or GitHub CLI failure."""


class GhError(AdapterError):
    """A failed gh invocation."""

    def __init__(self, args: list[str], message: str):
        self.args_used = args
        super().__init__(message)


def emit(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, indent=2, sort_keys=True))


def read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise AdapterError(f"File not found: {path}") from error
    except json.JSONDecodeError as error:
        raise AdapterError(f"Invalid JSON in {path}: {error}") from error
    if not isinstance(value, dict):
        raise AdapterError(f"Expected a JSON object in {path}")
    return value


def load_config() -> dict[str, Any]:
    return read_json(CONFIG_PATH)


def run_gh(args: list[str], *, parse_json: bool = False) -> Any:
    try:
        result = subprocess.run(
            ["gh", *args],
            check=False,
            capture_output=True,
            text=True,
            timeout=90,
        )
    except FileNotFoundError as error:
        raise GhError(args, "GitHub CLI `gh` is not installed or not on PATH") from error
    except subprocess.TimeoutExpired as error:
        raise GhError(args, "GitHub CLI command timed out") from error

    if result.returncode != 0:
        message = (result.stderr or result.stdout or "GitHub CLI command failed").strip()
        raise GhError(args, message)

    output = result.stdout.strip()
    if not parse_json:
        return output
    try:
        return json.loads(output)
    except json.JSONDecodeError as error:
        raise GhError(args, "GitHub CLI returned invalid JSON") from error


def validate_ref(value: Any, field: str) -> str | None:
    if value is None:
        return None
    if isinstance(value, int) and value > 0:
        return str(value)
    if isinstance(value, str):
        candidate = value.strip()
        if candidate.isdigit() and int(candidate) > 0:
            return candidate
        if ISSUE_URL_RE.fullmatch(candidate):
            return candidate
    raise AdapterError(f"{field} must be a positive issue number or GitHub issue URL")


def string_list(value: Any, field: str) -> list[str]:
    if not isinstance(value, list):
        raise AdapterError(f"{field} must be an array")
    normalized: list[str] = []
    for item in value:
        if not isinstance(item, str) or not item.strip():
            raise AdapterError(f"{field} must contain non-empty strings")
        normalized.append(item.strip())
    if len(normalized) != len(set(normalized)):
        raise AdapterError(f"{field} contains duplicates")
    return normalized


def relationship_list(value: Any, field: str) -> list[str]:
    if not isinstance(value, list):
        raise AdapterError(f"{field} must be an array")
    normalized = [validate_ref(item, field) for item in value]
    result = [item for item in normalized if item is not None]
    if len(result) != len(set(result)):
        raise AdapterError(f"{field} contains duplicates")
    return result


def contains_angle_placeholder(body: str) -> bool:
    prose = FENCED_CODE_RE.sub("", body)
    prose = INLINE_CODE_RE.sub("", prose)
    prose = HTML_TAG_RE.sub("", prose)
    return PLACEHOLDER_RE.search(prose) is not None


def validate_plan(path: Path, config: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    plan = read_json(path)
    allowed = {
        "schemaVersion",
        "operation",
        "updates",
        "repository",
        "title",
        "bodyFile",
        "type",
        "area",
        "priority",
        "effort",
        "impact",
        "labels",
        "assignees",
        "milestone",
        "projectStatus",
        "relationships",
    }
    unknown = sorted(set(plan) - allowed)
    if unknown:
        raise AdapterError(f"Unknown plan fields: {', '.join(unknown)}")

    required = {
        "schemaVersion",
        "operation",
        "repository",
        "title",
        "bodyFile",
        "type",
        "area",
        "priority",
        "effort",
        "labels",
        "assignees",
        "relationships",
    }
    missing = sorted(required - set(plan))
    if missing:
        raise AdapterError(f"Missing plan fields: {', '.join(missing)}")

    if plan["schemaVersion"] != config["schemaVersion"]:
        raise AdapterError(
            f"schemaVersion must be {config['schemaVersion']}"
        )
    operation = plan["operation"]
    if not isinstance(operation, str) or operation not in {"create", "refine"}:
        raise AdapterError("operation must be `create` or `refine`")
    if plan["repository"] != config["repository"]:
        raise AdapterError(f"repository must be {config['repository']}")

    updates_value = plan.get("updates")
    if operation == "create":
        if updates_value is not None:
            raise AdapterError("updates is only valid for `refine` plans")
        updates: list[str] = []
    else:
        updates = string_list(updates_value, "updates")
        if not updates:
            raise AdapterError("updates must authorize at least one refine field")
        unsupported_updates = sorted(set(updates) - {"body", "title"})
        if unsupported_updates:
            raise AdapterError(
                "updates may contain only `body` and `title`; unsupported: "
                + ", ".join(unsupported_updates)
            )

    title = plan["title"]
    if not isinstance(title, str) or not title.strip():
        raise AdapterError("title must be a non-empty string")
    title = title.strip()
    if len(title) > 256:
        raise AdapterError("title must be no longer than 256 characters")

    body_file_value = plan["bodyFile"]
    if not isinstance(body_file_value, str) or not body_file_value.strip():
        raise AdapterError("bodyFile must be an absolute file path")
    body_file = Path(body_file_value)
    if not body_file.is_absolute():
        raise AdapterError("bodyFile must be an absolute file path")
    try:
        body = body_file.read_text(encoding="utf-8")
    except FileNotFoundError as error:
        raise AdapterError(f"bodyFile does not exist: {body_file}") from error
    if not body.strip():
        raise AdapterError("bodyFile must not be empty")

    field_values = {
        "type": ("Type", plan["type"]),
        "area": ("Area", plan["area"]),
        "priority": ("Priority", plan["priority"]),
        "effort": ("Effort", plan["effort"]),
    }
    for plan_key, (field_name, value) in field_values.items():
        if value not in config["fields"][field_name]["options"]:
            allowed_values = ", ".join(config["fields"][field_name]["options"])
            raise AdapterError(f"{plan_key} must be one of: {allowed_values}")

    project_status = plan.get("projectStatus", config["defaults"]["status"])
    if (
        not isinstance(project_status, str)
        or project_status not in config["fields"]["Status"]["options"]
    ):
        allowed_values = ", ".join(config["fields"]["Status"]["options"])
        raise AdapterError(f"projectStatus must be one of: {allowed_values}")
    if operation == "create" and project_status != config["defaults"]["status"]:
        raise AdapterError(
            f"create plans must start with projectStatus "
            f"`{config['defaults']['status']}`"
        )

    expected_prefix = config["titlePrefixes"][plan["type"]]
    if not title.startswith(f"{expected_prefix} "):
        raise AdapterError(f"title must start with `{expected_prefix} `")

    impact = plan.get("impact")
    if impact is not None and (not isinstance(impact, str) or not impact.strip()):
        raise AdapterError("impact must be null or a non-empty string")
    if plan["priority"] in {"P0", "P1"} and not impact:
        raise AdapterError(f"{plan['priority']} requires a concrete impact statement")
    if plan["effort"] == "XL" and plan["type"] not in {"Epic", "Research"}:
        raise AdapterError("XL implementation work must be split or use Epic/Research")

    labels = string_list(plan["labels"], "labels")
    assignees = string_list(plan["assignees"], "assignees")
    milestone = plan.get("milestone")
    if milestone is not None and (
        not isinstance(milestone, str) or not milestone.strip()
    ):
        raise AdapterError("milestone must be null or a non-empty string")

    relationships = plan["relationships"]
    if not isinstance(relationships, dict):
        raise AdapterError("relationships must be an object")
    relationship_keys = {"parent", "blockedBy", "blocking"}
    unknown_relationships = sorted(set(relationships) - relationship_keys)
    if unknown_relationships:
        raise AdapterError(
            f"Unknown relationship fields: {', '.join(unknown_relationships)}"
        )
    missing_relationships = sorted(relationship_keys - set(relationships))
    if missing_relationships:
        raise AdapterError(
            f"Missing relationship fields: {', '.join(missing_relationships)}"
        )

    parent = validate_ref(relationships["parent"], "relationships.parent")
    blocked_by = relationship_list(
        relationships["blockedBy"], "relationships.blockedBy"
    )
    blocking = relationship_list(
        relationships["blocking"], "relationships.blocking"
    )
    overlap = sorted(set(blocked_by) & set(blocking))
    if overlap:
        raise AdapterError(
            "The same issue cannot be both blockedBy and blocking: "
            + ", ".join(overlap)
        )

    warnings: list[str] = []
    if contains_angle_placeholder(body):
        warnings.append("bodyFile appears to contain angle-bracket placeholder text")
    if "TODO" in body or "TBD" in body:
        warnings.append("bodyFile contains TODO or TBD")

    normalized = {
        **plan,
        "operation": operation,
        "updates": updates,
        "title": title,
        "bodyFile": str(body_file),
        "body": body,
        "projectStatus": project_status,
        "impact": impact.strip() if isinstance(impact, str) else None,
        "labels": labels,
        "assignees": assignees,
        "milestone": milestone.strip() if isinstance(milestone, str) else None,
        "relationships": {
            "parent": parent,
            "blockedBy": blocked_by,
            "blocking": blocking,
        },
    }
    return normalized, warnings


def json_id(value: Any) -> str | None:
    if isinstance(value, dict):
        direct = value.get("id")
        if isinstance(direct, str) and PROJECT_ITEM_ID_RE.match(direct):
            return direct
        for nested in value.values():
            found = json_id(nested)
            if found:
                return found
    elif isinstance(value, list):
        for nested in value:
            found = json_id(nested)
            if found:
                return found
    return None


def project_items(config: dict[str, Any]) -> list[dict[str, Any]]:
    payload = run_gh(
        [
            "project",
            "item-list",
            str(config["project"]["number"]),
            "--owner",
            config["project"]["owner"],
            "--format",
            "json",
            "--limit",
            "1000",
        ],
        parse_json=True,
    )
    items = payload.get("items", []) if isinstance(payload, dict) else []
    return [item for item in items if isinstance(item, dict)]


def item_for_url(config: dict[str, Any], issue_url: str) -> dict[str, Any] | None:
    for item in project_items(config):
        content = item.get("content")
        if isinstance(content, dict) and content.get("url") == issue_url:
            return item
    return None


def add_or_resolve_item(config: dict[str, Any], issue_url: str) -> str:
    try:
        payload = run_gh(
            [
                "project",
                "item-add",
                str(config["project"]["number"]),
                "--owner",
                config["project"]["owner"],
                "--url",
                issue_url,
                "--format",
                "json",
            ],
            parse_json=True,
        )
        item_id = json_id(payload)
        if item_id:
            return item_id
    except GhError:
        pass

    existing = item_for_url(config, issue_url)
    if existing and isinstance(existing.get("id"), str):
        return existing["id"]
    raise AdapterError("Could not add or resolve the issue's project item")


def set_project_field(
    config: dict[str, Any],
    item_id: str,
    field_name: str,
    option_name: str,
) -> None:
    field = config["fields"][field_name]
    run_gh(
        [
            "project",
            "item-edit",
            "--project-id",
            config["project"]["id"],
            "--id",
            item_id,
            "--field-id",
            field["id"],
            "--single-select-option-id",
            field["options"][option_name],
        ]
    )


def create_issue(plan: dict[str, Any], config: dict[str, Any]) -> str:
    args = [
        "issue",
        "create",
        "--repo",
        config["repository"],
        "--title",
        plan["title"],
        "--body-file",
        plan["bodyFile"],
    ]
    for label in plan["labels"]:
        args.extend(["--label", label])
    for assignee in plan["assignees"]:
        args.extend(["--assignee", assignee])
    if plan["milestone"]:
        args.extend(["--milestone", plan["milestone"]])

    output = run_gh(args)
    match = ISSUE_URL_RE.search(output)
    if not match:
        raise AdapterError("Issue creation succeeded without returning an issue URL")
    return match.group(0)


def require_plan_operation(plan: dict[str, Any], operation: str) -> None:
    if plan["operation"] != operation:
        raise AdapterError(f"This command requires operation `{operation}`")


def issue_number(value: Any) -> str | None:
    if isinstance(value, int):
        return str(value)
    if isinstance(value, str):
        if value.isdigit():
            return value
        match = ISSUE_URL_RE.search(value)
        return match.group("number") if match else None
    if isinstance(value, dict):
        if isinstance(value.get("number"), int):
            return str(value["number"])
        if isinstance(value.get("number"), str):
            return value["number"]
        return issue_number(value.get("url"))
    return None


def issue_numbers(value: Any) -> set[str]:
    if isinstance(value, list):
        return {
            number
            for item in value
            if (number := issue_number(item)) is not None
        }
    number = issue_number(value)
    return {number} if number else set()


def display_value(value: Any) -> Any:
    if isinstance(value, str) or value is None:
        return value
    if isinstance(value, dict):
        for key in ("name", "value", "title", "text"):
            if key in value:
                return display_value(value[key])
    return value


def normalized_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def item_field_value(item: dict[str, Any], field_name: str) -> Any:
    target = normalized_key(field_name)
    for key, value in item.items():
        if normalized_key(key) == target:
            return display_value(value)

    field_values = item.get("fieldValues")
    if isinstance(field_values, list):
        for value in field_values:
            if not isinstance(value, dict):
                continue
            field = value.get("field")
            name = field.get("name") if isinstance(field, dict) else value.get("name")
            if isinstance(name, str) and normalized_key(name) == target:
                return display_value(value)
    return None


def verify(
    plan: dict[str, Any], config: dict[str, Any], issue_url: str
) -> dict[str, Any]:
    checks: dict[str, Any] = {}
    errors: list[str] = []

    try:
        issue = run_gh(
            [
                "issue",
                "view",
                issue_url,
                "--repo",
                config["repository"],
                "--json",
                (
                    "title,body,url,state,parent,subIssues,blockedBy,blocking,"
                    "labels,assignees,milestone"
                ),
            ],
            parse_json=True,
        )
        checks["issueUrl"] = issue.get("url") == issue_url
        checks["title"] = issue.get("title") == plan["title"]
        checks["body"] = str(issue.get("body", "")).strip() == plan["body"].strip()

        actual_labels = {
            label.get("name")
            for label in issue.get("labels", [])
            if isinstance(label, dict)
        }
        checks["labels"] = set(plan["labels"]).issubset(actual_labels)

        actual_assignees = {
            assignee.get("login")
            for assignee in issue.get("assignees", [])
            if isinstance(assignee, dict)
        }
        checks["assignees"] = set(plan["assignees"]).issubset(actual_assignees)

        if plan["milestone"]:
            milestone = issue.get("milestone")
            checks["milestone"] = (
                isinstance(milestone, dict)
                and milestone.get("title") == plan["milestone"]
            )

        relationships = plan["relationships"]
        if relationships["parent"]:
            checks["parent"] = issue_number(issue.get("parent")) == issue_number(
                relationships["parent"]
            )
        if relationships["blockedBy"]:
            checks["blockedBy"] = {
                issue_number(value) for value in relationships["blockedBy"]
            }.issubset(issue_numbers(issue.get("blockedBy")))
        if relationships["blocking"]:
            checks["blocking"] = {
                issue_number(value) for value in relationships["blocking"]
            }.issubset(issue_numbers(issue.get("blocking")))
    except (AdapterError, TypeError) as error:
        errors.append(f"Issue verification failed: {error}")

    try:
        item = item_for_url(config, issue_url)
        checks["projectItem"] = item is not None
        if item is not None:
            expected_fields = {
                "Status": plan["projectStatus"],
                "Type": plan["type"],
                "Area": plan["area"],
                "Priority": plan["priority"],
                "Effort": plan["effort"],
            }
            checks["projectFields"] = {
                name: {
                    "expected": expected,
                    "actual": item_field_value(item, name),
                    "ok": item_field_value(item, name) == expected,
                }
                for name, expected in expected_fields.items()
            }
    except AdapterError as error:
        errors.append(f"Project verification failed: {error}")

    flat_checks = [
        value
        for key, value in checks.items()
        if key != "projectFields" and isinstance(value, bool)
    ]
    field_checks = [
        value["ok"]
        for value in checks.get("projectFields", {}).values()
        if isinstance(value, dict) and "ok" in value
    ]
    ok = not errors and all(flat_checks) and len(field_checks) == 5 and all(field_checks)
    return {"ok": ok, "checks": checks, "errors": errors}


def refine_issue(
    plan: dict[str, Any], config: dict[str, Any], issue_url: str
) -> dict[str, Any]:
    errors: list[dict[str, str]] = []
    completed: list[str] = []
    args = [
        "issue",
        "edit",
        issue_url,
        "--repo",
        config["repository"],
    ]
    if "body" in plan["updates"]:
        args.extend(["--body-file", plan["bodyFile"]])
    if "title" in plan["updates"]:
        args.extend(["--title", plan["title"]])

    try:
        run_gh(args)
        completed.extend(plan["updates"])
    except AdapterError as error:
        errors.append({"step": "issueEdit", "error": str(error)})

    verification = verify(plan, config, issue_url)
    status = "success" if not errors and verification["ok"] else "partial"
    return {
        "status": status,
        "issueUrl": issue_url,
        "completed": completed,
        "errors": errors,
        "verification": verification,
    }


def add_relationships(
    plan: dict[str, Any], config: dict[str, Any], issue_url: str
) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    relationships = plan["relationships"]
    current: dict[str, Any] = {}
    try:
        current = run_gh(
            [
                "issue",
                "view",
                issue_url,
                "--repo",
                config["repository"],
                "--json",
                "parent,blockedBy,blocking",
            ],
            parse_json=True,
        )
    except AdapterError as error:
        errors.append({"step": "relationshipsRead", "error": str(error)})

    parent = relationships["parent"]
    parent_values = (
        [parent]
        if parent and issue_number(current.get("parent")) != issue_number(parent)
        else []
    )
    blocked_by_values = [
        value
        for value in relationships["blockedBy"]
        if issue_number(value) not in issue_numbers(current.get("blockedBy"))
    ]
    blocking_values = [
        value
        for value in relationships["blocking"]
        if issue_number(value) not in issue_numbers(current.get("blocking"))
    ]
    operations = [
        ("parent", "--parent", parent_values),
        ("blockedBy", "--add-blocked-by", blocked_by_values),
        ("blocking", "--add-blocking", blocking_values),
    ]
    for name, flag, values in operations:
        if not values:
            continue
        try:
            run_gh(
                [
                    "issue",
                    "edit",
                    issue_url,
                    "--repo",
                    config["repository"],
                    flag,
                    ",".join(values),
                ]
            )
        except AdapterError as error:
            errors.append({"step": name, "error": str(error)})
    return errors


def configure(
    plan: dict[str, Any], config: dict[str, Any], issue_url: str
) -> dict[str, Any]:
    errors: list[dict[str, str]] = []
    completed: list[str] = []
    item_id: str | None = None

    try:
        item_id = add_or_resolve_item(config, issue_url)
        completed.append("projectItem")
    except AdapterError as error:
        errors.append({"step": "projectItem", "error": str(error)})

    if item_id:
        requested_fields = [
            ("Status", config["defaults"]["status"]),
            ("Type", plan["type"]),
            ("Area", plan["area"]),
            ("Priority", plan["priority"]),
            ("Effort", plan["effort"]),
        ]
        for field_name, option_name in requested_fields:
            try:
                set_project_field(config, item_id, field_name, option_name)
                completed.append(field_name)
            except AdapterError as error:
                errors.append({"step": field_name, "error": str(error)})

    relationship_errors = add_relationships(plan, config, issue_url)
    errors.extend(relationship_errors)
    completed.extend(
        name
        for name in ("parent", "blockedBy", "blocking")
        if plan["relationships"][name]
        and not any(error["step"] == name for error in relationship_errors)
    )

    verification = verify(plan, config, issue_url)
    status = "success" if not errors and verification["ok"] else "partial"
    return {
        "status": status,
        "issueUrl": issue_url,
        "projectItemId": item_id,
        "completed": completed,
        "errors": errors,
        "verification": verification,
    }


def doctor(config: dict[str, Any]) -> dict[str, Any]:
    checks: dict[str, Any] = {
        "ghInstalled": shutil.which("gh") is not None,
        "authentication": False,
        "repository": False,
        "project": False,
        "projectFields": False,
    }
    errors: list[str] = []

    if not checks["ghInstalled"]:
        return {"ok": False, "checks": checks, "errors": ["gh is not installed"]}

    try:
        checks["ghVersion"] = run_gh(["--version"]).splitlines()[0]
        run_gh(["auth", "status", "--hostname", config["host"]])
        checks["authentication"] = True
    except AdapterError as error:
        errors.append(f"Authentication check failed: {error}")

    try:
        repo = run_gh(
            ["repo", "view", config["repository"], "--json", "nameWithOwner"],
            parse_json=True,
        )
        checks["repository"] = repo.get("nameWithOwner") == config["repository"]
    except AdapterError as error:
        errors.append(f"Repository check failed: {error}")

    try:
        project = run_gh(
            [
                "project",
                "view",
                str(config["project"]["number"]),
                "--owner",
                config["project"]["owner"],
                "--format",
                "json",
            ],
            parse_json=True,
        )
        checks["project"] = (
            project.get("id") == config["project"]["id"]
            and project.get("title") == config["project"]["title"]
        )
    except AdapterError as error:
        errors.append(f"Project check failed: {error}")

    try:
        payload = run_gh(
            [
                "project",
                "field-list",
                str(config["project"]["number"]),
                "--owner",
                config["project"]["owner"],
                "--format",
                "json",
            ],
            parse_json=True,
        )
        actual_fields = {
            field.get("name"): field
            for field in payload.get("fields", [])
            if isinstance(field, dict)
        }
        field_results: dict[str, bool] = {}
        for name, expected in config["fields"].items():
            actual = actual_fields.get(name, {})
            actual_options = {
                option.get("name"): option.get("id")
                for option in actual.get("options", [])
                if isinstance(option, dict)
            }
            field_results[name] = (
                actual.get("id") == expected["id"]
                and all(
                    actual_options.get(option_name) == option_id
                    for option_name, option_id in expected["options"].items()
                )
            )
        checks["fieldDetails"] = field_results
        checks["projectFields"] = len(field_results) == 5 and all(
            field_results.values()
        )
    except AdapterError as error:
        errors.append(f"Project field check failed: {error}")

    boolean_checks = [
        value for value in checks.values() if isinstance(value, bool)
    ]
    return {"ok": not errors and all(boolean_checks), "checks": checks, "errors": errors}


def require_healthy_github(config: dict[str, Any]) -> None:
    result = doctor(config)
    if result["ok"]:
        return
    errors = result["errors"]
    failed_checks = [
        name
        for name, value in result["checks"].items()
        if isinstance(value, bool) and not value
    ]
    details = errors or [f"Failed checks: {', '.join(failed_checks)}"]
    raise AdapterError("GitHub preflight failed: " + "; ".join(details))


def duplicate_query(title: str, prefix: str) -> str:
    value = title.removeprefix(prefix).strip()
    words = re.findall(r"[A-Za-z0-9][A-Za-z0-9_-]+", value.lower())
    useful = [word for word in words if word not in STOP_WORDS]
    return " ".join(useful[:8]) or value


def duplicates(
    plan: dict[str, Any], config: dict[str, Any], limit: int
) -> dict[str, Any]:
    prefix = config["titlePrefixes"][plan["type"]]
    query = duplicate_query(plan["title"], prefix)
    issues = run_gh(
        [
            "issue",
            "list",
            "--repo",
            config["repository"],
            "--state",
            "all",
            "--search",
            query,
            "--limit",
            "20",
            "--json",
            "number,title,state,url,body",
        ],
        parse_json=True,
    )
    if not isinstance(issues, list):
        raise AdapterError("Duplicate search returned an unexpected JSON shape")

    requested = plan["title"].lower()
    candidates: list[dict[str, Any]] = []
    for issue in issues:
        if not isinstance(issue, dict):
            continue
        title = str(issue.get("title", ""))
        score = difflib.SequenceMatcher(None, requested, title.lower()).ratio()
        candidates.append(
            {
                "number": issue.get("number"),
                "title": title,
                "state": issue.get("state"),
                "url": issue.get("url"),
                "bodyExcerpt": str(issue.get("body", ""))[:600],
                "score": round(score, 3),
            }
        )
    candidates.sort(key=lambda candidate: candidate["score"], reverse=True)
    return {"ok": True, "query": query, "candidates": candidates[:limit]}


def plan_schema(config: dict[str, Any]) -> dict[str, Any]:
    return {
        "schemaVersion": config["schemaVersion"],
        "operation": {"enum": ["create", "refine"]},
        "repository": {"const": config["repository"]},
        "required": [
            "schemaVersion",
            "operation",
            "repository",
            "title",
            "bodyFile",
            "type",
            "area",
            "priority",
            "effort",
            "labels",
            "assignees",
            "relationships",
        ],
        "fields": {
            "title": {
                "type": "string",
                "maxLength": 256,
                "prefixByType": config["titlePrefixes"],
            },
            "bodyFile": {"type": "absolute-path", "content": "non-empty Markdown"},
            "updates": {
                "type": "array",
                "items": {"enum": ["body", "title"]},
                "requiredWhen": {"operation": "refine"},
            },
            "type": {"enum": list(config["fields"]["Type"]["options"])},
            "area": {"enum": list(config["fields"]["Area"]["options"])},
            "priority": {"enum": list(config["fields"]["Priority"]["options"])},
            "effort": {"enum": list(config["fields"]["Effort"]["options"])},
            "impact": {
                "type": ["string", "null"],
                "requiredWhen": {"priority": ["P0", "P1"]},
            },
            "labels": {"type": "array", "items": "existing label name"},
            "assignees": {"type": "array", "items": "GitHub login"},
            "milestone": {"type": ["string", "null"]},
            "projectStatus": {
                "enum": list(config["fields"]["Status"]["options"]),
            },
            "relationships": {
                "type": "object",
                "required": ["parent", "blockedBy", "blocking"],
                "fields": {
                    "parent": {"type": ["issue-reference", "null"]},
                    "blockedBy": {"type": "array", "items": "issue-reference"},
                    "blocking": {"type": "array", "items": "issue-reference"},
                },
            },
        },
        "defaults": {
            "impact": None,
            "labels": [],
            "assignees": [],
            "milestone": None,
            "relationships": {
                "parent": None,
                "blockedBy": [],
                "blocking": [],
            },
            "projectStatus": config["defaults"]["status"],
            "priority": config["defaults"]["priority"],
        },
        "constraints": {
            "highPriorityRequiresImpact": ["P0", "P1"],
            "xlAllowedTypes": ["Epic", "Research"],
            "blockedByAndBlockingMustNotOverlap": True,
            "unknownFieldsRejected": True,
            "createStartsWithDefaultStatus": config["defaults"]["status"],
            "createRejectsUpdates": True,
            "refineMutatesOnlyAuthorizedUpdates": ["body", "title"],
        },
    }


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(
        description="Safely manage HN Glance ticket creation and project configuration."
    )
    commands = root.add_subparsers(dest="command", required=True)

    commands.add_parser("schema", help="Print the accepted ticket-plan contract.")
    commands.add_parser("doctor", help="Check gh auth and live project configuration.")

    validate_command = commands.add_parser(
        "validate", help="Validate a ticket plan without GitHub access."
    )
    validate_command.add_argument("--plan", type=Path, required=True)

    duplicate_command = commands.add_parser(
        "duplicates", help="Return bounded duplicate candidates."
    )
    duplicate_command.add_argument("--plan", type=Path, required=True)
    duplicate_command.add_argument("--limit", type=int, default=5)

    create_command = commands.add_parser(
        "create", help="Create one issue, configure it, and verify the result."
    )
    create_command.add_argument("--plan", type=Path, required=True)

    refine_command = commands.add_parser(
        "refine", help="Edit authorized issue fields and verify the result."
    )
    refine_command.add_argument("--plan", type=Path, required=True)
    refine_command.add_argument("--issue-url", required=True)

    configure_command = commands.add_parser(
        "configure", help="Resume project and relationship configuration."
    )
    configure_command.add_argument("--plan", type=Path, required=True)
    configure_command.add_argument("--issue-url", required=True)

    verify_command = commands.add_parser(
        "verify", help="Verify an issue and its project item against a plan."
    )
    verify_command.add_argument("--plan", type=Path, required=True)
    verify_command.add_argument("--issue-url", required=True)
    return root


def main() -> int:
    args = parser().parse_args()
    try:
        config = load_config()

        if args.command == "schema":
            emit(plan_schema(config))
            return 0
        if args.command == "doctor":
            result = doctor(config)
            emit(result)
            return 0 if result["ok"] else 1

        plan, warnings = validate_plan(args.plan, config)

        if args.command == "validate":
            emit({"ok": True, "warnings": warnings})
            return 0
        if args.command == "duplicates":
            require_plan_operation(plan, "create")
            if args.limit < 1 or args.limit > 10:
                raise AdapterError("--limit must be between 1 and 10")
            result = duplicates(plan, config, args.limit)
            result["warnings"] = warnings
            emit(result)
            return 0
        if args.command == "verify":
            result = verify(plan, config, args.issue_url)
            result["warnings"] = warnings
            emit(result)
            return 0 if result["ok"] else 2
        if args.command == "configure":
            require_plan_operation(plan, "create")
            if not ISSUE_URL_RE.fullmatch(args.issue_url):
                raise AdapterError("--issue-url must be a GitHub issue URL")
            require_healthy_github(config)
            result = configure(plan, config, args.issue_url)
            result["warnings"] = warnings
            emit(result)
            return 0 if result["status"] == "success" else 2
        if args.command == "refine":
            require_plan_operation(plan, "refine")
            if not ISSUE_URL_RE.fullmatch(args.issue_url):
                raise AdapterError("--issue-url must be a GitHub issue URL")
            require_healthy_github(config)
            result = refine_issue(plan, config, args.issue_url)
            result["warnings"] = warnings
            emit(result)
            return 0 if result["status"] == "success" else 2
        if args.command == "create":
            require_plan_operation(plan, "create")
            require_healthy_github(config)
            issue_url = create_issue(plan, config)
            result = configure(plan, config, issue_url)
            result["issueCreated"] = True
            result["warnings"] = warnings
            emit(result)
            return 0 if result["status"] == "success" else 2

        raise AdapterError(f"Unsupported command: {args.command}")
    except AdapterError as error:
        emit({"ok": False, "error": str(error)})
        return 1


if __name__ == "__main__":
    sys.exit(main())
