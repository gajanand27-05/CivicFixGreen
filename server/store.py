# server/store.py
# Tiny JSON document store on SQLite; replaces the browser's IndexedDB so all devices share data.
import json
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
