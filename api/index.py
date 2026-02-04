import os
import sys
import json
import traceback
import datetime
import base64

# --- Vercel Compatibility Fix ---
# Add the 'api' directory to the path so we can import 'database.py'
CURRENT_DIR = os.path.dirname(__file__)
if CURRENT_DIR not in sys.path:
    sys.path.append(CURRENT_DIR)

from flask import Flask, request, jsonify
from flask_cors import CORS
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.transport.requests import Request

# Import from our local database.py
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
SERVICE_ACCOUNT_FILE = os.path.join(CURRENT_DIR, 'config', 'service-account.json')
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

# --- Helper Functions ---

def get_google_config():
    """Helper to get and normalize Google config from Env or File"""
    config = None
    source = "none"
    
    # 1. Try standard Environment Variable (Raw JSON)
    env_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    if env_json:
        try:
            cleaned = env_json.strip()
            while (cleaned.startswith("'") and cleaned.endswith("'")) or (cleaned.startswith('"') and cleaned.endswith('"')):
                cleaned = cleaned[1:-1].strip()
            config = json.loads(cleaned)
            source = "env_json"
        except Exception as e:
            print(f"ERROR: Environment JSON parsing failed: {e}")

    # 2. Try Base64 encoding (Fail-proof Vercel method)
    if not config:
        b64_data = os.environ.get('GOOGLE_SERVICE_ACCOUNT_B64')
        if b64_data:
            try:
                # Clean up potential whitespace
                b64_cleaned = "".join(b64_data.split())
                decoded = base64.b64decode(b64_cleaned).decode('utf-8')
                config = json.loads(decoded)
                source = "env_b64"
            except Exception as e:
                print(f"ERROR: Base64 decoding failed: {e}")

    # 3. Fallback to physical file
    if not config and os.path.exists(SERVICE_ACCOUNT_FILE):
        try:
            with open(SERVICE_ACCOUNT_FILE, 'r') as f:
                config = json.load(f)
                source = "file"
        except Exception as e:
            print(f"ERROR: File JSON parsing failed: {e}")
            
    # CRITICAL: Normalize private key for ALL loading methods
    if config and 'private_key' in config:
        key = config['private_key']
        if isinstance(key, str):
            if '\\n' in key:
                key = key.replace('\\n', '\n')
            key = key.strip()
            if key.startswith('"') and key.endswith('"'):
                key = key[1:-1].strip()
            if key.startswith("'") and key.endswith("'"):
                key = key[1:-1].strip()
            config['private_key'] = key
        
    return config, source

def get_sheets_service():
    """Returns an authorized Google Sheets service object"""
    config, _ = get_google_config()
    if not config:
        raise FileNotFoundError("Service account credentials not found in Environment or File.")
    
    try:
        required = ['client_email', 'private_key', 'token_uri']
        missing = [f for f in required if f not in config]
        if missing:
            raise ValueError(f"Missing required fields in service account JSON: {', '.join(missing)}")

        creds = service_account.Credentials.from_service_account_info(
            config, scopes=SCOPES)
        return build('sheets', 'v4', credentials=creds)
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
    except Exception as err:
        print(f"Error creating sheet {sheet_name}: {err}")
        pass

def upsert_rows(service, spreadsheet_id, sheet_name, headers, data, id_column_index=0):
    range_name = f"'{sheet_name}'!A:Z"
    result = service.spreadsheets().values().get(spreadsheetId=spreadsheet_id, range=range_name).execute()
    rows = result.get('values', [])
    
    if not rows: 
        rows = [headers]
    else:
        # ATOMIC MIGRATION: Check actual header content
        existing_headers = [str(h).strip() for h in rows[0]]
        
        # 1. Inventory Migration (Out of Stock)
        if sheet_name == 'Inventory' and 'Out of Stock' not in existing_headers:
            rows[0] = headers
            for i in range(1, len(rows)):
                if len(rows[i]) >= 11: rows[i].insert(10, 'FALSE')
                while len(rows[i]) < 13: rows[i].append('')
        
        # 2. Customers Migration (Discount 2)
        elif sheet_name == 'Customers' and 'Discount 2' not in existing_headers:
            rows[0] = headers
            for i in range(1, len(rows)):
                # If we have 8 or 9 columns, insert Discount 2 at index 6
                if len(rows[i]) >= 6: rows[i].insert(6, '0') 
                while len(rows[i]) < 10: rows[i].append('')
        
        # 3. Orders Migration (Disc 2 Value)
        elif sheet_name == 'Orders' and 'Disc 2 Value' not in existing_headers:
            rows[0] = headers
            for i in range(1, len(rows)):
                # Insert two columns at index 7 & 8 for Rate 2 and Val 2
                if len(rows[i]) >= 7:
                    rows[i].insert(7, '0')
                    rows[i].insert(8, '0')
                while len(rows[i]) < 16: rows[i].append('')
        
        # 4. Fallback Header Sync
        elif len(existing_headers) < len(headers):
            rows[0] = headers
            for i in range(1, len(rows)):
                while len(rows[i]) < len(headers): rows[i].append('')

    # Perform Upsert if data provided
    if data:
        id_map = {str(row[id_column_index]): i for i, row in enumerate(rows) if len(row) > id_column_index and i > 0}
        for new_row in data:
            new_id = str(new_row[id_column_index])
            if new_id in id_map: rows[id_map[new_id]] = new_row
            else: rows.append(new_row)
            
    # Write back the full corrected dataset
    body = {'values': rows}
    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id, range=f"'{sheet_name}'!A1",
        valueInputOption='USER_ENTERED', body=body).execute()

# --- API Routes ---

@app.route('/health', methods=['GET'])
def health():
    config, source = get_google_config()
    now = datetime.datetime.now(datetime.timezone.utc)
    
    diag = {
        "status": "ok",
        "version": "1.1.7-final-stable",
        "server_time_utc": now.isoformat(),
        "database_exists": os.path.exists(DB_PATH),
        "credentials_source": source,
    }
    
    if config:
        diag["client_email"] = config.get("client_email")
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
            creds_test = service_account.Credentials.from_service_account_info(config, scopes=SCOPES)
            creds_test.refresh(Request())
            diag["google_auth_test"] = "passed"
            
            # Specific Sheet Access Test
            test_sheet_id = "148T7oXqEAjUcH3zyQy93x1H92LYSheEZh8ja7rpg_1o"
            service = build('sheets', 'v4', credentials=creds_test)
            service.spreadsheets().get(spreadsheetId=test_sheet_id).execute()
            diag["sheet_access_test"] = "passed"
        except Exception as auth_err:
            diag["google_auth_test"] = "failed"
            diag["google_auth_error"] = str(auth_err)
            diag["sheet_access_test"] = "skipped (auth failed)"
            
    return jsonify(diag)

@app.route('/debug-env', methods=['GET'])
def debug_env():
    json_raw = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    b64_raw = os.environ.get('GOOGLE_SERVICE_ACCOUNT_B64')
    return jsonify({
        "JSON_VAR": {"exists": json_raw is not None, "length": len(json_raw) if json_raw else 0},
        "B64_VAR": {"exists": b64_raw is not None, "length": len(b64_raw) if b64_raw else 0}
    })

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
        customer_headers = ['ID', 'Shop Name', 'Address', 'Phone', 'City', 'Discount 1', 'Discount 2', 'Balance', 'Status', 'Last Updated']
        inventory_headers = ['ID', 'Display Name', 'Internal Name', 'SKU', 'Vehicle', 'Brand/Origin', 'Category', 'Unit Value', 'Stock Qty', 'Low Stock Threshold', 'Out of Stock', 'Status', 'Last Updated']
        order_headers = ['Order ID', 'Customer ID', 'Rep ID', 'Date', 'Gross Total', 'Disc 1 Rate', 'Disc 1 Value', 'Disc 2 Rate', 'Disc 2 Value', 'Net Total', 'Paid', 'Balance Due', 'Payment Status', 'Delivery Status', 'Status', 'Last Updated']
        line_headers = ['Line ID', 'Order ID', 'Item ID', 'Item Name', 'Qty', 'Unit Price', 'Line Total']

        ensure_headers(service, spreadsheet_id, 'Customers', customer_headers)
        ensure_headers(service, spreadsheet_id, 'Inventory', inventory_headers)
        ensure_headers(service, spreadsheet_id, 'Orders', order_headers)
        ensure_headers(service, spreadsheet_id, 'OrderLines', line_headers)
        if customers:
            values = [[c['customer_id'], c['shop_name'], c['address'], c['phone'], c['city_ref'], c['discount_rate'], c.get('secondary_discount_rate', 0), c.get('outstanding_balance', 0), c['status'], c['updated_at']] for c in customers]
            if mode == 'overwrite':
                service.spreadsheets().values().clear(spreadsheetId=spreadsheet_id, range="'Customers'!A2:Z").execute()
                service.spreadsheets().values().append(spreadsheetId=spreadsheet_id, range="'Customers'!A2", valueInputOption="USER_ENTERED", body={"values": values}).execute()
            else: upsert_rows(service, spreadsheet_id, 'Customers', customer_headers, values, 0)
        else:
            upsert_rows(service, spreadsheet_id, 'Customers', customer_headers, [], 0)

        if items:
            values = [[i['item_id'], i['item_display_name'], i['item_name'], i['item_number'], i['vehicle_model'], i['source_brand'], i.get('category', 'Uncategorized'), i['unit_value'], i['current_stock_qty'], i.get('low_stock_threshold', 10), i.get('is_out_of_stock', False), i['status'], i['updated_at']] for i in items]
            if mode == 'overwrite':
                service.spreadsheets().values().clear(spreadsheetId=spreadsheet_id, range="'Inventory'!A2:Z").execute()
                service.spreadsheets().values().append(spreadsheetId=spreadsheet_id, range="'Inventory'!A2", valueInputOption="USER_ENTERED", body={"values": values}).execute()
            else: upsert_rows(service, spreadsheet_id, 'Inventory', inventory_headers, values, 0)
        else:
            upsert_rows(service, spreadsheet_id, 'Inventory', inventory_headers, [], 0)

        if orders:
            order_values = [[o['order_id'], o['customer_id'], o.get('rep_id', ''), o['order_date'], o.get('gross_total', 0), o.get('discount_rate', 0), o.get('discount_value', 0), o.get('secondary_discount_rate', 0), o.get('secondary_discount_value', 0), o['net_total'], o.get('paid_amount', 0), o.get('balance_due', 0), o.get('payment_status', 'unpaid'), o.get('delivery_status', 'pending'), o['order_status'], o['updated_at']] for o in orders]
            upsert_rows(service, spreadsheet_id, 'Orders', order_headers, order_values, 0)
            
            line_values = []
            for o in orders:
                for l in o.get('lines', []): line_values.append([l['line_id'], o['order_id'], l['item_id'], l['item_name'], l['quantity'], l['unit_value'], l['line_total']])
            if line_values: upsert_rows(service, spreadsheet_id, 'OrderLines', line_headers, line_values, 0)
        else:
            upsert_rows(service, spreadsheet_id, 'Orders', order_headers, [], 0)
        # --- PULL ALL DATA ---
        
        # 1. Pull Inventory
        result = service.spreadsheets().values().get(spreadsheetId=spreadsheet_id, range="'Inventory'!A:Z").execute()
        pulled_items = []
        rows = result.get('values', [])
        if len(rows) > 1:
            for row in rows[1:]:
                if not row or not row[0]: continue
                while len(row) < 13: row.append('')
                try: unit_val = float(row[7]) if row[7] else 0
                except: unit_val = 0
                pulled_items.append({
                    "item_id": str(row[0]), "item_display_name": str(row[1]), "item_name": str(row[2] or row[1]),
                    "item_number": str(row[3]), "vehicle_model": str(row[4]), "source_brand": str(row[5] or 'Unknown'),
                    "category": str(row[6] or 'Uncategorized'), "unit_value": unit_val, "current_stock_qty": int(row[8]) if row[8] else 0,
                    "low_stock_threshold": int(row[9]) if row[9] else 10, "is_out_of_stock": str(row[10]).lower() == 'true',
                    "status": str(row[11] or 'active'), "updated_at": str(row[12] or ''), "sync_status": 'synced'
                })

        # 2. Pull Customers
        result = service.spreadsheets().values().get(spreadsheetId=spreadsheet_id, range="'Customers'!A:Z").execute()
        pulled_customers = []
        rows = result.get('values', [])
        if len(rows) > 1:
            for row in rows[1:]:
                if not row or not row[0]: continue
                while len(row) < 10: row.append('')
                try: disc1 = float(row[5]) if row[5] else 0
                except: disc1 = 0
                try: disc2 = float(row[6]) if row[6] else 0
                except: disc2 = 0
                try: bal = float(row[7]) if row[7] else 0
                except: bal = 0
                pulled_customers.append({
                    "customer_id": str(row[0]), "shop_name": str(row[1]), "address": str(row[2]),
                    "phone": str(row[3]), "city_ref": str(row[4]), 
                    "discount_rate": disc1, "secondary_discount_rate": disc2,
                    "outstanding_balance": bal, "status": str(row[8] or 'active'),
                    "updated_at": str(row[9] or ''), "sync_status": 'synced'
                })

        # 3. Pull Orders & Lines
        result_orders = service.spreadsheets().values().get(spreadsheetId=spreadsheet_id, range="'Orders'!A:Z").execute()
        result_lines = service.spreadsheets().values().get(spreadsheetId=spreadsheet_id, range="'OrderLines'!A:Z").execute()
        
        pulled_orders = []
        order_rows = result_orders.get('values', [])
        line_rows = result_lines.get('values', [])
        
        # Map lines to orders
        lines_by_order = {}
        if len(line_rows) > 1:
            for row in line_rows[1:]:
                if len(row) < 7: continue
                oid = str(row[1])
                line = {
                    "line_id": str(row[0]), "order_id": oid, "item_id": str(row[2]),
                    "item_name": str(row[3]), "quantity": int(row[4]) if row[4] else 0,
                    "unit_value": float(row[5]) if row[5] else 0, "line_total": float(row[6]) if row[6] else 0
                }
                if oid not in lines_by_order: lines_by_order[oid] = []
                lines_by_order[oid].append(line)

        if len(order_rows) > 1:
            for row in order_rows[1:]:
                if not row or not row[0]: continue
                while len(row) < 16: row.append('')
                oid = str(row[0])
                pulled_orders.append({
                    "order_id": oid, "customer_id": str(row[1]), "rep_id": str(row[2]),
                    "order_date": str(row[3]), 
                    "gross_total": float(row[4]) if row[4] else 0,
                    "discount_rate": float(row[5]) if row[5] else 0,
                    "discount_value": float(row[6]) if row[6] else 0,
                    "secondary_discount_rate": float(row[7]) if row[7] else 0,
                    "secondary_discount_value": float(row[8]) if row[8] else 0,
                    "net_total": float(row[9]) if row[9] else 0,
                    "paid_amount": float(row[10]) if row[10] else 0, 
                    "balance_due": float(row[11]) if row[11] else 0,
                    "payment_status": str(row[12] or 'unpaid'), 
                    "delivery_status": str(row[13] or 'pending'),
                    "order_status": str(row[14] or 'confirmed'), 
                    "updated_at": str(row[15] or ''),
                    "lines": lines_by_order.get(oid, []), "sync_status": 'synced'
                })

        return jsonify({
            "success": True, 
            "pulledItems": pulled_items,
            "pulledCustomers": pulled_customers,
            "pulledOrders": pulled_orders,
            "message": f"Sync completed successfully ({mode} mode)"
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
