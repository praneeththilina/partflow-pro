import os
import json
import base64
import traceback
import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from database import init_db, create_user, authenticate_user

app = Flask(__name__)
CORS(app)

# Initialize Database (Warning: Data in /tmp is temporary on Vercel)
init_db()

# SECURITY: Basic API Key for internal bridge
API_KEY = "partflow_secret_token_2026"

def check_auth():
    auth_header = request.headers.get('X-API-KEY')
    if auth_header != API_KEY:
        return False
    return True

# Path to the JSON key (Fallback for local dev)
SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), 'config', 'service-account.json')
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

def get_sheets_service():
    creds = None
    
    # 1. Try to load from Base64 Environment Variable (Vercel Production Method)
    # You must set 'GOOGLE_CREDENTIALS_BASE64' in Vercel with the content of sa.b64
    b64_env = os.environ.get('GOOGLE_CREDENTIALS_BASE64')
    
    if b64_env:
        try:
            print("INFO: Loading credentials from Base64 Environment Variable...")
            # Decode Base64 to UTF-8 JSON string
            creds_json_str = base64.b64decode(b64_env).decode('utf-8')
            config = json.loads(creds_json_str)
            
            creds = service_account.Credentials.from_service_account_info(
                config, scopes=SCOPES)
                
        except Exception as e:
            print(f"CRITICAL: Failed to decode Base64 credentials: {e}")
            traceback.print_exc()

    # 2. Fallback to physical file (Local Dev Method)
    if not creds:
        if os.path.exists(SERVICE_ACCOUNT_FILE):
            print("INFO: Loading credentials from local file...")
            creds = service_account.Credentials.from_service_account_file(
                SERVICE_ACCOUNT_FILE, scopes=SCOPES)
        else:
            # Last ditch: Try the old raw JSON env var (Not recommended, but legacy support)
            raw_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON')
            if raw_json:
                try:
                    config = json.loads(raw_json)
                    creds = service_account.Credentials.from_service_account_info(
                        config, scopes=SCOPES)
                except:
                    pass

    if not creds:
        raise FileNotFoundError("Could not find valid credentials in ENV (Base64) or File.")

    return build('sheets', 'v4', credentials=creds)

def ensure_headers(service, spreadsheet_id, sheet_name, headers):
    try:
        # Check if sheet exists
        spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        sheets = spreadsheet.get('sheets', [])
        sheet_exists = any(s['properties']['title'] == sheet_name for s in sheets)

        # Create sheet if missing
        if not sheet_exists:
            body = {'requests': [{'addSheet': {'properties': {'title': sheet_name}}}]}
            service.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body=body).execute()

        # Check headers
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
        # Don't raise here, allow partial sync to proceed if one sheet fails
        pass

def upsert_rows(service, spreadsheet_id, sheet_name, headers, data, id_column_index=0):
    if not data: return
    
    # 1. Fetch existing data
    range_name = f"'{sheet_name}'!A:Z"
    result = service.spreadsheets().values().get(spreadsheetId=spreadsheet_id, range=range_name).execute()
    rows = result.get('values', [])
    
    if not rows: 
        rows = [headers]
    else:
        # Robust Migration: Check if 'Out of Stock' exists in header
        existing_headers = [str(h).strip() for h in rows[0]]
        if sheet_name == 'Inventory' and 'Out of Stock' not in existing_headers:
            print(f"CRITICAL: Migrating Inventory Sheet - Adding 'Out of Stock' column")
            # We want 'Out of Stock' at index 10 (Column K)
            # Old format: ...[9]=Threshold, [10]=Status, [11]=Updated
            rows[0] = headers # Update to 13-column headers
            for i in range(1, len(rows)):
                # If row is at least 11 columns long, insert at 10 to shift Status/Updated
                if len(rows[i]) >= 11:
                    rows[i].insert(10, 'FALSE')
                # Pad to full 13 columns
                while len(rows[i]) < 13:
                    rows[i].append('')
        
        # General padding for any other sheet
        elif len(rows[0]) < len(headers):
            rows[0] = headers
            for i in range(1, len(rows)):
                while len(rows[i]) < len(headers):
                    rows[i].append('')
    
    # 2. Build ID map (ID -> Row Index)
    id_map = {str(row[id_column_index]): i for i, row in enumerate(rows) if i > 0 and len(row) > id_column_index}
            
    # 3. Update or Append
    for new_row in data:
        new_id = str(new_row[id_column_index])
        if new_id in id_map:
            rows[id_map[new_id]] = new_row
        else:
            rows.append(new_row)
            
    # 4. Write back
    body = {'values': rows}
    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id, range=f"'{sheet_name}'!A1",
        valueInputOption='USER_ENTERED', body=body).execute()

@app.route('/health', methods=['GET'])
def health():
    # Diagnostic endpoint
    is_base64 = os.environ.get('GOOGLE_CREDENTIALS_BASE64') is not None
    return jsonify({
        "status": "ok",
        "version": "1.1.0-base64-fix",
        "server_time": datetime.datetime.now().isoformat(),
        "database_path": "/tmp/partflow.db" if os.environ.get('VERCEL') else "local",
        "auth_method": "Base64 Env" if is_base64 else "File/Legacy",
        "vercel_env": bool(os.environ.get('VERCEL'))
    })

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    full_name = data.get('full_name')
    
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"}), 400
        
    if create_user(username, password, full_name):
        return jsonify({"success": True, "message": "User registered successfully"})
    return jsonify({"success": False, "message": "Username already exists"}), 400

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = authenticate_user(data.get('username'), data.get('password'))
    if user:
        return jsonify({"success": True, "user": user, "token": API_KEY})
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route('/sync', methods=['POST'])
def sync():
    if not check_auth(): return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    data = request.json
    spreadsheet_id = data.get('spreadsheetId')
    customers = data.get('customers', [])
    orders = data.get('orders', [])
    items = data.get('items', [])
    mode = data.get('mode', 'upsert')

    if not spreadsheet_id: return jsonify({"success": False, "message": "Spreadsheet ID is required"}), 400

    try:
        service = get_sheets_service()
        
        # Define Header Schemas
        customer_headers = ['ID', 'Shop Name', 'Address', 'Phone', 'City', 'Discount', 'Status', 'Last Updated']
        inventory_headers = ['ID', 'Display Name', 'Internal Name', 'SKU', 'Vehicle', 'Brand/Origin', 'Category', 'Unit Value', 'Stock Qty', 'Low Stock Threshold', 'Out of Stock', 'Status', 'Last Updated']
        order_headers = ['Order ID', 'Customer ID', 'Rep ID', 'Date', 'Net Total', 'Paid', 'Balance Due', 'Payment Status', 'Delivery Status', 'Status', 'Last Updated']
        line_headers = ['Line ID', 'Order ID', 'Item ID', 'Item Name', 'Qty', 'Unit Price', 'Line Total']

        # Ensure Sheets Exist
        ensure_headers(service, spreadsheet_id, 'Customers', customer_headers)
        ensure_headers(service, spreadsheet_id, 'Inventory', inventory_headers)
        ensure_headers(service, spreadsheet_id, 'Orders', order_headers)
        ensure_headers(service, spreadsheet_id, 'OrderLines', line_headers)

        # --- Process Customers ---
        if customers:
            values = [[c['customer_id'], c['shop_name'], c['address'], c['phone'], c['city_ref'], c['discount_rate'], c['status'], c['updated_at']] for c in customers]
            if mode == 'overwrite':
                service.spreadsheets().values().clear(spreadsheetId=spreadsheet_id, range="'Customers'!A2:Z").execute()
                service.spreadsheets().values().append(spreadsheetId=spreadsheet_id, range="'Customers'!A2", valueInputOption="USER_ENTERED", body={"values": values}).execute()
            else:
                upsert_rows(service, spreadsheet_id, 'Customers', customer_headers, values, 0)

        # --- Process Inventory ---
        if items:
            values = [[i['item_id'], i['item_display_name'], i['item_name'], i['item_number'], i['vehicle_model'], i['source_brand'], i.get('category', 'Uncategorized'), i['unit_value'], i['current_stock_qty'], i.get('low_stock_threshold', 10), i.get('is_out_of_stock', False), i['status'], i['updated_at']] for i in items]
            if mode == 'overwrite':
                service.spreadsheets().values().clear(spreadsheetId=spreadsheet_id, range="'Inventory'!A2:Z").execute()
                service.spreadsheets().values().append(spreadsheetId=spreadsheet_id, range="'Inventory'!A2", valueInputOption="USER_ENTERED", body={"values": values}).execute()
            else:
                upsert_rows(service, spreadsheet_id, 'Inventory', inventory_headers, values, 0)

        # --- Process Orders ---
        if orders:
            order_values = [[o['order_id'], o['customer_id'], o.get('rep_id', ''), o['order_date'], o['net_total'], o.get('paid_amount', 0), o.get('balance_due', 0), o.get('payment_status', 'unpaid'), o.get('delivery_status', 'pending'), o['order_status'], o['updated_at']] for o in orders]
            upsert_rows(service, spreadsheet_id, 'Orders', order_headers, order_values, 0)
            
            line_values = []
            for o in orders:
                for l in o.get('lines', []):
                    line_values.append([l['line_id'], o['order_id'], l['item_id'], l['item_name'], l['quantity'], l['unit_value'], l['line_total']])
            if line_values:
                upsert_rows(service, spreadsheet_id, 'OrderLines', line_headers, line_values, 0)

        # --- Pull Updated Inventory ---
        result = service.spreadsheets().values().get(spreadsheetId=spreadsheet_id, range="'Inventory'!A:Z").execute()
        pulled_items = []
        rows = result.get('values', [])
        
        if len(rows) > 1:
            for row in rows[1:]:
                # Basic validation
                if not row or not row[0]: continue
                
                # Pad row to ensure 13 columns
                while len(row) < 13: row.append('')
                
                try: unit_val = float(row[7]) if row[7] else 0
                except: unit_val = 0
                try: stock_qty = int(row[8]) if row[8] else 0
                except: stock_qty = 0
                
                pulled_items.append({
                    "item_id": str(row[0]), 
                    "item_display_name": str(row[1]), 
                    "item_name": str(row[2] or row[1]),
                    "item_number": str(row[3]), 
                    "vehicle_model": str(row[4]), 
                    "source_brand": str(row[5] or 'Unknown'),
                    "category": str(row[6] or 'Uncategorized'), 
                    "unit_value": unit_val, 
                    "current_stock_qty": stock_qty,
                    "low_stock_threshold": int(row[9]) if row[9] else 10, 
                    "is_out_of_stock": str(row[10]).lower() == 'true',
                    "status": str(row[11] or 'active'),
                    "updated_at": str(row[12] or ''), 
                    "sync_status": 'synced'
                })

        return jsonify({
            "success": True, 
            "pulledItems": pulled_items, 
            "message": f"Sync completed successfully ({mode} mode)"
        })
        
    except Exception as e:
        print("SYNC ERROR:")
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
