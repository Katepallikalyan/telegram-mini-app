from app import app

# This is needed for Vercel deployment
# The Vercel serverless function will use this app object
app.debug = False

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
