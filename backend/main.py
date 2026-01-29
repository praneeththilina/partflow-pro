import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from database import init_db, create_user, authenticate_user

app = Flask(__name__)
CORS(app)

# Initialize Database
init_db()

# SECURITY: Basic API Key for internal bridge
API_KEY = "partflow_secret_token_2026"

def check_auth():
    auth_header = request.headers.get('X-API-KEY')
    if auth_header != API_KEY:
        return False
    return True

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    full_name = data.get('full_name')
    
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"}), 400
        
    success = create_user(username, password, full_name)
    if success:
        return jsonify({"success": True, "message": "User registered successfully"})
    else:
        return jsonify({"success": False, "message": "Username already exists"}), 400

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    user = authenticate_user(username, password)
    if user:
        return jsonify({
            "success": True, 
            "user": user,
            "token": API_KEY # For now we use the same key, can be expanded to JWT
        })
    else:
        return jsonify({"success": False, "message": "Invalid credentials"}), 401

# Path to the JSON key
SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), 'config', 'service-account.json')
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

def get_sheets_service():
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        print(f"CRITICAL: Service account file missing at {SERVICE_ACCOUNT_FILE}")
        raise FileNotFoundError(f"Service account file not found at {SERVICE_ACCOUNT_FILE}")
    
    try:
        # Debugging key format
        with open(SERVICE_ACCOUNT_FILE, 'r') as f:
            config = json.load(f)
            key_len = len(config.get('private_key', ''))
            print(f"Service Account loaded. Email: {config.get('client_email')}. Key length: {key_len}")
            if key_len < 100:
                print("WARNING: Private key seems too short or missing!")

        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES)
        return build('sheets', 'v4', credentials=creds)
    except Exception as e:
        print(f"AUTHENTICATION ERROR: {e}")
        raise e

def ensure_headers(service, spreadsheet_id, sheet_name, headers):
    try:
        # Check if sheet exists
        spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        sheets = spreadsheet.get('sheets', [])
        sheet_exists = any(s['properties']['title'] == sheet_name for s in sheets)

        if not sheet_exists:
            body = {
                'requests': [{
                    'addSheet': {
                        'properties': {'title': sheet_name}
                    }
                }]
            }
            service.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body=body).execute()

        # Get existing headers
        result = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id, range=f"'{sheet_name}'!A1:Z1").execute()
        
        existing_values = result.get('values', [[]])
        existing_headers = existing_values[0] if existing_values else []

        if not existing_headers:
            body = {'values': [headers]}
            service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"'{sheet_name}'!A1",
                valueInputOption='RAW',
                body=body
            ).execute()
    except HttpError as err:
        print(f"Error in ensure_headers for {sheet_name}: {err}")
        raise err

def upsert_rows(service, spreadsheet_id, sheet_name, headers, data, id_column_index=0):
    """
    Fetches the sheet, merges data based on an ID column, and writes back.
    This prevents duplicates and handles updates.
    """
    if not data:
        return
    
    range_name = f"'{sheet_name}'!A:Z"
    result = service.spreadsheets().values().get(spreadsheetId=spreadsheet_id, range=range_name).execute()
    rows = result.get('values', [])
    
    if not rows:
        rows = [headers]
    else:
        # Ensure headers match or at least exist
        if not rows[0]:
            rows[0] = headers
            
    # Create a lookup of ID -> row index
    id_map = {}
    for i, row in enumerate(rows):
        if i == 0: continue # Skip header
        if len(row) > id_column_index:
            id_map[str(row[id_column_index])] = i
            
    # Merge new data
    for new_row in data:
        new_id = str(new_row[id_column_index])
        if new_id in id_map:
            index = id_map[new_id]
            # Update existing row (keeping existing columns if new_row is shorter, but here we usually send full)
            rows[index] = new_row
        else:
            rows.append(new_row)
            
    # Write back the entire merged set
    body = {'values': rows}
    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range=f"'{sheet_name}'!A1",
        valueInputOption='USER_ENTERED',
        body=body
    ).execute()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/cron/keepalive', methods=['GET'])
def keepalive():
    """Route for external cron jobs to prevent PythonAnywhere sleep."""
    import datetime
    return jsonify({
        "status": "alive",
        "timestamp": datetime.datetime.now().isoformat(),
        "message": "PartFlow Pro backend is active"
    })

@app.route('/sync', methods=['POST'])
def sync():
    if not check_auth():
        return jsonify({"success": False, "message": "Unauthorized"}), 401
        
    data = request.json
    spreadsheet_id = data.get('spreadsheetId')
    customers = data.get('customers', [])
    orders = data.get('orders', [])
    items = data.get('items', [])
    mode = data.get('mode', 'upsert') # 'upsert' or 'overwrite'

    if not spreadsheet_id:
        return jsonify({"success": False, "message": "Spreadsheet ID is required"}), 400

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

        # 2. Push Customers
        if customers:
            values = [[c['customer_id'], c['shop_name'], c['address'], c['phone'], c['city_ref'], c['discount_rate'], c['status'], c['updated_at']] for c in customers]
            if mode == 'overwrite':
                # Clear and write
                service.spreadsheets().values().clear(spreadsheetId=spreadsheet_id, range="'Customers'!A2:Z").execute()
                service.spreadsheets().values().append(
                    spreadsheetId=spreadsheet_id, range="'Customers'!A2",
                    valueInputOption="USER_ENTERED", body={"values": values}
                ).execute()
            else:
                upsert_rows(service, spreadsheet_id, 'Customers', customer_headers, values, 0)

        # 3. Push Items
        if items:
            values = [[i['item_id'], i['item_display_name'], i['item_name'], i['item_number'], i['vehicle_model'], i['source_brand'], i.get('category', 'Uncategorized'), i['unit_value'], i['current_stock_qty'], i.get('low_stock_threshold', 10), i['status'], i['updated_at']] for i in items]
            if mode == 'overwrite':
                service.spreadsheets().values().clear(spreadsheetId=spreadsheet_id, range="'Inventory'!A2:Z").execute()
                service.spreadsheets().values().append(
                    spreadsheetId=spreadsheet_id, range="'Inventory'!A2",
                    valueInputOption="USER_ENTERED", body={"values": values}
                ).execute()
            else:
                upsert_rows(service, spreadsheet_id, 'Inventory', inventory_headers, values, 0)

        # 4. Push Orders (Always append for history, or upsert by Order ID)
        if orders:
            order_values = [[o['order_id'], o['customer_id'], o.get('rep_id', ''), o['order_date'], o['net_total'], o['order_status'], o['updated_at']] for o in orders]
            upsert_rows(service, spreadsheet_id, 'Orders', order_headers, order_values, 0)

            line_values = []
            for o in orders:
                for l in o.get('lines', []):
                    line_values.append([l['line_id'], o['order_id'], l['item_id'], l['item_name'], l['quantity'], l['unit_value'], l['line_total']])
            
            if line_values:
                upsert_rows(service, spreadsheet_id, 'OrderLines', line_headers, line_values, 0)

        # 5. Pull Inventory (Always pull the latest state)
        result = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id, range="'Inventory'!A:Z").execute()
        
        pulled_items = []
        rows = result.get('values', [])
        if len(rows) > 1:
            for row in rows[1:]:
                if not row or not row[0]: continue
                while len(row) < 12: row.append('')
                
                try: unit_val = float(row[7]) if row[7] else 0
                except: unit_val = 0
                try: stock_qty = int(row[8]) if row[8] else 0
                except: stock_qty = 0
                try: threshold = int(row[9]) if row[9] else 10
                except: threshold = 10

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
                    "low_stock_threshold": threshold,
                    "status": str(row[10] or 'active'),
                    "updated_at": str(row[11] or ''),
                    "sync_status": 'synced'
                })

        return jsonify({
            "success": True,
            "pulledItems": pulled_items,
            "message": f"Sync completed successfully ({mode} mode)"
        })

    except Exception as e:
        print(f"Sync Error: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
