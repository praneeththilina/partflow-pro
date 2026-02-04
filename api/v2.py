from flask import Flask, jsonify
from flask_cors import CORS
import os
import datetime

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "version": "2.0.0-forced-new-file",
        "server_time": datetime.datetime.now().isoformat(),
        "info": "If you see this, the new file system is working"
    })

@app.route('/sync', methods=['POST'])
def sync():
    return jsonify({"success": False, "message": "Backend is migrating, please try again in 1 minute"}), 503

if __name__ == '__main__':
    app.run(port=5000, debug=True)
