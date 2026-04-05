#!/bin/bash
echo "======================================"
echo " NeuroVision Monorepo Initialization  "
echo "======================================"

echo ""
echo "[1/2] Hydrating Frontend Environment..."
cd frontend
npm install
cd ..

echo ""
echo "[2/2] Hydrating Backend Environment..."
cd backend
python -m venv venv
# Robust OS-agnostic activation
if [ -d "venv/Scripts" ]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi
pip install -r requirements.txt
python manage.py migrate

echo ""
echo "======================================"
echo " Setup Complete.                      "
echo "======================================"
echo "To run the application:"
echo "Option A (Docker): docker-compose up"
echo "Option B (Manual): Run 'npm run dev' in frontend, and 'python manage.py runserver' in backend."
