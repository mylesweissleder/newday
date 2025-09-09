#!/bin/bash

# Multi-Crew Team Setup Script
# This script creates multiple crews and users for testing

BASE_URL="http://localhost:3002/api"
CLIENT_URL="http://localhost:3000"

echo "🚀 Setting up Multi-Crew Team Test Environment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to make API calls and handle responses
make_api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth_header=$4
    
    if [ -n "$auth_header" ]; then
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Cookie: $auth_header" \
            -d "$data")
    else
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    echo "$response"
}

# Function to extract auth cookie from response headers
get_auth_cookie() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    auth_cookie=$(curl -s -X $method "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data" \
        -D - | grep -i "set-cookie: auth-token" | sed 's/.*auth-token=\([^;]*\).*/auth-token=\1/')
    
    echo "$auth_cookie"
}

echo -e "${BLUE}Step 1: Creating Team Alpha (Account 1)${NC}"
echo "----------------------------------------"

# Register Team Alpha Leader
team_alpha_data='{
    "accountName": "Team Alpha",
    "email": "alpha-leader@test.com",
    "password": "password123",
    "firstName": "Alpha",
    "lastName": "Leader"
}'

echo "Creating Team Alpha leader..."
alpha_response=$(make_api_call "POST" "/auth/register" "$team_alpha_data")
alpha_cookie=$(get_auth_cookie "POST" "/auth/register" "$team_alpha_data")

echo -e "${GREEN}✓ Team Alpha created${NC}"
echo "Leader: alpha-leader@test.com / password123"
echo "Auth Cookie: $alpha_cookie"
echo ""

echo -e "${BLUE}Step 2: Creating Team Beta (Account 2)${NC}"
echo "---------------------------------------"

# Register Team Beta Leader
team_beta_data='{
    "accountName": "Team Beta",
    "email": "beta-leader@test.com", 
    "password": "password123",
    "firstName": "Beta",
    "lastName": "Leader"
}'

echo "Creating Team Beta leader..."
beta_response=$(make_api_call "POST" "/auth/register" "$team_beta_data")
beta_cookie=$(get_auth_cookie "POST" "/auth/register" "$team_beta_data")

echo -e "${GREEN}✓ Team Beta created${NC}"
echo "Leader: beta-leader@test.com / password123"
echo "Auth Cookie: $beta_cookie"
echo ""

echo -e "${BLUE}Step 3: Creating Team Gamma (Account 3)${NC}"
echo "----------------------------------------"

# Register Team Gamma Leader
team_gamma_data='{
    "accountName": "Team Gamma",
    "email": "gamma-leader@test.com",
    "password": "password123", 
    "firstName": "Gamma",
    "lastName": "Leader"
}'

echo "Creating Team Gamma leader..."
gamma_response=$(make_api_call "POST" "/auth/register" "$team_gamma_data")
gamma_cookie=$(get_auth_cookie "POST" "/auth/register" "$team_gamma_data")

echo -e "${GREEN}✓ Team Gamma created${NC}"
echo "Leader: gamma-leader@test.com / password123"
echo "Auth Cookie: $gamma_cookie"
echo ""

echo -e "${BLUE}Step 4: Generating Join Codes${NC}"
echo "-----------------------------"

# Generate join codes for each team
echo "Generating join code for Team Alpha..."
alpha_join_response=$(make_api_call "POST" "/crew/join-code/generate" "{}" "$alpha_cookie")
alpha_join_code=$(echo "$alpha_join_response" | grep -o '"joinCode":"[^"]*"' | cut -d'"' -f4)

echo "Generating join code for Team Beta..."
beta_join_response=$(make_api_call "POST" "/crew/join-code/generate" "{}" "$beta_cookie")
beta_join_code=$(echo "$beta_join_response" | grep -o '"joinCode":"[^"]*"' | cut -d'"' -f4)

echo "Generating join code for Team Gamma..."
gamma_join_response=$(make_api_call "POST" "/crew/join-code/generate" "{}" "$gamma_cookie")
gamma_join_code=$(echo "$gamma_join_response" | grep -o '"joinCode":"[^"]*"' | cut -d'"' -f4)

echo -e "${GREEN}✓ Join codes generated:${NC}"
echo "Team Alpha: $alpha_join_code"
echo "Team Beta: $beta_join_code"
echo "Team Gamma: $gamma_join_code"
echo ""

echo -e "${BLUE}Step 5: Creating Additional Team Members${NC}"
echo "-------------------------------------------"

# Create additional users for Team Alpha
echo "Creating Team Alpha members..."

# Alice Admin for Team Alpha
alice_data='{
    "email": "alice.admin@test.com",
    "firstName": "Alice",
    "lastName": "Admin",
    "role": "ADMIN"
}'

alice_invite=$(make_api_call "POST" "/crew/invite" "$alice_data" "$alpha_cookie")
echo -e "${GREEN}✓ Invited Alice Admin to Team Alpha${NC}"

# Bob Member for Team Alpha  
bob_data='{
    "email": "bob.member@test.com",
    "firstName": "Bob", 
    "lastName": "Member",
    "role": "MEMBER"
}'

bob_invite=$(make_api_call "POST" "/crew/invite" "$bob_data" "$alpha_cookie")
echo -e "${GREEN}✓ Invited Bob Member to Team Alpha${NC}"

# Carol Viewer for Team Alpha
carol_data='{
    "email": "carol.viewer@test.com",
    "firstName": "Carol",
    "lastName": "Viewer", 
    "role": "VIEWER"
}'

carol_invite=$(make_api_call "POST" "/crew/invite" "$carol_data" "$alpha_cookie")
echo -e "${GREEN}✓ Invited Carol Viewer to Team Alpha${NC}"

echo ""

# Create members for Team Beta
echo "Creating Team Beta members..."

dave_data='{
    "email": "dave.beta@test.com",
    "firstName": "Dave",
    "lastName": "Beta",
    "role": "MEMBER"
}'

dave_invite=$(make_api_call "POST" "/crew/invite" "$dave_data" "$beta_cookie")
echo -e "${GREEN}✓ Invited Dave to Team Beta${NC}"

eve_data='{
    "email": "eve.beta@test.com", 
    "firstName": "Eve",
    "lastName": "Beta",
    "role": "ADMIN"
}'

eve_invite=$(make_api_call "POST" "/crew/invite" "$eve_data" "$beta_cookie")
echo -e "${GREEN}✓ Invited Eve to Team Beta${NC}"

echo ""

# Create member for Team Gamma
echo "Creating Team Gamma members..."

frank_data='{
    "email": "frank.gamma@test.com",
    "firstName": "Frank", 
    "lastName": "Gamma",
    "role": "MEMBER"
}'

frank_invite=$(make_api_call "POST" "/crew/invite" "$frank_data" "$gamma_cookie")
echo -e "${GREEN}✓ Invited Frank to Team Gamma${NC}"

echo ""

echo -e "${YELLOW}📋 SETUP COMPLETE - Test Account Summary${NC}"
echo "================================================"
echo ""
echo -e "${BLUE}🏆 Team Leaders (CREW_LEADER role):${NC}"
echo "• Team Alpha: alpha-leader@test.com / password123"
echo "• Team Beta: beta-leader@test.com / password123" 
echo "• Team Gamma: gamma-leader@test.com / password123"
echo ""
echo -e "${BLUE}🎯 Join Codes for Quick Testing:${NC}"
echo "• Team Alpha: $alpha_join_code"
echo "• Team Beta: $beta_join_code"
echo "• Team Gamma: $gamma_join_code"
echo ""
echo -e "${BLUE}👥 Invited Members (Check email for invitation links):${NC}"
echo "Team Alpha:"
echo "  • alice.admin@test.com (ADMIN)"
echo "  • bob.member@test.com (MEMBER)"
echo "  • carol.viewer@test.com (VIEWER)"
echo ""
echo "Team Beta:"
echo "  • dave.beta@test.com (MEMBER)"
echo "  • eve.beta@test.com (ADMIN)"
echo ""
echo "Team Gamma:"
echo "  • frank.gamma@test.com (MEMBER)"
echo ""
echo -e "${YELLOW}🧪 Ready for Testing:${NC}"
echo "1. Log in as different team leaders"
echo "2. Test data isolation between teams"
echo "3. Import contacts and verify team separation"
echo "4. Test join codes and member permissions"
echo "5. Check crew analytics for each team"
echo ""
echo -e "${GREEN}✅ Multi-crew test environment is ready!${NC}"