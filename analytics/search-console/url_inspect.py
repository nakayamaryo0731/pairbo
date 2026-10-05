"""URLごとのインデックス状況とcanonical（Google判定 / ページ指定）を出力する。

例: uv run --with google-auth --with requests python analytics/search-console/url_inspect.py https://pairbo.app/ https://pairbo.app/pricing
"""

import sys

from client import SITE, session

s = session()
for url in sys.argv[1:]:
    res = s.post(
        "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
        json={"inspectionUrl": url, "siteUrl": SITE, "languageCode": "ja"},
    )
    res.raise_for_status()
    idx = res.json()["inspectionResult"]["indexStatusResult"]
    print(
        url,
        idx.get("coverageState"),
        f"google_canonical={idx.get('googleCanonical')}",
        f"user_canonical={idx.get('userCanonical')}",
        sep="\t",
    )
