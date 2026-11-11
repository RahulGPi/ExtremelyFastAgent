# Memory and web update evaluation — 11 November 2026

Eight real requests were sent through the local Node server and configured model and Tavily providers. The server used a separate `/tmp` database with six synthetic past conversations, in the Asia/Kolkata time zone. It did not use the user's personal history. The Neon and Supabase prices in the fixture were explicitly marked synthetic and not verified historical prices. Every question was asked in a separate new session. The test represents one run per question, not a statistical benchmark. Search result excerpts and matching URLs were inspected; individual current-price and feature claims were not independently audited against all original pages.

| Result | Question | Outcome | Total time |
| --- | --- | --- | ---: |
| Fail | On Monday we shortlisted 5 CRM tools for a 20-person sales team. Has any of them changed pricing or shipped something big since? | HTTP 500: `Search limit reached`. The model exceeded the server’s allowed search calls or rounds; no useful answer was returned. | 1.1 s |
| Pass, limited | What did I ask you on 3 November? Is your answer still correct today? | Recalled the synthetic question about Japan's capital and the previous answer, retrieved five web results and cited three. The extra claim about a second-capital law was not independently checked. | 5.8 s |
| Fail | Last Tuesday I asked you about Postgres hosting. Has any pricing changed since then? | Recalled both providers and correctly flagged the historical prices as synthetic, but the long response ended mid-sentence; only two of ten retrieved URLs were cited before truncation. It could not reliably answer the whole question. | 26.3 s |
| Pass | What did I ask on 3 November 2026? | Recalled the seeded Japan-capital question and its answer without a web search. | 0.6 s |
| Partial | Last Friday we compared two VPNs. Have their prices changed since? | Recalled both VPNs and correctly said it could not determine a change because no past prices were recorded. Returned six citations among fifteen retrieved URLs; current price claims were not independently audited. | 23.1 s |
| Pass | Last Thursday what task management tools did you recommend? | Correctly recalled Asana and Trello from the synthetic earlier conversation. | 0.6 s |
| Partial | What did I ask you on 18 October 2026? | Correctly said no matching records existed, but included a stray `</think>` marker and repeated the answer. | 0.8 s |
| Fail | On Monday did the CRM shortlist get any major new features since our discussion? | HTTP 500: `Search limit reached`. No useful answer was returned. | 1.4 s |

Timing is end-to-end wall time, including model and search-provider latency. It does not measure application overhead separately. The results show three passes, two partial results, and three failures under these criteria. A valid citation URL does not establish that the source supports every associated claim.

The observed follow-up priorities are handling multi-entity search requests within a configurable budget instead of failing outright; detecting provider output truncation and responding gracefully; removing model reasoning delimiters and duplicated output; and adding per-claim evidence checks. The model's own answers and provider results can vary between runs.
