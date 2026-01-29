import os
import json
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

# Initialize Database
init_db()

# SECURITY: Basic API Key for internal bridge
API_KEY = "partflow_secret_token_2026"

def check_auth():
    auth_header = request.headers.get('X-API-KEY')
    if auth_header != API_KEY:
        return False
    return True

# Path to the JSON key
SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), 'config', 'service-account.json')
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

def get_sheets_service():
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        print(f"CRITICAL: Service account file missing at {SERVICE_ACCOUNT_FILE}")
        raise FileNotFoundError(f"Service account file not found at {SERVICE_ACCOUNT_FILE}")
    
    try:
        # 1. Try simple file loading first (most standard)
        try:
            creds = service_account.Credentials.from_service_account_file(
                SERVICE_ACCOUNT_FILE, scopes=SCOPES)
            return build('sheets', 'v4', credentials=creds)
        except Exception as file_error:
            print(f"Standard file load failed: {file_error}. Trying manual normalization...")
            
            # 2. Manual normalization fallback (for copy-paste issues)
            with open(SERVICE_ACCOUNT_FILE, 'r') as f:
                config = json.load(f)
            
            if 'private_key' in config:
                key = config['private_key']
                # Replace literal escaped newlines
                if '\\n' in key:
                    key = key.replace('\\n', '\n')
                # Remove accidental extra quotes
                key = key.strip().strip('"').strip("'")
                config['private_key'] = key
                
            creds = service_account.Credentials.from_service_account_info(
                config, scopes=SCOPES)
            return build('sheets', 'v4', credentials=creds)
            
    except Exception as e:
        print("AUTHENTICATION ERROR TRACEBACK:")
        traceback.print_exc()
        raise e

@app.route('/health', methods=['GET'])
def health():
    # Basic diagnostic info for the user
    diag = {
        "status": "ok",
        "server_time": datetime.datetime.now().isoformat(),
        "database": os.path.exists(os.path.join(os.path.dirname(__file__), 'partflow.db')),
        "credentials_file": os.path.exists(SERVICE_ACCOUNT_FILE)
    }
    
    if diag["credentials_file"]:
        try:
            with open(SERVICE_ACCOUNT_FILE, 'r') as f:
                config = json.load(f)
                diag["client_email"] = config.get("client_email")
                diag["project_id"] = config.get("project_id")
                
                key = config.get("private_key", "")
                diag["key_length"] = len(key)
                diag["key_has_newlines"] = "\n" in key
                diag["key_has_escaped_newlines"] = "\\n" in key
                diag["key_starts_with_header"] = key.startswith("-----BEGIN")
                diag["key_ends_with_footer"] = "-----END" in key
        except Exception as e:
            diag["credentials_error"] = str(e)
            
    return jsonify(diag)


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
