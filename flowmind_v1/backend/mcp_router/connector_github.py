from __future__ import annotations

import asyncio
from typing import Any

from github import Github
from github.Issue import Issue
from github.Repository import Repository

from planner.planner_models import DAGNode


def _build_github_client(token: dict[str, Any]) -> Github:
    access_token = token.get("access_token")
    if not isinstance(access_token, str) or not access_token:
        raise RuntimeError("GitHub access_token is required")
    return Github(access_token)


def _load_repository(github_client: Github, repository_name: str) -> Repository:
    return github_client.get_repo(repository_name)


def create_branch(repo: Repository, ref: str, sha: str) -> str:
    created_ref = repo.create_git_ref(ref=f"refs/heads/{ref}", sha=sha)
    return str(created_ref.ref)


def open_pr(repo: Repository, title: str, body: str, head: str, base: str) -> int:
    pull_request = repo.create_pull(title=title, body=body, head=head, base=base)
    return int(pull_request.number)


def add_comment(issue: Issue, body: str) -> int:
    comment = issue.create_comment(body)
    return int(comment.id)


async def execute_tool(step: DAGNode, token: dict[str, Any]) -> dict[str, Any]:
    try:
        github_client = await asyncio.to_thread(_build_github_client, token)
        tool_name = step.tool_name.strip().lower()
        repository_name = step.input.get("repository")

        if not isinstance(repository_name, str) or not repository_name:
            raise RuntimeError("GitHub tools require input.repository")

        repository = await asyncio.to_thread(
            _load_repository,
            github_client,
            repository_name,
        )

        if tool_name == "create_branch":
            branch_ref = step.input.get("ref")
            commit_sha = step.input.get("sha")
            if not isinstance(branch_ref, str) or not branch_ref:
                raise RuntimeError("GitHub create_branch requires input.ref")
            if not isinstance(commit_sha, str) or not commit_sha:
                raise RuntimeError("GitHub create_branch requires input.sha")
            created_ref = await asyncio.to_thread(
                create_branch,
                repository,
                branch_ref,
                commit_sha,
            )
            data: dict[str, Any] = {"ref": created_ref}
        elif tool_name == "open_pr":
            title = step.input.get("title")
            body = step.input.get("body", "")
            head = step.input.get("head")
            base = step.input.get("base")
            if not isinstance(title, str) or not title:
                raise RuntimeError("GitHub open_pr requires input.title")
            if not isinstance(body, str):
                raise RuntimeError("GitHub open_pr requires input.body to be a string")
            if not isinstance(head, str) or not head:
                raise RuntimeError("GitHub open_pr requires input.head")
            if not isinstance(base, str) or not base:
                raise RuntimeError("GitHub open_pr requires input.base")
            pull_request_number = await asyncio.to_thread(
                open_pr,
                repository,
                title,
                body,
                head,
                base,
            )
            data = {"pull_request_number": pull_request_number}
        elif tool_name == "add_comment":
            issue_number = step.input.get("issue_number")
            body = step.input.get("body")
            if not isinstance(issue_number, int):
                raise RuntimeError("GitHub add_comment requires integer input.issue_number")
            if not isinstance(body, str) or not body:
                raise RuntimeError("GitHub add_comment requires input.body")
            issue = await asyncio.to_thread(repository.get_issue, number=issue_number)
            comment_id = await asyncio.to_thread(add_comment, issue, body)
            data = {"comment_id": comment_id}
        else:
            raise RuntimeError(f"Unsupported GitHub tool: {step.tool_name}")

        return {
            "status": "ok",
            "connector": "github",
            "tool_name": step.tool_name,
            "data": data,
        }
    except Exception as error:
        raise RuntimeError(f"GitHub connector failed: {error}") from error