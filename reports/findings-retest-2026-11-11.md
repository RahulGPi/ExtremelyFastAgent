# Individually reviewed findings: eight-case retest

Eight live requests used an isolated database of synthetic conversations in Asia/Kolkata. API/model and search results vary between runs; links and model audits are not independent proof of the claims. The Postgres baseline in the fixture was explicitly synthetic and unverified. Timings include network and providers.

| Case | Result | Observation | Wall time |
| --- | --- | --- | ---: |
| Five-CRM updates | Partial | Recalled all five, but returned 20 links rather than a comparison. Diagnostics recorded truncation. | 53.9 s |
| Dated question and recheck | Pass with limits | Identified the earlier question and answered that Tokyo remained the capital, with links. Its additional legislation claim was not independently audited against the pages. | 4.5 s |
| Postgres prices | Fail / partial | Returned cited current figures and labeled the old prices synthetic, but described one price as “still” matching the synthetic baseline, which could imply an unsupported historical comparison. | 34.9 s |
| Dated recall only | Pass | Recalled the Japan-capital question. | 0.5 s |
| VPN update | Failed | The model providers could not complete the answer; earlier history and search links were returned. | 1.7 s |
| Task-tool recall | Pass | Recalled Asana and Trello. | 0.5 s |
| Missing-history question | Pass | Said the requested record was not found. | 0.3 s |
| CRM feature updates | Failed | The model providers could not complete the answer; earlier history was returned. | 0.6 s |

The full run completed before final refinements: filtering “still/remains” from unsupported dated comparisons, comparing dates in the local time zone, and reviewing separate sentences independently. These are covered by offline tests; no subsequent full live run was performed. Provider failures were observed but their precise cause was not established. CRM research remains unsolved.

## Profiling from this run

The profiler measures only the `reply()` function: local HTTP handling, writing the final answer, and rendering are excluded. “External wait” is the union of intervals spent awaiting model and search calls, including network and client request handling. The application estimate subtracts that union, so it is an approximation, not a complete application-only benchmark. Model/search interval sums can overlap; the union avoids double subtraction.

| Case | Reply | External-wait union | Estimated local remainder | Audit calls total | Provider-reported audit tokens in/out |
| --- | ---: | ---: | ---: | ---: | ---: |
| Five-CRM updates | 53,824 ms | 53,806 ms | 17 ms | 0 ms | 0 / 0 |
| Dated recheck | 4,477 ms | 4,473 ms | 4 ms | 216 ms | 1,226 / 6 |
| Postgres prices | 34,893 ms | 34,889 ms | 5 ms | 716 ms | 2,671 / 71 |

The CRM case used 19,699 input and 3,933 output tokens across five successful model calls that reported usage; no audit call completed for that case. The Postgres figures cover two audit calls. Token counts exclude failed or unreported usage and are not a monetary cost estimate. Rounding can make individual timing columns differ by 1 ms. Further diagnostics record reason codes and counts without conversation text when `SOLO_DIAGNOSTICS=1`.
