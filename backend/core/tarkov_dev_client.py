import asyncio
import logging
from typing import Dict, Optional, Any

import httpx
from httpcore import TimeoutException
from httpx import HTTPStatusError
from urllib3.exceptions import RequestError

logger = logging.getLogger(__name__)


class TarkovDevAPIClient:

    def __init__(
            self,
            timeout: int = 30,
            retries: int = 3,
            retry_backoff: float = 2.0,
    ):
        self.timeout = timeout
        self.retries = retries
        self.retry_backoff = retry_backoff

    async def request(
            self,
            method: str = 'POST',
            params: Optional[Dict[str, Any]] = None,
            query: str = ''
    ) -> Optional[Dict[str, Any]]:
        url = 'https://api.tarkov.dev/graphql'
        headers = {'Content-Type': 'application/json'}

        for attempt in range(1, self.retries + 1):
            try:
                async with httpx.AsyncClient() as client:
                    process_method = getattr(client, method.lower())
                    response = await process_method(
                        url,
                        params=params,
                        headers=headers,
                        json={'query': query}
                    )
                    response.raise_for_status()
                    api_data = response.json()

                if not isinstance(api_data, dict):
                    logger.error(
                        f'Unexpected response from TarkovDevAPIClient:'
                        f' {api_data}',
                    )
                    return None
                return api_data
            except (TimeoutException, RequestError, HTTPStatusError) as e:
                should_retry = True
                if isinstance(e, HTTPStatusError):
                    status_code = e.response.status_code
                    should_retry = status_code >= 500 or status_code == 429
                    if not should_retry:
                        logger.error(
                            f'Non-retryable HTTP status, {status_code}'
                        )
                        return None

                if attempt >= self.retries or not should_retry:
                    logger.exception(
                        f'Failed to fetch API data after {attempt} attempts'
                    )
                    return None

                delay = self.retry_backoff * (2 ** (attempt + - 1))
                logger.warning(
                    f'Temporary API error (attempt {attempt}/{self.retries}). Retrying in {delay}.1fs'
                )
                await asyncio.sleep(delay)
            except Exception as e:
                logger.exception(
                    f'Undexpected exception while requesting API data from TarkovDevAPIClient: {e}'
                )
                return None
            return None
