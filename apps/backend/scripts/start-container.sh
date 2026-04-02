#!/bin/sh

set -eu

local_mongo_pid=""

cleanup() {
  if [ -n "$local_mongo_pid" ] && kill -0 "$local_mongo_pid" 2>/dev/null; then
    kill "$local_mongo_pid" 2>/dev/null || true
    wait "$local_mongo_pid" 2>/dev/null || true
  fi
}

trap cleanup INT TERM EXIT

if [ -z "${MONGODB_URI:-}" ]; then
  local_mongo_port="${LOCAL_MONGODB_PORT:-27017}"
  local_mongo_db="${LOCAL_MONGODB_DB_NAME:-motoroom}"
  local_mongo_path="${MONGODB_DATA_PATH:-/data/db}"
  local_mongo_log="/tmp/mongod.log"

  export MONGODB_URI="mongodb://127.0.0.1:${local_mongo_port}/${local_mongo_db}"

  mkdir -p "$local_mongo_path"
  rm -f "$local_mongo_log"

  echo "Starting bundled MongoDB on ${MONGODB_URI}"
  mongod \
    --bind_ip 127.0.0.1 \
    --port "$local_mongo_port" \
    --dbpath "$local_mongo_path" \
    --logpath "$local_mongo_log" \
    --nounixsocket &
  local_mongo_pid=$!

  attempts=0
  until mongosh --quiet "$MONGODB_URI" --eval "db.adminCommand({ ping: 1 }).ok" >/dev/null 2>&1; do
    attempts=$((attempts + 1))

    if [ "$attempts" -ge 30 ]; then
      echo "Bundled MongoDB failed to start" >&2
      if [ -f "$local_mongo_log" ]; then
        cat "$local_mongo_log" >&2
      fi
      exit 1
    fi

    sleep 1
  done
fi

echo "Starting backend on port ${PORT:-4000}"
npm start &
app_pid=$!

wait "$app_pid"
app_status=$?

cleanup
exit "$app_status"
