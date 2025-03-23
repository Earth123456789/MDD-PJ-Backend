## See a API Documents

```bash
http://localhost:3003/docs/
```

## TEST A USER

```
 curl -X POST \
  http://localhost:3003/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "role": "admin"
  }'
```