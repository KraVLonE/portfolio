import re

with open('src/components/GUILayout.tsx', 'r') as f:
    content = f.read()

# We want to replace <section ...> ... </section> with <FadeIn><section ...> ... </section></FadeIn>
# But only for top level sections inside <main>
# A simpler way is to just do a regex replace for <section and </section>
# Wait, some sections have id="...", some don't.
# It's safer to just split by <section and </section> and wrap them.

parts = re.split(r'(<section.*?</section>)', content, flags=re.DOTALL)

for i in range(1, len(parts), 2):
    parts[i] = f'<FadeIn>\n        {parts[i].strip()}\n        </FadeIn>'

with open('src/components/GUILayout.tsx', 'w') as f:
    f.write("".join(parts))
