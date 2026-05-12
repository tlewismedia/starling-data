# Eval diagnostics — 2026-05-12 (b9b29f1)

Items below MRR 0.5 get a per-stage chunk dump. Verdicts:

- **ALL_FOUND** — every expected chunk is in the post-rerank top-K. Score is low because keywords are spread across many chunks or rank positions, not because retrieval lost anything.
- **RERANK_DROPPED** — at least one expected chunk was in the candidate pool (retrieve or citation-follow output) but rerank pushed it out of the top-K. Suggests trying a different reranker model or richer chunk text fed to rerank.
- **RECALL_FAIL** — at least one expected chunk never made the candidate pool. Reranker can't help. Suggests hybrid search (BM25 + dense), bigger oversample, or richer chunk text at index time.

### #6 — Direct fact — MRR 0.46 · pin 1.00 · kw 100% — **ALL_FOUND**

**Query:** Does the surprise exam under the custody rule actually need to be a surprise, or can our auditor schedule it like the financial audit?

**Expected chunks:**
- **EXPECT-A** `17-CFR-275.206(4)-2::(a)::p0` — found in reranked top-10 at rank 3
- **EXPECT-B** `17-CFR-275.206(4)-2::(d)::p0` — found in reranked top-10 at rank 2

**Stage 1 — retrieve top-20:**
```
   1. 17-CFR-275.206(4)-2::(d)::p0  ← EXPECT-B
   2. 17-CFR-275.206(4)-2::(b)::p0
   3. 17-CFR-275.206(4)-2::(a)::p0  ← EXPECT-A
   4. Kestrel-WSP-Annual-Cert-2025::supporting-report-6.-known-issues-as-of-the-certification-date
   5. 17-CFR-275.206(4)-2::275.206-4-2-investment-adviser-custody-rule.-c-definitions.-custody.
   6. 17-CFR-240.15c3-3::(f)::p0
   7. Kestrel-AML-Program::kestrel-aml-program-5.-transaction-monitoring-5.3-sar-sf-filing
   8. Kestrel-Reg-BI-Disclosure-Procedures::kestrel-reg-bi-disclosure-and-recommendation-handling-procedures-2.-the-four-reg-bi-obligations-operational-mapping
   9. 17-CFR-275.206(4)-2::275.206-4-2-investment-adviser-custody-rule.
  10. Kestrel-WSP-Annual-Cert-2025::supporting-report-4.-testing-and-monitoring-activities-in-2025
  11. 17-CFR-275.206(4)-2::275.206-4-2-investment-adviser-custody-rule.-c-definitions.-qualified-custodian.
  12. Kestrel-Best-Execution-Policy::kestrel-best-execution-policy-3.-the-best-execution-committee-3.2-cadence
  13. FINRA-Rule-3110::rule-3110.-supervision-c-internal-inspections.-2-reduced-cadences.
  14. Kestrel-Reg-BI-Disclosure-Procedures::kestrel-reg-bi-disclosure-and-recommendation-handling-procedures-4.-care-obligation-recommendation-handling-4.4-series-of-recommendations
  15. Kestrel-FINRA-Exam-Letter-2025::kestrel-internal-disposition-notes
  16. 17-CFR-240.15l-1::cross-references
  17. Kestrel-Marketing-Rule-Review::kestrel-advisors-marketing-rule-review-7.-solicitors
  18. 17-CFR-240.15l-1::compliance-notes-for-kestrel-securities
  19. Kestrel-FINRA-Exam-Letter-2025::finra-routine-examination-exit-letter-kestrel-securities-2025-cycle-3.-finding-2-email-supervision-sampling-under-finra-rule-3110-rule-citation-for-kestrel-s-response
  20. Kestrel-AML-Program::kestrel-aml-program-4.-customer-due-diligence-beneficial-ownership
```

**Stage 2 — citation-follow added (5):**
```
   1. 31-CFR-Part-1023::1023.230-customer-due-diligence-rule-beneficial-ownership-.
   2. 31-CFR-Part-1023::1023.320-reports-by-brokers-or-dealers-of-suspicious-transactions.-d-confidentiality.
   3. 17-CFR-240.17a-4::(f)::p0
   4. FINRA-Rule-5310::.03::p0
   5. 17-CFR-240.17a-4::(e)::p0
```

**Stage 3 — rerank top-10:**
```
   1. 17-CFR-275.206(4)-2::(b)::p0
   2. 17-CFR-275.206(4)-2::(d)::p0  ← EXPECT-B
   3. 17-CFR-275.206(4)-2::(a)::p0  ← EXPECT-A
   4. Kestrel-WSP-Annual-Cert-2025::supporting-report-6.-known-issues-as-of-the-certification-date
   5. 17-CFR-275.206(4)-2::275.206-4-2-investment-adviser-custody-rule.-c-definitions.-custody.
   6. 17-CFR-275.206(4)-2::275.206-4-2-investment-adviser-custody-rule.
   7. 17-CFR-275.206(4)-2::275.206-4-2-investment-adviser-custody-rule.-c-definitions.-qualified-custodian.
   8. Kestrel-WSP-Annual-Cert-2025::supporting-report-4.-testing-and-monitoring-activities-in-2025
   9. Kestrel-FINRA-Exam-Letter-2025::finra-routine-examination-exit-letter-kestrel-securities-2025-cycle-3.-finding-2-email-supervision-sampling-under-finra-rule-3110-rule-citation-for-kestrel-s-response
  10. 17-CFR-240.15c3-3::(f)::p0
```

### #28 — Relationship — MRR 0.41 · pin 1.00 · kw 100% — **ALL_FOUND**

**Query:** How does the aggregation-unit framework change whether a broker-dealer is treated as owning a security for short-sale purposes?

**Expected chunks:**
- **EXPECT-A** `17-CFR-242.200::(d)::p0` — found in reranked top-10 at rank 1
- **EXPECT-B** `17-CFR-242.200::(f)::p0` — found in reranked top-10 at rank 3

**Stage 1 — retrieve top-20:**
```
   1. 17-CFR-242.200::(d)::p0  ← EXPECT-A
   2. 17-CFR-242.200::(f)::p0  ← EXPECT-B
   3. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures-2.-short-sale-order-marking-17-cfr-242.200-g
   4. 17-CFR-242.200::(b)::p0
   5. 17-CFR-242.200::(g)::p0
   6. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures-2.-short-sale-order-marking-17-cfr-242.200-g-2.1-aggregation-units
   7. 17-CFR-242.200::(c)::p0
   8. 17-CFR-242.200::242.200-definition-of-short-sale-and-marking-requirements.-long-sale-documentation.
   9. 17-CFR-242.203::(b)(1)::p0
  10. 17-CFR-240.15c3-3::(b)::p0
  11. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures-4.-locate-17-cfr-242.203-b-4.3-order-by-order-locate
  12. 17-CFR-242.203::(a)::p0
  13. 31-CFR-Part-1023::1023.230-customer-due-diligence-rule-beneficial-ownership-.
  14. 17-CFR-242.203::(b)(2)(ii)::p0
  15. 17-CFR-242.204::(b)::p0
  16. 17-CFR-242.203::(b)(2)(i)::p0
  17. 17-CFR-242.203::(b)(3)::p0
  18. 17-CFR-242.200::regulation-sho-short-sales
  19. 17-CFR-240.15c3-3::(d)::p0
  20. 17-CFR-242.203::(b)(2)(iii)::p0
```

**Stage 2 — citation-follow added (1):**
```
   1. 17-CFR-242.201::242.201-price-test-restriction-alternative-uptick-rule-.
```

**Stage 3 — rerank top-10:**
```
   1. 17-CFR-242.200::(d)::p0  ← EXPECT-A
   2. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures-2.-short-sale-order-marking-17-cfr-242.200-g
   3. 17-CFR-242.200::(f)::p0  ← EXPECT-B
   4. 17-CFR-242.200::(g)::p0
   5. 17-CFR-242.200::242.200-definition-of-short-sale-and-marking-requirements.-long-sale-documentation.
   6. 17-CFR-242.203::(b)(1)::p0
   7. 17-CFR-242.200::(b)::p0
   8. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures-2.-short-sale-order-marking-17-cfr-242.200-g-2.1-aggregation-units
   9. 17-CFR-242.203::(b)(2)(iii)::p0
  10. 17-CFR-240.15c3-3::(b)::p0
```

### #33 — Multi-hop — MRR 0.25 · pin 0.50 · kw 50% — **RECALL_FAIL**

**Query:** How do the best-execution deficiencies in the FINRA AWC enforcement action overlap with FINRA's 2025 findings against Kestrel?

**Expected chunks:**
- **EXPECT-A** `FINRA-AWC-2023056789201::finra-office-of-hearing-officers-iv.-facts-and-violative-conduct-a.-rule-5310-best-execution` — NEVER appeared in any stage (recall failure)
- **EXPECT-B** `Kestrel-FINRA-Exam-Letter-2025::finra-routine-examination-exit-letter-kestrel-securities-2025-cycle-2.-finding-1-rule-5310-regular-and-rigorous-review-finding` — found in reranked top-10 at rank 2

**Stage 1 — retrieve top-20:**
```
   1. Kestrel-WSP-Annual-Cert-2025::supporting-report-1.-executive-summary
   2. Kestrel-FINRA-Exam-Letter-2025::kestrel-internal-disposition-notes
   3. Kestrel-FINRA-Exam-Letter-2025::finra-routine-examination-exit-letter-kestrel-securities-2025-cycle-2.-finding-1-rule-5310-regular-and-rigorous-review-finding  ← EXPECT-B
   4. Kestrel-FINRA-Exam-Letter-2025::finra-routine-examination-exit-letter-kestrel-securities-2025-cycle-1.-overview
   5. Kestrel-FINRA-Exam-Letter-2025::finra-routine-examination-exit-letter-kestrel-securities-2025-cycle-3.-finding-2-email-supervision-sampling-under-finra-rule-3110-rule-citation-for-kestrel-s-response
   6. Kestrel-Best-Execution-Policy::kestrel-best-execution-policy-1.-purpose
   7. Kestrel-FINRA-Exam-Letter-2025::finra-routine-examination-exit-letter-kestrel-securities-2025-cycle-2.-finding-1-rule-5310-regular-and-rigorous-review-requested-response
   8. FINRA-AWC-2023056789201::finra-office-of-hearing-officers-letter-of-acceptance-waiver-and-consent-no.-2023056789201
   9. Kestrel-FINRA-Exam-Letter-2025::finra-routine-examination-exit-letter-kestrel-securities-2025-cycle-3.-finding-2-email-supervision-sampling-under-finra-rule-3110-finding
  10. Kestrel-WSP-Annual-Cert-2025::supporting-report-7.-references
  11. Kestrel-Best-Ex-Committee-Minutes-Q1-2026::kestrel-best-execution-committee-q1-2026-meeting-minutes-6.-finra-2025-finding-1-remediation-status
  12. Kestrel-Best-Ex-Committee-Minutes-Q1-2026::kestrel-best-execution-committee-q1-2026-meeting-minutes-agenda
  13. Kestrel-Best-Execution-Policy::kestrel-best-execution-policy-7.-references
  14. Kestrel-WSP-Annual-Cert-2025::supporting-report-6.-known-issues-as-of-the-certification-date
  15. Kestrel-Best-Ex-Committee-Minutes-Q1-2026::kestrel-best-execution-committee-q1-2026-meeting-minutes-references
  16. Kestrel-WSP-Annual-Cert-2025::supporting-report-4.-testing-and-monitoring-activities-in-2025
  17. Kestrel-FINRA-Exam-Letter-2025::finra-routine-examination-exit-letter-kestrel-securities-2025-cycle-5.-next-steps
  18. Kestrel-WSP-Annual-Cert-2025::supporting-report-3.-major-policy-and-procedure-actions-in-2025
  19. FINRA-AWC-2023056789201::finra-office-of-hearing-officers-v.-sanctions-a.-the-firm.
  20. FINRA-AWC-2023056789201::finra-office-of-hearing-officers-i.-acceptance-and-consent
```

**Stage 2 — citation-follow added (5):**
```
   1. FINRA-Rule-5310::compliance-notes-for-kestrel-securities
   2. FINRA-Rule-5310::chunk_17
   3. 17-CFR-240.15l-1::compliance-notes-for-kestrel-securities
   4. 17-CFR-240.15l-1::cross-references
   5. FINRA-Rule-5310::.01::p0
```

**Stage 3 — rerank top-10:**
```
   1. Kestrel-WSP-Annual-Cert-2025::supporting-report-1.-executive-summary
   2. Kestrel-FINRA-Exam-Letter-2025::finra-routine-examination-exit-letter-kestrel-securities-2025-cycle-2.-finding-1-rule-5310-regular-and-rigorous-review-finding  ← EXPECT-B
   3. Kestrel-FINRA-Exam-Letter-2025::kestrel-internal-disposition-notes
   4. Kestrel-FINRA-Exam-Letter-2025::finra-routine-examination-exit-letter-kestrel-securities-2025-cycle-1.-overview
   5. Kestrel-FINRA-Exam-Letter-2025::finra-routine-examination-exit-letter-kestrel-securities-2025-cycle-3.-finding-2-email-supervision-sampling-under-finra-rule-3110-finding
   6. Kestrel-WSP-Annual-Cert-2025::supporting-report-4.-testing-and-monitoring-activities-in-2025
   7. FINRA-Rule-5310::chunk_17
   8. Kestrel-Best-Execution-Policy::kestrel-best-execution-policy-1.-purpose
   9. Kestrel-FINRA-Exam-Letter-2025::finra-routine-examination-exit-letter-kestrel-securities-2025-cycle-3.-finding-2-email-supervision-sampling-under-finra-rule-3110-rule-citation-for-kestrel-s-response
  10. Kestrel-WSP-Annual-Cert-2025::supporting-report-3.-major-policy-and-procedure-actions-in-2025
```

### #35 — Multi-hop — MRR 0.45 · pin 0.50 · kw 80% — **ALL_FOUND**

**Query:** For a bona-fide market maker, does Reg SHO treat the locate-requirement exception and the fail-to-deliver close-out deadline the same way, or differently?

**Expected chunks:**
- **EXPECT-A** `17-CFR-242.203::(b)(2)(i)::p0` — found in reranked top-10 at rank 10
- **EXPECT-B** `17-CFR-242.204::(a)::p0` — found in reranked top-10 at rank 1

**Stage 1 — retrieve top-20:**
```
   1. 17-CFR-242.203::(b)(2)(ii)::p0
   2. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures-4.-locate-17-cfr-242.203-b-4.4-exceptions-bona-fide-market-making
   3. 17-CFR-242.203::(b)(2)(iii)::p0
   4. 17-CFR-242.203::(b)(2)(i)::p0  ← EXPECT-A
   5. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures-5.-settlement-and-close-out-17-cfr-242.204-5.2-close-out-obligation
   6. 17-CFR-242.204::(a)::p0  ← EXPECT-B
   7. 17-CFR-242.203::(a)::p0
   8. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures-4.-locate-17-cfr-242.203-b-4.1-the-locate-requirement
   9. 17-CFR-242.200::regulation-sho-short-sales
  10. 17-CFR-242.203::(b)(1)(ii)::p0
  11. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures-2.-short-sale-order-marking-17-cfr-242.200-g
  12. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures-1.-scope
  13. 17-CFR-242.203::(b)(1)::p0
  14. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures-4.-locate-17-cfr-242.203-b-4.3-order-by-order-locate
  15. 17-CFR-242.203::(b)(1)(i)::p0
  16. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures-9.-references
  17. 17-CFR-242.203::(b)(1)(iii)::p0
  18. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures-8.-training
  19. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures-7.-recordkeeping
  20. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures
```

**Stage 2 — citation-follow added (5):**
```
   1. 17-CFR-240.17a-3::(v)::p0
   2. 17-CFR-240.17a-4::(f)::p0
   3. 17-CFR-242.201::242.201-price-test-restriction-alternative-uptick-rule-.
   4. 17-CFR-240.17a-3::(v)::p1
   5. 17-CFR-240.17a-4::(e)::p0
```

**Stage 3 — rerank top-10:**
```
   1. 17-CFR-242.204::(a)::p0  ← EXPECT-B
   2. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures-4.-locate-17-cfr-242.203-b-4.4-exceptions-bona-fide-market-making
   3. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures-5.-settlement-and-close-out-17-cfr-242.204-5.2-close-out-obligation
   4. 17-CFR-242.203::(b)(2)(ii)::p0
   5. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures-2.-short-sale-order-marking-17-cfr-242.200-g
   6. 17-CFR-242.203::(b)(2)(iii)::p0
   7. Kestrel-Reg-SHO-Locate-Policy::kestrel-reg-sho-locate-policy-and-fail-to-deliver-close-out-procedures-4.-locate-17-cfr-242.203-b-4.1-the-locate-requirement
   8. 17-CFR-242.200::regulation-sho-short-sales
   9. 17-CFR-242.203::(a)::p0
  10. 17-CFR-242.203::(b)(2)(i)::p0  ← EXPECT-A
```

### #37 — Multi-hop — MRR 0.20 · pin 0.50 · kw 100% — **ALL_FOUND**

**Query:** Advisers Act Rule 204A-1 requires access persons to file quarterly reports on personal trades. What does Kestrel's Code of Ethics add on top of that before a trade can even happen?

**Expected chunks:**
- **EXPECT-A** `17-CFR-275.204A-1::(b)(2)::p0` — found in reranked top-10 at rank 3
- **EXPECT-B** `Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-4.-personal-trading-4.3-pre-clearance` — found in reranked top-10 at rank 8

**Stage 1 — retrieve top-20:**
```
   1. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-4.-personal-trading-4.5-reporting
   2. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-1.-introduction
   3. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-4.-personal-trading-4.3-pre-clearance  ← EXPECT-B
   4. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-4.-personal-trading-4.1-covered-accounts
   5. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-10.-references
   6. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-9.-recordkeeping
   7. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-6.-outside-business-activities-and-political-contributions-6.1-outside-business-activities
   8. 17-CFR-275.204A-1::(b)(2)::p0  ← EXPECT-A
   9. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-4.-personal-trading-4.2-designated-brokerage
  10. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-2.-standards-of-business-conduct
  11. Kestrel-Trade-Surveillance-Alert-Summary::kestrel-trade-surveillance-q4-2025-alert-summary-2.-governing-framework
  12. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-4.-personal-trading-4.6-reportable-securities
  13. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy
  14. 17-CFR-275.204A-1::(b)::p0
  15. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-6.-outside-business-activities-and-political-contributions-6.2-political-contributions
  16. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-7.-reporting-violations-and-whistleblower-protections
  17. Kestrel-Information-Barriers::kestrel-information-barriers-restricted-list-and-watch-list-policy-1.-purpose
  18. Kestrel-Information-Barriers::kestrel-information-barriers-restricted-list-and-watch-list-policy-8.-references
  19. 17-CFR-275.204A-1::(a)::p0
  20. Kestrel-Information-Barriers::kestrel-information-barriers-restricted-list-and-watch-list-policy-4.-restricted-watch-and-control-lists-4.3-control-list
```

**Stage 2 — citation-follow added (5):**
```
   1. 31-CFR-Part-1023::compliance-notes-for-kestrel-securities
   2. 15-USC-80b-6::(c)::p0
   3. FINRA-Rule-3110::rule-3110.-supervision-d-transaction-review-and-investigation.
   4. 17-CFR-240.17a-3::(v)::p1
   5. 15-USC-80b-6::(b)::p0
```

**Stage 3 — rerank top-10:**
```
   1. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-1.-introduction
   2. 17-CFR-275.204A-1::(a)::p0
   3. 17-CFR-275.204A-1::(b)(2)::p0  ← EXPECT-A
   4. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-2.-standards-of-business-conduct
   5. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-4.-personal-trading-4.5-reporting
   6. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-9.-recordkeeping
   7. 17-CFR-275.204A-1::(b)::p0
   8. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-4.-personal-trading-4.3-pre-clearance  ← EXPECT-B
   9. Kestrel-Information-Barriers::kestrel-information-barriers-restricted-list-and-watch-list-policy-4.-restricted-watch-and-control-lists-4.3-control-list
  10. Kestrel-Code-of-Ethics::kestrel-code-of-ethics-and-personal-trading-policy-4.-personal-trading-4.2-designated-brokerage
```

### #38 — Multi-hop — MRR 0.38 · pin 1.00 · kw 88% — **ALL_FOUND**

**Query:** How do SEC Rule 15c3-3's possession-or-control requirement and the 15c3-3a customer reserve formula work together to protect customer assets?

**Expected chunks:**
- **EXPECT-A** `17-CFR-240.15c3-3::(b)::p0` — found in reranked top-10 at rank 5
- **EXPECT-B** `17-CFR-240.15c3-3a::240.15c3-3a-customer-reserve-formula.` — found in reranked top-10 at rank 4

**Stage 1 — retrieve top-20:**
```
   1. 17-CFR-240.15c3-3::securities.
   2. 17-CFR-240.15c3-3::(c)::p0
   3. 17-CFR-240.15c3-3::(g)::p0
   4. 17-CFR-240.15c3-3a::240.15c3-3a-customer-reserve-formula.  ← EXPECT-B
   5. 17-CFR-240.15c3-3::(b)::p0  ← EXPECT-A
   6. 17-CFR-240.15c3-3a::240.15c3-3a-customer-reserve-formula.-debits-amounts-owed-by-customers-offsetting-.
   7. 17-CFR-240.15c3-3a::240.15c3-3a-customer-reserve-formula.-credits-amounts-owed-to-customers-.
   8. 17-CFR-240.15c3-3::(f)::p0
   9. 17-CFR-240.15c3-3::(e)::p0
  10. 17-CFR-240.15c3-3::pab-.
  11. 17-CFR-240.15c3-3::securities.-a-definitions.-qualified-security-qualified-bank.
  12. 17-CFR-240.15c3-3::securities.-a-definitions.-excess-margin-securities.
  13. 17-CFR-240.15c3-3::securities.-a-definitions.-customer.
  14. 17-CFR-240.15c3-3::securities.-a-definitions.-fully-paid-securities.
  15. 17-CFR-240.15c3-1::240.15c3-1-net-capital-requirements-for-brokers-or-dealers.
  16. 17-CFR-240.15c3-3::(d)::p0
  17. 17-CFR-240.15c3-5::market-access.-c-required-controls.-c-1-financial-risk-management-controls.
  18. 17-CFR-240.15c3-1::240.15c3-1-net-capital-requirements-for-brokers-or-dealers.-b-definitions.-aggregate-indebtedness.
  19. 17-CFR-240.15c3-1::(a)::p0
  20. 17-CFR-240.15c3-5::market-access.
```

**Stage 2 — citation-follow added (0):**
(none — no extracted citations or all already in pool)

**Stage 3 — rerank top-10:**
```
   1. 17-CFR-240.15c3-3::securities.
   2. 17-CFR-240.15c3-3::pab-.
   3. 17-CFR-240.15c3-3::(g)::p0
   4. 17-CFR-240.15c3-3a::240.15c3-3a-customer-reserve-formula.  ← EXPECT-B
   5. 17-CFR-240.15c3-3::(b)::p0  ← EXPECT-A
   6. 17-CFR-240.15c3-3::(c)::p0
   7. 17-CFR-240.15c3-3::(f)::p0
   8. 17-CFR-240.15c3-3a::240.15c3-3a-customer-reserve-formula.-debits-amounts-owed-by-customers-offsetting-.
   9. 17-CFR-240.15c3-1::(a)::p0
  10. 17-CFR-240.15c3-3::securities.-a-definitions.-customer.
```

