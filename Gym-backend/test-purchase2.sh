#!/bin/bash
echo "Registering..."
TOKEN=$(curl -s -X POST http://localhost:8080/api/mobile/auth/register -H "Content-Type: application/json" -d '{"fullName":"Test Mobile", "username":"testmobile7","email":"testmobile7@example.com", "password":"password"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Token: $TOKEN"

echo "Purchasing..."
curl -s -X POST http://localhost:8080/api/mobile/discovery/centers/fitzone-new/2/purchase \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $TOKEN" \
-d '{"planId": 2}'
echo ""
