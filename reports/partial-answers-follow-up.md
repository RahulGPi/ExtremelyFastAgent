# Partial research answers: diagnosis and follow-up

The full eight-case evaluation on 11 November 2026 produced three passes and five partial results. In the partial cases, SOLO recalled the relevant history and returned search results, but did not complete the requested research comparison. See [the full evaluation](full-memory-evaluation-2026-11-11.md) for test setup, timing, and results.

| Case | What remained unresolved |
| --- | --- |
| Five CRM tools | The shortlist was recalled, but the answer did not establish which prices or features changed after the original discussion. Past prices were not recorded. |
| 3 November answer | SOLO recalled the question about Japan's capital and the earlier answer, Tokyo, but did not provide a direct current conclusion even though it returned relevant sources. |
| Postgres hosting | Neon and Supabase were recalled; the earlier prices were explicitly synthetic and unverified. SOLO correctly avoided asserting a change based on them, but did not summarize current prices. |
| VPN pricing | The two providers were recalled, and the record said no earlier prices had been saved. SOLO returned links rather than a current-price summary or a direct explanation of what comparison was possible. |
| CRM feature updates | SOLO returned sources and an incomplete-coverage warning but did not identify a supported feature release after the discussion date. |

## What we know and don't know

The app uses an evidence-only fallback when a research draft lacks a matching returned URL or when its model-based evidence audit rejects the draft or cannot complete. The run's logs do not record which condition caused each fallback. It would be premature to attribute every partial answer solely to the audit.

The current audit is fallible: a matching URL is not proof that a claim is supported, and rejecting a complete draft can also hide findings that were supported. A current price alone does not prove a price changed since an earlier date. A dated release also needs evidence that it happened after the user's reference date.

## Work to revisit

1. Record structured diagnostic reasons for each fallback, distinguishing missing citations, audit rejection, audit/provider failure, truncation, and exhausted search budget. Avoid recording API keys or unnecessary private conversation contents.
2. Evaluate and retain findings individually, so an unsupported claim does not discard every supported finding. Present unknown or unchecked products explicitly.
3. Distinguish current prices, previously recorded prices, and verified price changes; show current prices with their sources when available even if the historical baseline is missing.
4. Check product-update dates against the original discussion date and cite the supporting source for each reported update.
5. Add deterministic regression tests for mixed supported/unsupported findings and fallback diagnostics, then rerun the eight live cases. Measure both response quality and the extra latency and API usage from verification.

## Implementation update

An initial pass now records opt-in, content-free diagnostic reason codes and profiles model/search wait, audit time, and provider-reported token usage. When the whole draft is rejected, it can retain original fragments only if the reviewer identifies an exact quote in a cited excerpt. Dated change and release fragments additionally require an ISO date after the reference day; ambiguous and same-day events are withheld. This is deliberately conservative and the reviewer can still make mistakes.

An eight-case live retest is documented in [the findings retest](findings-retest-2026-11-11.md). It improved the dated recheck and produced a partial Postgres comparison, but the CRM case still fell back to links and two cases encountered provider failures. Subsequent stricter handling of “still”, local-date edge cases, and sentence-level splitting was unit-tested, not live-retested. Further work is needed before treating the research cases as solved.
