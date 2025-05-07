from flask import Flask, request, jsonify, render_template, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import os
import string
import random
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///urls.db'
app.config['SECRET_KEY'] = 'your-secret-key'
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# ... existing code ...

@app.route('/track/<short_code>', methods=['POST'])
def track_visit(short_code):
    url = Url.query.filter_by(short_code=short_code).first()
    if url:
        url.today_visits += 1
        url.total_visits += 1
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False}), 404

# ... existing code ... 