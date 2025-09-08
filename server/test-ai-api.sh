#!/bin/bash

echo "🧪 Testing AI Scoring API Endpoints..."
echo ""

# Base URL
BASE_URL="http://localhost:3002"

# Test authentication (you'll need to replace with a real token)
TOKEN="your-auth-token-here"

# Test AI Dashboard
echo "📊 Testing AI Dashboard..."
curl -s -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     "$BASE_URL/api/ai-scoring/dashboard" | jq '.' || echo "Dashboard endpoint test"

echo ""

# Test Top Priority Contacts
echo "⭐ Testing Top Priority Contacts..."
curl -s -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     "$BASE_URL/api/ai-scoring/priority?limit=5" | jq '.' || echo "Priority contacts endpoint test"

echo ""

# Test Opportunity Contacts
echo "🎯 Testing High Opportunity Contacts..."
curl -s -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     "$BASE_URL/api/ai-scoring/opportunities?limit=5" | jq '.' || echo "Opportunities endpoint test"

echo ""

# Test Strategic Networking
echo "🌐 Testing Strategic Networking Recommendations..."
curl -s -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     "$BASE_URL/api/ai-scoring/strategic?limit=5" | jq '.' || echo "Strategic networking endpoint test"

echo ""

# Test Batch Scoring
echo "🔄 Testing Batch Scoring..."
curl -s -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"userGoals": ["technology", "ai", "startups"]}' \
     "$BASE_URL/api/ai-scoring/batch" | jq '.' || echo "Batch scoring endpoint test"

echo ""

# Test Campaign AI Suggestions
echo "🤖 Testing Campaign AI Suggestions..."
curl -s -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     "$BASE_URL/api/campaigns/ai-suggestions?suggestionType=priority&limit=5" | jq '.' || echo "Campaign suggestions endpoint test"

echo ""
echo "✅ API endpoint tests completed!"
echo ""
echo "Note: Replace 'your-auth-token-here' with a real authentication token to test with real data."