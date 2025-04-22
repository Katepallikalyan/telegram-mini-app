import os
import logging

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix

# Configure logging - use WARNING level for production to reduce noise
is_vercel = os.environ.get('VERCEL') == 'true'
if is_vercel:
    logging.basicConfig(level=logging.WARNING)
else:
    logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "telegram-mini-app-secret")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Always use in-memory SQLite for Vercel to avoid file system issues
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize the app with the extension
db.init_app(app)

# Create all database tables
with app.app_context():
    # Import models for table creation
    import models
    db.create_all()

# Import routes after app is created to avoid circular imports
from routes import *

# Initialize data
with app.app_context():
    from routes import initialize_data
    try:
        initialize_data()
    except Exception as e:
        logging.warning(f"Data initialization error: {str(e)}")
        # Continue even if data initialization fails in Vercel
        pass
