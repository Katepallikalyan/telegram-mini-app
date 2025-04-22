from app import app

# This is needed for Vercel deployment
# Keep debug off in production
app.debug = False

# Vercel uses the app object directly
# The following code is only for local development
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
