with open("/home/kravlone/.gemini/antigravity/brain/6d9792f9-24d5-48e5-b9a5-6d0375f1c435/task.md", "r") as f:
    content = f.read()

content = content.replace("[ ] Build `src/components/ChatWidget.tsx`", "[x] Build `src/components/ChatWidget.tsx`")
content = content.replace("[ ] Add `ChatWidget` to `src/components/GUILayout.tsx`", "[x] Add `ChatWidget` to `src/components/GUILayout.tsx`")
content = content.replace("[ ] Add `chat` command", "[x] Add `chat` command")

with open("/home/kravlone/.gemini/antigravity/brain/6d9792f9-24d5-48e5-b9a5-6d0375f1c435/task.md", "w") as f:
    f.write(content)
