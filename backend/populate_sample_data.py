"""Populate the Smart City RDF store via the backend REST API.

Usage:
  1) Start the backend server (Flask) locally:
       python backend/app.py
  2) Run this script from the repository root:
       python backend/populate_sample_data.py

The script is idempotent for named entities (it checks existing station names / transport names / user names and skips duplicates).
"""

import requests
import sys
import time

API_BASE = 'http://127.0.0.1:5001/api'

sample_stations = [
    {"type": "StationBus", "nom": "Station_Centre", "latitude": 36.849508, "longitude": 10.200554},
    {"type": "StationMétro", "nom": "Station_Wael", "latitude": 36.852117, "longitude": 10.242268},
    {"type": "Parking", "nom": "Station_Manzah1", "latitude": 36.843961, "longitude": 10.190413}
]

sample_transports = [
    {"type": "Bus", "nom": "Bus_324", "capacite": 32, "immatriculation": "BUS-324", "vitesseMax": 90, "electrique": False},
    {"type": "Métro", "nom": "Metro_A", "capacite": 200, "immatriculation": "METRO-1", "vitesseMax": 80, "electrique": True},
    {"type": "Trottinette", "nom": "Trotti_01", "capacite": 1, "immatriculation": "TROT-01", "vitesseMax": 25, "electrique": True}
]

sample_users = [
    {"nom": "Ali", "age": 25, "email": "ali@example.com", "type": "Citoyen"},
    {"nom": "Wael", "age": 43, "email": "wael.marwani@esprit.tn", "type": "Citoyen"},
    {"nom": "Kenza", "age": 30, "email": "kenza@example.com", "type": "Touriste"}
]

sample_events = [
    {"type": "Accident", "nom": "Accident_Test", "description": "Accident test", "gravite": 3, "date": "2025-10-27"},
]


def check_server():
    try:
        r = requests.get(f"{API_BASE}/health", timeout=5)
        if r.status_code == 200:
            print("Backend is up:", r.json())
            return True
        else:
            print("Backend health returned:", r.status_code, r.text)
            return False
    except Exception as e:
        print("Cannot reach backend:", e)
        return False


def get_existing(endpoint):
    try:
        r = requests.get(f"{API_BASE}/{endpoint}")
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return []


def upsert_stations():
    existing = get_existing('stations')
    existing_names = {s.get('nom') for s in existing}
    created = 0

    for s in sample_stations:
        if s['nom'] in existing_names:
            print(f"Skipping existing station: {s['nom']}")
            continue
        resp = requests.post(f"{API_BASE}/stations", json=s)
        if resp.status_code in (200, 201):
            print(f"Created station: {s['nom']}")
            created += 1
        else:
            print(f"Failed to create station {s['nom']}: {resp.status_code} {resp.text}")
    return created


def upsert_transports():
    existing = get_existing('transports')
    existing_names = {t.get('nom') for t in existing}
    created = 0

    for t in sample_transports:
        if t['nom'] in existing_names:
            print(f"Skipping existing transport: {t['nom']}")
            continue
        resp = requests.post(f"{API_BASE}/transports", json=t)
        if resp.status_code in (200, 201):
            print(f"Created transport: {t['nom']}")
            created += 1
        else:
            print(f"Failed to create transport {t['nom']}: {resp.status_code} {resp.text}")
    return created


def upsert_users():
    existing = get_existing('users')
    existing_names = {u.get('nom') for u in existing}
    created = 0

    for u in sample_users:
        if u['nom'] in existing_names:
            print(f"Skipping existing user: {u['nom']}")
            continue
        resp = requests.post(f"{API_BASE}/users", json=u)
        if resp.status_code in (200, 201):
            print(f"Created user: {u['nom']}")
            created += 1
        else:
            print(f"Failed to create user {u['nom']}: {resp.status_code} {resp.text}")
    return created


def upsert_events():
    existing = get_existing('events')
    existing_names = {e.get('nom') for e in existing}
    created = 0

    for ev in sample_events:
        if ev['nom'] in existing_names:
            print(f"Skipping existing event: {ev['nom']}")
            continue
        resp = requests.post(f"{API_BASE}/events", json=ev)
        if resp.status_code in (200, 201):
            print(f"Created event: {ev['nom']}")
            created += 1
        else:
            print(f"Failed to create event {ev['nom']}: {resp.status_code} {resp.text}")
    return created


if __name__ == '__main__':
    if not check_server():
        print('\nPlease start the backend server (Flask) first:')
        print('  python backend/app.py')
        sys.exit(1)

    print('\nUpserting stations...')
    s = upsert_stations()
    print(f'Stations created: {s}\n')

    print('Upserting transports...')
    t = upsert_transports()
    print(f'Transports created: {t}\n')

    print('Upserting users...')
    u = upsert_users()
    print(f'Users created: {u}\n')

    print('Upserting events...')
    e = upsert_events()
    print(f'Events created: {e}\n')

    print('Done. You may now run tests against the AI chatbot endpoint.')
