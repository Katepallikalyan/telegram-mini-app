import os
from app import app

# This is needed for Vercel deployment
# Keep debug off in production
app.debug = False

# Add more robust error handling for Vercel
@app.errorhandler(500)
def server_error(e):
    return """
    <html>
    <head><title>Telegram Mini App</title></head>
    <body>
        <h1>Learn & Earn Telegram Mini App</h1>
        <p>Something went wrong, please try again later or contact support.</p>
    </body>
    </html>
    """, 500

# Handle missing routes
@app.errorhandler(404)
def not_found(e):
    return """
    <html>
    <head><title>Telegram Mini App</title></head>
    <body>
        <h1>Learn & Earn Telegram Mini App</h1>
        <p>The page you're looking for doesn't exist. Please return to the main app.</p>
    </body>
    </html>
    """, 404

# Vercel uses the app object directly
# The following code is only for local development
if __name__ == "__main__":
    # Use debug mode for local development only
    is_vercel = os.environ.get('VERCEL') == 'true'
    debug_mode = not is_vercel
    app.run(host="0.0.0.0", port=5000, debug=debug_mode)
