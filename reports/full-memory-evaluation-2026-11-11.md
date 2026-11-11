# Full eight-case evaluation — 11 November 2026

All eight questions were run once against the code at commit `6652cc3`, using the configured model and Tavily providers. A fresh isolated SQLite database contained six synthetic earlier conversations, interpreted in Asia/Kolkata. The Postgres historical prices were explicitly labeled synthetic and unverified. Each test used a fresh chat session. Timings are total wall time, including provider latency; they are not application-only measurements. Outputs and source snippets were inspected but web claims were not independently audited against all underlying pages.

A **pass** means the question was answered adequately against the fixture; **partial** means SOLO retrieved relevant history or provided useful uncertainty, but did not complete the requested research. No result is counted as a full pass solely because it returned HTTP 200 or source links.

| Case | Result | Observation | Time |
| --- | --- | --- | ---: |
| Monday's five CRM tools: price changes or big releases? | Partial | Recalled all five and the absence of past prices; returned 23 results, but no verified comparison. | 37.3 s |
| What did I ask on 3 November, and is the answer still correct? | Partial | Recalled the Japan-capital question and previous answer, but said it could not verify the current answer despite returning relevant sources. | 1.9 s |
| Last Tuesday's Postgres hosting: did pricing change? | Partial | Recalled the two providers and the synthetic/unverified baseline, and avoided an unsupported comparison; did not provide a current price comparison. | 25.2 s |
| What did I ask on 3 November? | Pass | Correctly recalled the Japan-capital question. | 0.6 s |
| Last Friday's VPN comparison: have prices changed? | Partial | Recalled Proton VPN and Mullvad and showed the record that no past prices were saved; returned sources, not a current comparison. | 21.3 s |
| What task-management tools were recommended last Thursday? | Pass | Correctly recalled Asana and Trello. | 0.7 s |
| What did I ask on 18 October 2001? | Pass | Correctly said no earlier question was found; no leaked reasoning tag or duplicated answer. | 0.3 s |
| Did Monday's CRM shortlist get major new features since the discussion? | Partial | Recalled the shortlist, returned 17 sources and an incomplete-coverage warning, but did not identify a verified feature update. | 63.9 s |

**Summary:** 3 passes, 5 partial results, and no hard HTTP failures. The five partial answers did not fully satisfy the research questions. All 20 offline tests also passed. The extra model-based evidence check is fallible and appears overly conservative in these cases. One run cannot establish provider reliability or factual correctness across the dataset.

Full raw responses and retrieved excerpts for this run were saved to `/tmp/solo-full-results-20261111-01.json`; this temporary file may be removed by the operating system. No real user conversation history was used.
