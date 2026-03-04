# ArchNext Structure Report

This document reports the latest structural segregation of the ArchNext architecture into highly separated and easily testable master modules.

## Modules Created
1. `shared/`: The new central nervous system.
   - `abis/`: (`marketplace_abi.json`, `contract_abi.json`, `property_nft_abi.json`) extracted here.
   - `envs/`: Isolated `.env.example` templates for rapid environment recovery.
   - `types/`: Allocated for Typescript/Pydantic domain translation (Currently empty).
2. `integration-tests/`: The central hub for crossing boundaries.
   - `test_1_auth_backend.py` (Probes API accessibility)
   - `test_2_frontend_api.py` (Probes UI API paths)
3. `verification/`: Specialized tools for ensuring system integrity.
   - Top level: `verify_backend.py`, `verify_frontend.js`, `verify_blockchain.ts`
   - Subdirectories: `errors/`, `logs/` (Backend logs are currently configured out-of-the-box in `core/config.py`).
   - `system_health_check/health_check.py`: Output PASS/FAIL matrices for the entire ecosystem.

## Files Moved & Import Repairs
- React hooks reading ABIs natively lacked `fs` linkage and weren't disturbed entirely (no JSON import matches).
- Python APIs routing ABIs internally were rewritten from:
  `../../contract_abi.json` => `../../../shared/abis/contract_abi.json` via a regex rewrite.
- Local execution commands `.bat` injected directly into root for effortless cross-platform boot.

## Start Commands
Booting individual domains manually through `cd` commands is obsolete. 
Root-level files handle environment activation and missing dependency installations automatically:
- `start_backend.bat`
- `start_frontend.bat`
- `start_blockchain.bat`
- `start_archnext_fullstack.bat` (Generates 3 separate windows natively)
- `run_full_integration_check.bat` (Runs the test pipelines and health matrix)

## Performance & Debugging Suggestions
- All backend systems logging with Loguru or standard `logging.Logger` should be manually mounted into `/verification/logs/backend.log` moving forward.
- Keep the `shared/` footprint minimal. Next.js can struggle importing pure Python/TS mix projects locally; ensure ABIs remain the primary connection.
