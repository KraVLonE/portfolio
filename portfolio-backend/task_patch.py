with open("/home/kravlone/.gemini/antigravity/brain/6d9792f9-24d5-48e5-b9a5-6d0375f1c435/task.md", "r") as f:
    content = f.read()

content = content.replace("[ ] Update `app/core/config.py`", "[x] Update `app/core/config.py`")
content = content.replace("[ ] Implement `app/chat/key_rotation.py`", "[x] Implement `app/chat/key_rotation.py`")
content = content.replace("[ ] Implement `app/chat/llm.py`", "[x] Implement `app/chat/llm.py`")
content = content.replace("[ ] `app/chat/pii.py`", "[x] `app/chat/pii.py`")
content = content.replace("[ ] `app/chat/retrieval.py`", "[x] `app/chat/retrieval.py`")
content = content.replace("[ ] Update `app/chat/agent.py`", "[x] Update `app/chat/agent.py`")
content = content.replace("[ ] Implement `slowapi` rate limiting", "[x] Implement `slowapi` rate limiting")
content = content.replace("[ ] Connect `POST /chat`", "[x] Connect `POST /chat`")

with open("/home/kravlone/.gemini/antigravity/brain/6d9792f9-24d5-48e5-b9a5-6d0375f1c435/task.md", "w") as f:
    f.write(content)
