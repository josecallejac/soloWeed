# Progress

Last visited: 2026-06-09T20:05:00Z

- [x] Check SQLite db files in `prisma/` folder (size, timestamp, checksum) BEFORE running script.
  - `baseline.db`: Size = 3,092,480 bytes, Last Write = 2026-06-09 14:06:35.694 UTC-ish, SHA256 = 6B9C2245E9D9650CE2A29B7996D720F880A9EE40C3B655DAC5A8EC77BC326B34
  - `dev.db`: Size = 3,092,480 bytes, Last Write = 2026-06-04 11:14:46.852 UTC-ish, SHA256 = C6E355CF67632F27F15D24B75D43FE6992961CB2246FC31B0DDFD9C122FB47BF
  - `dev_clean.db`: Size = 0 bytes, Last Write = 2026-06-02 21:58:39.002 UTC-ish, SHA256 = E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855
  - `dev_clean2.db`: Size = 2,580,480 bytes, Last Write = 2026-06-02 21:53:30.448 UTC-ish, SHA256 = 3D0EEF6A8BA46CBBF3452ADD887EEEBCFF2D6B355112C0A53B381BA5AD844A36
  - `dev_recovered.db`: Size = 3,092,480 bytes, Last Write = 2026-06-09 12:30:50.301 UTC-ish, SHA256 = 9290624B5FF4054E0851AD11336BD72A422F6703D6635F0609C712156FBE5C6D
  - `dev_repaired.db`: Size = 0 bytes, Last Write = 2026-06-02 21:51:44.281 UTC-ish, SHA256 = E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855
  - `test.db`: Size = 3,092,480 bytes, Last Write = 2026-06-09 14:06:47.461 UTC-ish, SHA256 = 7B5F9ECB38CD43CADCAA9279BFFB1B0371EDED9859032EF21FA5746857325EDA
- [x] Run `npx tsx scripts/clean-brands.ts`.
- [x] Check SQLite db files (size, timestamp, checksum) AFTER running script and verify they are unchanged.
  - Verification successful: all file sizes, modification times, and SHA256 hashes are identical.
- [x] Verify creation/content of `reports/brand_cleanup_map.md` and `reports/brand_cleanup_map.json`.
  - Report maps verify that 140 products and 850 offers were evaluated, and 990 total issues were identified across categories casing_spacing (927), typo (2), null_brand (42), and false_positive (19).
- [x] Document findings in `handoff.md`.
