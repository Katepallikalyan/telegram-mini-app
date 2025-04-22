import os
import logging

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix

# Configure logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "telegram-mini-app-secret")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure the database - use in-memory SQLite for Vercel
# For local development, it will use a file-based SQLite
is_vercel = os.environ.get('VERCEL', False)
if is_vercel:
    # Use in-memory SQLite for Vercel
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
else:
    # Use file-based SQLite for local development
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///learn_earn.db")

app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize the app with the extension
db.init_app(app)

with app.app_context():
    # Import models for table creation
    import models
    db.create_all()

# Import routes after app is created to avoid circular imports
from routes import *

# Initialize data
with app.app_context():
    from routes import initialize_data
    initialize_data()
