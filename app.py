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

# Configure database based on environment
if os.environ.get('DATABASE_URL'):
    # Use PostgreSQL if available (Replit provides this)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
elif is_vercel:
    # For Vercel, use SQLite memory
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    logging.warning("Using in-memory SQLite database for Vercel")
else:
    # Local development fallback
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///learn_earn.db"

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize the app with the extension
db.init_app(app)

# Simplified initialization that's less likely to cause issues in serverless
def init_db():
    with app.app_context():
        # Import models for table creation
        import models
        db.create_all()
        
        # Initialize data safely
        try:
            from routes import initialize_data
            initialize_data()
        except Exception as e:
            logging.warning(f"Data initialization error: {str(e)}")
            # Continue even if data initialization fails
            pass

# Only initialize for local or first-time setup, not on every serverless invocation
if not is_vercel:
    init_db()
else:
    # For Vercel, do this only once at the module level, not on every request
    try:
        init_db()
    except Exception as e:
        logging.warning(f"Vercel DB initialization error: {str(e)}")
        pass

# Import routes after app is created to avoid circular imports
from routes import *
