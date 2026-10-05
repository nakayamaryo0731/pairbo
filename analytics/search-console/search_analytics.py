"""検索パフォーマンス（クリック・表示回数・CTR・掲載順位）をTSVで出力する。

例: uv run --with google-auth --with requests python analytics/search-console/search_analytics.py 2026-01-01 2026-10-04 query 100
"""

import sys
from urllib.parse import quote

from client import SITE, session

start, end, dims = sys.argv[1], sys.argv[2], sys.argv[3].split(",")
limit = int(sys.argv[4]) if len(sys.argv) > 4 else 100

res = session().post(
    f"https://searchconsole.googleapis.com/webmasters/v3/sites/{quote(SITE, safe='')}/searchAnalytics/query",
    json={"startDate": start, "endDate": end, "dimensions": dims, "rowLimit": limit},
)
res.raise_for_status()

for row in res.json().get("rows", []):
    print(
        *row["keys"],
        int(row["clicks"]),
        int(row["impressions"]),
        f"{row['ctr'] * 100:.1f}%",
        f"{row['position']:.1f}",
        sep="\t",
    )
