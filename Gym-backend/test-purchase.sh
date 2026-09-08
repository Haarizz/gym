curl -X POST http://localhost:8080/api/mobile/discovery/centers/fitzone-new/2/purchase \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"username":"testmobile","password":"password"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)" \
-d '{"planId": 2}'
