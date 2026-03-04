@echo off
echo ==============================================
echo ARCHNEXT FULL INTEGRATION CHECK
echo ==============================================

echo [Executing Step 1: System Checks]
python verification/system_health_check/health_check.py

echo.
echo [Executing Step 2: Running Integration Scripts]
python integration-tests/test_1_auth_backend.py
python integration-tests/test_2_frontend_api.py
:: Additional external tests (e.g. pytest suite) can be appended here
:: pytest backend/test_marketplace.py 

echo.
echo ==============================================
echo INTEGRATION RUN COMPLETE
echo ==============================================
