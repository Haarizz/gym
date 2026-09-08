#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJpc0dsb2JhbCI6dHJ1ZSwic3ViIjoidGVzdG1vYmlsZTkiLCJpYXQiOjE3ODg3NzkyNjEsImV4cCI6MTc4ODg2NTY2MX0.R5kVP_AuhwTCe9OFb-iz2SfbRYeOSHXjBGYD54X9xF4"
curl -v -X POST http://localhost:8080/api/mobile/discovery/centers/fitzone-new/2/purchase \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $TOKEN" \
-d '{"planId": 2}'
echo ""
