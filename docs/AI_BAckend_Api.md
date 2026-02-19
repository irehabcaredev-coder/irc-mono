### **1. Create Session (Anonymous)**

```
bash

curl-XPOSThttp://localhost:8000/api/v1/session
```

### **2. Create Session (Authenticated via user ID)**

```
bash

curl-XPOSThttp://localhost:8000/api/v1/session\
-H"x-user-id: your-user-id"
```

### **3. Create Session (Authenticated via JWT)**

```
bash

curl-XPOSThttp://localhost:8000/api/v1/session\
-H"Authorization: Bearer <your-jwt-token>"
```

### **4. Delete Session**

```
bash

curl-XDELETEhttp://localhost:8000/api/v1/session\
-H"x-session-id: <session-id>"
```

---

### **5. Chat (text)**

```
bash

curl-XPOSThttp://localhost:8000/api/v1/chat\
-H"Content-Type: application/json"\
-H"x-session-id: <session-id>"\
-d"{\"prompt\":\"Hello, how can you help me?\",\"mode\":\"chat\"}"
```

### **6. Chat (image analysis)**

```
bash

curl-XPOSThttp://localhost:8000/api/v1/chat\
-H"Content-Type: application/json"\
-H"x-session-id: <session-id>"\
-d"{\"prompt\":\"What is in this image?\",\"mode\":\"image_analysis\",\"image_url\":\"https://example.com/image.jpg\"}"
```

---

### **7. List Chat History**

```
bash

curl-XGEThttp://localhost:8000/api/v1/chat-history\
-H"x-session-id: <session-id>"
```

### **8. Get Chat Messages (paginated)**

```
bash

curl-XGET"http://localhost:8000/api/v1/chat-history/<chat-id>?page=1&page_size=10"\
-H"x-session-id: <session-id>"
```

---

### **9. Create/Update Prompt (admin)**

```
bash

curl-XPUThttp://localhost:8000/api/v1/prompts\
-H"Content-Type: application/json"\
-H"x-token: dev-admin-token"\
-d"{\"name\":\"master_prompt\",\"content\":\"You are a helpful assistant.\"}"
```

### **10. List Prompts**

```
bash

curl-XGEThttp://localhost:8000/api/v1/prompts
```

---

**Typical flow:** Create a session first (#1/#2/#3), grab the

```
session_id
```

from the response, then use it in the

```
x-session-id
```

header for chat and history calls