curl "http://127.0.0.1:9180/apisix/admin/upstreams/1" \
-H "X-API-KEY: edd1c9f034335f136f87ad84b625c8f1" -X PUT -d '
{
  "type": "roundrobin",
  "nodes": {
    "127.0.0.1:3100": 1
  }
}'

curl "http://127.0.0.1:9180/apisix/admin/routes/1" \
-H "X-API-KEY: edd1c9f034335f136f87ad84b625c8f1" -X PUT -d '
{
  "methods": ["GET"],  
  "uri": "/point-forecast/*",
  "upstream_id": "1"
}'

