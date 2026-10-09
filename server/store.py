# server/store.py
# Tiny JSON document store on SQLite; replaces the browser's IndexedDB so all devices share data.
import json
import os
import sqlite3
import threading


class Store:
    def __init__(self, path):
        self._lock = threading.Lock()
        self._db = sqlite3.connect(str(path), check_same_thread=False)
        self._db.execute(
            "CREATE TABLE IF NOT EXISTS docs (store TEXT, id TEXT, json TEXT, PRIMARY KEY (store, id))"
        )
        self._db.commit()

    def get_all(self, store):
        with self._lock:
            rows = self._db.execute("SELECT json FROM docs WHERE store = ?", (store,)).fetchall()
        return [json.loads(r[0]) for r in rows]

    def get(self, store, id):
        with self._lock:
            row = self._db.execute("SELECT json FROM docs WHERE store = ? AND id = ?", (store, id)).fetchone()
        return json.loads(row[0]) if row else None

    def put(self, store, doc):
        with self._lock:
            self._db.execute(
                "INSERT OR REPLACE INTO docs (store, id, json) VALUES (?, ?, ?)",
                (store, str(doc["id"]), json.dumps(doc)),
            )
            self._db.commit()
        return doc

    def delete(self, store, id):
        with self._lock:
            self._db.execute("DELETE FROM docs WHERE store = ? AND id = ?", (store, id))
            self._db.commit()

    def clear(self, store):
        with self._lock:
            self._db.execute("DELETE FROM docs WHERE store = ?", (store,))
            self._db.commit()


class PostgresStore:
    """Same API as Store, backed by Postgres (used on Vercel, where the local disk is temporary)."""

    def __init__(self, url):
        import psycopg
        self._psycopg = psycopg
        self._url = url
        self._lock = threading.Lock()
        self._conn = None
        self._run("CREATE TABLE IF NOT EXISTS docs (store TEXT, id TEXT, json TEXT, PRIMARY KEY (store, id))")

    def _run(self, sql, params=(), fetch=None):
        with self._lock:
            for attempt in (1, 2):
                try:
                    if self._conn is None or self._conn.closed:
                        self._conn = self._psycopg.connect(self._url, autocommit=True, prepare_threshold=None)
                    with self._conn.cursor() as cur:
                        cur.execute(sql, params)
                        if fetch == "one":
                            return cur.fetchone()
                        if fetch == "all":
                            return cur.fetchall()
                        return None
                except self._psycopg.OperationalError:
                    self._conn = None          # stale serverless connection: reconnect once
                    if attempt == 2:
                        raise

    def get_all(self, store):
        return [json.loads(r[0]) for r in self._run("SELECT json FROM docs WHERE store = %s", (store,), "all")]

    def get(self, store, id):
        row = self._run("SELECT json FROM docs WHERE store = %s AND id = %s", (store, id), "one")
        return json.loads(row[0]) if row else None

    def put(self, store, doc):
        self._run("INSERT INTO docs (store, id, json) VALUES (%s, %s, %s) "
                  "ON CONFLICT (store, id) DO UPDATE SET json = EXCLUDED.json",
                  (store, str(doc["id"]), json.dumps(doc)))
        return doc

    def delete(self, store, id):
        self._run("DELETE FROM docs WHERE store = %s AND id = %s", (store, id))

    def clear(self, store):
        self._run("DELETE FROM docs WHERE store = %s", (store,))


def open_store(default_path):
    """Postgres when DATABASE_URL/POSTGRES_URL is set, otherwise SQLite (Vercel without a DB: /tmp, not persistent)."""
    url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
    if url:
        return PostgresStore(url)
    path = os.environ.get("ECOSORT_DB_PATH") or ("/tmp/ecosort.db" if os.environ.get("VERCEL") else default_path)
    return Store(path)
