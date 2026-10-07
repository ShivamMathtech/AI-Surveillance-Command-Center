# Start the application

1. Install and start Docker Desktop (Linux containers).
2. Extract the ZIP.
3. Open a terminal inside `surveillance-command-center` (the folder containing `docker-compose.yml`).
4. Run:

   ```sh
   docker compose up
   ```

5. After the containers become healthy, open **http://localhost:8080**.

The simulated command center opens automatically. Use Start/Pause/Reset and the scenario selector at the top. No GPU or camera is required.

For administrator controls:

```sh
docker compose exec backend cat /run/secrets/bootstrap_password
```

Sign out of the demo and sign in as `admin` with that generated password.

API documentation: **http://localhost:8000/docs**.

Read `README.md` for Windows/Python development setup and `docs/FEATURE_COVERAGE.md` for integration boundaries. This is a tested engineering baseline; Docker boot and physical sensor integrations still require validation in your environment.
