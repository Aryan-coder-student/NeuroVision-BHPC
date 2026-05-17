#!/bin/bash

# NeuroVision Environment Switcher
# Seamlessly toggle backend environments between local development and production.

# Colors for premium CLI look
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================${NC}"
echo -e "${CYAN}      🧠 NeuroVision Environment Switcher     ${NC}"
echo -e "${BLUE}==============================================${NC}"

# Parse environment parameter
TARGET_ENV=$(echo "$1" | tr '[:upper:]' '[:lower:]')

if [[ "$TARGET_ENV" == "dev" || "$TARGET_ENV" == "development" ]]; then
    ENV_NAME="development"
    ENV_FILE="backend/.env.development"
elif [[ "$TARGET_ENV" == "prod" || "$TARGET_ENV" == "production" ]]; then
    ENV_NAME="production"
    ENV_FILE="backend/.env.production"
else
    echo -e "${RED}❌ Error: Invalid environment specified.${NC}"
    echo -e "Usage:   ${YELLOW}./switch_env.sh [dev|prod]${NC}"
    echo -e "Example: ${GREEN}./switch_env.sh dev${NC}"
    exit 1
fi

# Paths
ROOT_ENV="backend/.env"
API_ENV="backend/platform_api/.env"

# Perform Environment Copying
if [ -f "$ENV_FILE" ]; then
    echo -e "🔄 Switching to ${GREEN}${ENV_NAME}${NC} mode..."
    
    # Copy to backend root env
    cp "$ENV_FILE" "$ROOT_ENV"
    # Copy to platform_api env (for local python manage.py runner)
    cp "$ENV_FILE" "$API_ENV"
    
    echo -e "✨ ${GREEN}Success!${NC} Environments updated:"
    echo -e "   📍 Configured: ${CYAN}$ROOT_ENV${NC}"
    echo -e "   📍 Configured: ${CYAN}$API_ENV${NC}"
    
    # Extract database host for visual confirmation
    DB_HOST=$(grep "DATABASE_URL" "$ENV_FILE" | sed -E 's/.*@([^:/]*).*/\1/')
    echo -e "   🔌 Database Target: ${YELLOW}$DB_HOST${NC}"
    echo -e "   🌐 Domain Standard: ${YELLOW}$(grep "TENANT_BASE_DOMAIN" "$ENV_FILE" | cut -d'=' -f2)${NC}"
    
    echo -e "${BLUE}----------------------------------------------${NC}"
    echo -e "💡 ${YELLOW}Next steps:${NC}"
    if [[ "$ENV_NAME" == "development" ]]; then
        echo -e "   1. Start services:  ${GREEN}podman compose up -d${NC}"
        echo -e "   2. Run migrations:  ${GREEN}podman compose exec backend python platform_api/manage.py migrate_schemas${NC}"
        echo -e "   3. Launch Frontend: ${GREEN}cd frontend && npm run dev${NC}"
    else
        echo -e "   1. Start production build: ${GREEN}podman compose --profile production up -d${NC}"
    fi
else
    echo -e "${RED}❌ Error: Configuration file $ENV_FILE not found!${NC}"
    exit 1
fi
