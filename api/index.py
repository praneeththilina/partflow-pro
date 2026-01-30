import os
import sys
import json
import traceback
import datetime
import base64

# Ensure the current directory is in the path for Vercel imports
sys.path.append(os.path.dirname(__file__))

from flask import Flask, request, jsonify
from flask_cors import CORS
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from database import init_db, create_user, authenticate_user, DB_PATH

app = Flask(__name__)
CORS(app)

# Initialize Database (SQLite in /tmp for Vercel)
init_db()

# SECURITY: Basic API Key for internal bridge
API_KEY = "partflow_secret_token_2026"

def check_auth():
    auth_header = request.headers.get('X-API-KEY')
    return auth_header == API_KEY

# Path to the JSON key (Fallback for local/PythonAnywhere)
SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), 'config', 'service-account.json')
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

# --- Helper Functions ---

def get_google_config():
    """
    Load Google service account credentials from environment or file.
    Priority:
      1. GOOGLE_SERVICE_ACCOUNT_JSON (raw JSON)
      2. GOOGLE_SERVICE_ACCOUNT_B64 (base64 JSON)
      3. Local file fallback
    """
    config = None

    # --- 1. Raw JSON env ---
    raw_json = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    if raw_json:
        try:
            cleaned = raw_json.strip()
            if cleaned and cleaned[0] in ("'", '"') and cleaned[-1] == cleaned[0]:
                cleaned = cleaned[1:-1]
            config = json.loads(cleaned)
        except Exception as e:
            print(f"WARNING: Invalid GOOGLE_SERVICE_ACCOUNT_JSON: {e}")

    # --- 2. Base64 JSON env ---
    if not config:
        b64 = os.environ.get("GOOGLE_SERVICE_ACCOUNT_B64")
        if b64:
            try:
                # Remove any accidental whitespace/newlines from B64 string
                b64_cleaned = "".join(b64.split())
                decoded = base64.b64decode(b64_cleaned).decode("utf-8")
                config = json.loads(decoded)
            except Exception as e:
                print(f"WARNING: Invalid GOOGLE_SERVICE_ACCOUNT_B64: {e}")

    # --- 3. File fallback ---
    if not config and os.path.exists(SERVICE_ACCOUNT_FILE):
        try:
            with open(SERVICE_ACCOUNT_FILE, "r", encoding="utf-8") as f:
                config = json.load(f)
        except Exception as e:
            print(f"WARNING: Invalid service account file: {e}")

    if not config:
        return None

    # --- Normalize private key ---
    if "private_key" not in config:
        return config # Let the caller handle missing field error

    key = config["private_key"]
    # Ensure it's a string
    if not isinstance(key, str):
        return config

    # Convert literal \n to real newlines
    key = key.replace("\\n", "\n").strip()
    
    # Clean up accidental quotes
    if (key.startswith('"') and key.endswith('"')) or (key.startswith("'") and key.endswith("'")):
        key = key[1:-1].replace("\\n", "\n").strip()

    config["private_key"] = key
    return config


def get_sheets_service():
    """Returns an authorized Google Sheets service object or raises clear error"""
    config = get_google_config()
    if not config:
        raise RuntimeError("Service account credentials not found in environment or file")

    required_fields = ["client_email", "private_key", "token_uri"]
    missing = [f for f in required_fields if f not in config]
    if missing:
        raise RuntimeError(f"Missing fields in service account JSON: {missing}")

    try:
        creds = service_account.Credentials.from_service_account_info(
            config,
            scopes=SCOPES
        )
        return build("sheets", "v4", credentials=creds)
    except Exception as e:
        print("AUTHENTICATION ERROR TRACEBACK:")
        traceback.print_exc()
        raise e

def ensure_headers(service, spreadsheet_id, sheet_name, headers):
    try:
        spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        sheets = spreadsheet.get('sheets', [])
        sheet_exists = any(s['properties']['title'] == sheet_name for s in sheets)

        if not sheet_exists:
            body = {'requests': [{'addSheet': {'properties': {'title': sheet_name}}}]}
            service.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body=body).execute()

        result = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id, range=f"'{sheet_name}'!A1:Z1").execute()
        
        existing_values = result.get('values', [[]])
        if not existing_values or not existing_values[0]:
            body = {'values': [headers]}
            service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id, range=f"'{sheet_name}'!A1",
                valueInputOption='RAW', body=body).execute()
    except Exception as err:
        print(f"Error in ensure_headers for {sheet_name}: {err}")
        raise err

def upsert_rows(service, spreadsheet_id, sheet_name, headers, data, id_column_index=0):
    if not data: return
    range_name = f"'{sheet_name}'!A:Z"
    result = service.spreadsheets().values().get(spreadsheetId=spreadsheet_id, range=range_name).execute()
    rows = result.get('values', [])
    if not rows: rows = [headers]
    id_map = {str(row[id_column_index]): i for i, row in enumerate(rows) if len(row) > id_column_index and i > 0}
    for new_row in data:
        new_id = str(new_row[id_column_index])
        if new_id in id_map: rows[id_map[new_id]] = new_row
        else: rows.append(new_row)
    body = {'values': rows}
    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id, range=f"'{sheet_name}'!A1",
        valueInputOption='USER_ENTERED', body=body).execute()

# --- API Routes ---

@app.route('/health', methods=['GET'])
def health():
    config = get_google_config()
    env_raw = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    b64_raw = os.environ.get('GOOGLE_SERVICE_ACCOUNT_B64')
    now = datetime.datetime.now(datetime.timezone.utc)
    
    diag = {
        "status": "ok",
        "version": "1.1.3-debug-plus",
        "server_time_utc": now.isoformat(),
        "database_exists": os.path.exists(DB_PATH),
        "credentials_found": config is not None,
    }
    
    if env_raw:
        diag["env_json"] = {"length": len(env_raw), "starts_with_brace": env_raw.strip().startswith('{')}
    if b64_raw:
        diag["env_b64"] = {"length": len(b64_raw)}
        
    if config:
        diag["client_info"] = {
            "email": config.get("client_email"),
            "project_id": config.get("project_id"),
            "private_key_id": config.get("private_key_id")[:8] + "..." if config.get("private_key_id") else None,
            "token_uri": config.get("token_uri")
        }
        
        key = config.get("private_key", "")
        diag["key_info"] = {
            "length": len(key),
            "has_actual_newlines": "\n" in key,
            "starts_with_header": key.startswith("-----BEGIN PRIVATE KEY-----"),
            "ends_with_footer": "-----END PRIVATE KEY-----" in key
        }
        
        # Test 1: RSA Signing (Local)
        try:
            from google.auth import crypt, jwt
            signer = crypt.RSASigner.from_service_account_info(config)
            jwt.encode(signer, {'test': 'data'})
            diag["rsa_signing_test"] = "passed"
        except Exception as sign_err:
            diag["rsa_signing_test"] = "failed"
            diag["rsa_signing_error"] = str(sign_err)
            
        # Test 2: Google Auth & Sheet Access
        try:
            from google.auth.transport.requests import Request
            creds = service_account.Credentials.from_service_account_info(config, scopes=SCOPES)
            creds.refresh(Request())
            diag["google_auth_test"] = "passed"
            
            # Sheet access test
            test_sheet_id = "148T7oXqEAjUcH3zyQy93x1H92LYSheEZh8ja7rpg_1o"
            service = build('sheets', 'v4', credentials=creds)
            service.spreadsheets().get(spreadsheetId=test_sheet_id).execute()
            diag["sheet_access_test"] = "passed"
        except Exception as auth_err:
            diag["google_auth_test"] = "failed"
            diag["google_auth_error"] = str(auth_err)
            
    return jsonify(diag)


@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username, password, full_name = data.get('username'), data.get('password'), data.get('full_name')
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"}), 400
    if create_user(username, password, full_name):
        return jsonify({"success": True, "message": "User registered successfully"})
    return jsonify({"success": False, "message": "Username already exists"}), 400

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = authenticate_user(data.get('username'), data.get('password'))
    if user: return jsonify({"success": True, "user": user, "token": API_KEY})
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route('/cron/keepalive', methods=['GET'])
def keepalive():
    return jsonify({"status": "alive", "timestamp": datetime.datetime.now().isoformat()})

@app.route('/sync', methods=['POST'])
def sync():
    if not check_auth(): return jsonify({"success": False, "message": "Unauthorized"}), 401
    data = request.json
    spreadsheet_id = data.get('spreadsheetId')
    customers, orders, items = data.get('customers', []), data.get('orders', []), data.get('items', [])
    mode = data.get('mode', 'upsert')
    if not spreadsheet_id: return jsonify({"success": False, "message": "Spreadsheet ID is required"}), 400
    
    try:
        service = get_sheets_service()
        customer_headers = ['ID', 'Shop Name', 'Address', 'Phone', 'City', 'Discount', 'Status', 'Last Updated']
        inventory_headers = ['ID', 'Display Name', 'Internal Name', 'SKU', 'Vehicle', 'Brand/Origin', 'Category', 'Unit Value', 'Stock Qty', 'Low Stock Threshold', 'Status', 'Last Updated']
        order_headers = ['Order ID', 'Customer ID', 'Rep ID', 'Date', 'Net Total', 'Status', 'Last Updated']
        line_headers = ['Line ID', 'Order ID', 'Item ID', 'Item Name', 'Qty', 'Unit Price', 'Line Total']
        
        ensure_headers(service, spreadsheet_id, 'Customers', customer_headers)
        ensure_headers(service, spreadsheet_id, 'Inventory', inventory_headers)
        ensure_headers(service, spreadsheet_id, 'Orders', order_headers)
        ensure_headers(service, spreadsheet_id, 'OrderLines', line_headers)
        
        if customers:
            values = [[c['customer_id'], c['shop_name'], c['address'], c['phone'], c['city_ref'], c['discount_rate'], c['status'], c['updated_at']] for c in customers]
            if mode == 'overwrite':
                service.spreadsheets().values().clear(spreadsheetId=spreadsheet_id, range="'Customers'!A2:Z").execute()
                service.spreadsheets().values().append(spreadsheetId=spreadsheet_id, range="'Customers'!A2", valueInputOption="USER_ENTERED", body={"values": values}).execute()
            else: upsert_rows(service, spreadsheet_id, 'Customers', customer_headers, values, 0)
            
        if items:
            values = [[i['item_id'], i['item_display_name'], i['item_name'], i['item_number'], i['vehicle_model'], i['source_brand'], i.get('category', 'Uncategorized'), i['unit_value'], i['current_stock_qty'], i.get('low_stock_threshold', 10), i['status'], i['updated_at']] for i in items]
            if mode == 'overwrite':
                service.spreadsheets().values().clear(spreadsheetId=spreadsheet_id, range="'Inventory'!A2:Z").execute()
                service.spreadsheets().values().append(spreadsheetId=spreadsheet_id, range="'Inventory'!A2", valueInputOption="USER_ENTERED", body={"values": values}).execute()
            else: upsert_rows(service, spreadsheet_id, 'Inventory', inventory_headers, values, 0)
            
        if orders:
            order_values = [[o['order_id'], o['customer_id'], o.get('rep_id', ''), o['order_date'], o['net_total'], o['order_status'], o['updated_at']] for o in orders]
            upsert_rows(service, spreadsheet_id, 'Orders', order_headers, order_values, 0)
            line_values = []
            for o in orders:
                for l in o.get('lines', []): line_values.append([l['line_id'], o['order_id'], l['item_id'], l['item_name'], l['quantity'], l['unit_value'], l['line_total']])
            if line_values: upsert_rows(service, spreadsheet_id, 'OrderLines', line_headers, line_values, 0)
            
        result = service.spreadsheets().values().get(spreadsheetId=spreadsheet_id, range="'Inventory'!A:Z").execute()
        rows = result.get('values', [])
        pulled_items = []
        if len(rows) > 1:
            for row in rows[1:]:
                if not row or not row[0]: continue
                while len(row) < 12: row.append('')
                try: unit_val = float(row[7]) if row[7] else 0
                except: unit_val = 0
                pulled_items.append({
                    "item_id": str(row[0]), "item_display_name": str(row[1]), "item_name": str(row[2] or row[1]),
                    "item_number": str(row[3]), "vehicle_model": str(row[4]), "source_brand": str(row[5] or 'Unknown'),
                    "category": str(row[6] or 'Uncategorized'), "unit_value": unit_val, "current_stock_qty": int(row[8]) if row[8] else 0,
                    "low_stock_threshold": int(row[9]) if row[9] else 10, "status": str(row[10] or 'active'),
                    "updated_at": str(row[11] or ''), "sync_status": 'synced'
                })
        return jsonify({"success": True, "pulledItems": pulled_items, "message": f"Sync completed successfully ({mode} mode)"})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
