#!/bin/bash

# Deploy script for Railway
echo "🚀 Starting deployment to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway (if not already logged in)
echo "🔐 Checking Railway authentication..."
railway whoami || railway login

# Deploy to Railway
echo "📦 Deploying to Railway..."
railway up

echo "✅ Deployment completed!"
echo "🌐 Your browserless API should be available at your Railway domain"
echo "📊 Monitor your application at https://railway.app"
