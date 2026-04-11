from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

import httpx

from connector_library.connector_configs import ConnectorConfig, get_config


class OAuthExchangeError(RuntimeError):
    pass


@dataclass(slots=True)
class TokenResponse:
    access_token: str
    refresh_token: str | None
    expires_at: str | None
    scopes: str | None
    account_label: str | None


def _compute_expires_at(token_payload: dict[str, Any]) -> str | None:
    expires_in = token_payload.get("expires_in")
    if isinstance(expires_in, str) and expires_in.isdigit():
        expires_in = int(expires_in)
    if isinstance(expires_in, (int, float)) and expires_in > 0:
        expiry = datetime.now(UTC) + timedelta(seconds=int(expires_in))
        return expiry.isoformat(timespec="milliseconds")

    expires_at_value = token_payload.get("expires_at")
    if isinstance(expires_at_value, str) and expires_at_value:
        return expires_at_value
    return None


def _extract_access_token(payload: dict[str, Any]) -> str:
    direct_value = payload.get("access_token")
    if isinstance(direct_value, str) and direct_value:
        return direct_value

    authed_user = payload.get("authed_user")
    if isinstance(authed_user, dict):
        nested_value = authed_user.get("access_token")
        if isinstance(nested_value, str) and nested_value:
            return nested_value

    raise OAuthExchangeError("OAuth provider did not return an access token")


def _extract_refresh_token(payload: dict[str, Any]) -> str | None:
    refresh_value = payload.get("refresh_token")
    if isinstance(refresh_value, str) and refresh_value:
        return refresh_value

    authed_user = payload.get("authed_user")
    if isinstance(authed_user, dict):
        nested_value = authed_user.get("refresh_token")
        if isinstance(nested_value, str) and nested_value:
            return nested_value
    return None


def _extract_scopes(payload: dict[str, Any]) -> str | None:
    scope_value = payload.get("scope")
    if isinstance(scope_value, str) and scope_value:
        return scope_value

    scopes_value = payload.get("scopes")
    if isinstance(scopes_value, list):
        scopes = [item for item in scopes_value if isinstance(item, str) and item]
        if scopes:
            return " ".join(scopes)
    return None


def _extract_account_label(connector_name: str, payload: dict[str, Any]) -> str | None:
    if connector_name == "slack":
        team_value = payload.get("team")
        if isinstance(team_value, dict):
            team_name = team_value.get("name")
            if isinstance(team_name, str) and team_name:
                return team_name

    if connector_name == "github":
        login_value = payload.get("login")
        if isinstance(login_value, str) and login_value:
            return login_value

    return None


def build_auth_url(connector_name: str, state: str, code_challenge: str) -> str:
    config = get_config(connector_name)
    query_params: dict[str, str] = {
        "response_type": "code",
        "client_id": config.client_id,
        "redirect_uri": config.redirect_uri,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    if config.scopes:
        query_params["scope"] = " ".join(config.scopes)
    query_params.update(config.auth_extra_params)
    return f"{config.auth_url}?{urlencode(query_params)}"


def _build_exchange_payload(
    connector_name: str,
    config: ConnectorConfig,
    code: str,
    code_verifier: str,
) -> dict[str, str]:
    payload: dict[str, str] = {
        "client_id": config.client_id,
        "client_secret": config.client_secret,
        "code": code,
        "redirect_uri": config.redirect_uri,
        "code_verifier": code_verifier,
    }
    if connector_name in {"jira", "sheets"}:
        payload["grant_type"] = "authorization_code"
    return payload


async def _post_token_request(
    token_url: str,
    payload: dict[str, str],
) -> dict[str, Any]:
    headers = {"Accept": "application/json"}
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(token_url, data=payload, headers=headers)

    response.raise_for_status()
    parsed_payload: dict[str, Any] = response.json()
    ok_flag = parsed_payload.get("ok")
    if ok_flag is False:
        error_text = parsed_payload.get("error", "OAuth request rejected")
        raise OAuthExchangeError(str(error_text))
    return parsed_payload


def _parse_token_response(connector_name: str, payload: dict[str, Any]) -> TokenResponse:
    access_token = _extract_access_token(payload)
    refresh_token = _extract_refresh_token(payload)
    expires_at = _compute_expires_at(payload)
    scopes = _extract_scopes(payload)
    account_label = _extract_account_label(connector_name, payload)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
        scopes=scopes,
        account_label=account_label,
    )


async def exchange_code(
    connector_name: str,
    code: str,
    code_verifier: str,
) -> TokenResponse:
    try:
        config = get_config(connector_name)
        token_payload = _build_exchange_payload(
            config.connector_name,
            config,
            code,
            code_verifier,
        )
        response_payload = await _post_token_request(config.token_url, token_payload)
        return _parse_token_response(config.connector_name, response_payload)
    except OAuthExchangeError:
        raise
    except Exception as error:
        raise OAuthExchangeError("Failed to exchange OAuth code") from error


async def refresh_token(
    connector_name: str,
    refresh_token_value: str,
) -> TokenResponse:
    try:
        config = get_config(connector_name)
        payload = {
            "grant_type": "refresh_token",
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "refresh_token": refresh_token_value,
        }
        response_payload = await _post_token_request(config.token_url, payload)
        token_response = _parse_token_response(config.connector_name, response_payload)
        if token_response.refresh_token is None:
            token_response.refresh_token = refresh_token_value
        return token_response
    except OAuthExchangeError:
        raise
    except Exception as error:
        raise OAuthExchangeError("Failed to refresh OAuth token") from error


async def revoke_token(connector_name: str, access_token: str) -> None:
    config = get_config(connector_name)
    if not config.revoke_url:
        return

    payload = {"token": access_token}
    if config.connector_name == "jira":
        payload["client_id"] = config.client_id
        payload["client_secret"] = config.client_secret

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(config.revoke_url, data=payload)
            if response.status_code >= 400:
                raise OAuthExchangeError(
                    f"OAuth revoke failed with status {response.status_code}"
                )
    except Exception as error:
        raise OAuthExchangeError("Failed to revoke OAuth token") from error
