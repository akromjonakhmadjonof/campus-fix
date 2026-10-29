#!/bin/sh
set -eu
# The official image sources .sh files without executable permission too.
# Passwords are passed as psql variables and quoted as SQL literals, never interpolated SQL.
psql --username postgres --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 \
  --set migration_password="$MIGRATION_PASSWORD" --set app_password="$APP_DB_PASSWORD" <<'SQL'
CREATE ROLE campus_migrate LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'migration_password';
CREATE ROLE campus_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'app_password';
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO campus_migrate;
GRANT USAGE ON SCHEMA public TO campus_app;
ALTER DEFAULT PRIVILEGES FOR ROLE campus_migrate IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO campus_app;
ALTER DEFAULT PRIVILEGES FOR ROLE campus_migrate IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO campus_app;
SQL
# Explicit shadow database: migration role need not have cluster-wide CREATEDB.
psql --username postgres --dbname postgres --set ON_ERROR_STOP=1 <<'SQL'
CREATE DATABASE campus_fix_shadow OWNER campus_migrate;
SQL
