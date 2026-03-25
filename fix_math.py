import re
import sys

with open('/Users/bytedance/zyp-up.github.io/_posts/2026-03-25-blog-positional-encoding.md', 'r') as f:
    text = f.read()

# Fix tags if they are the default ones
text = re.sub(
    r"tags:\n  - cool posts\n  - category1\n  - category2",
    r"tags:\n  - Positional Encoding\n  - Transformer\n  - RoPE",
    text
)

text = text.replace("从 $$$$ 到序列的最大长度 $$L\\_{max$$）", "从 $0$ 到序列的最大长度 $L_{max}$）")

pattern = re.compile(r'\$\$(.*?)\$\$', re.DOTALL)

def replacer(match):
    start, end = match.span()
    content = match.group(1)
    
    # Fix double-escaping
    content = content.replace("\\\\", "\\").replace("\\_", "_")
    
    # Determine if it's inline
    last_newline = text.rfind('\n', 0, start)
    prefix = text[last_newline+1:start] if last_newline != -1 else text[:start]
    
    next_newline = text.find('\n', end)
    suffix = text[end:next_newline] if next_newline != -1 else text[end:]
    
    # If there's text    # If there's text    #r after, it'    #ine
                                                                                                         mi                t con                                                    con                                                          t = pattern.sub(replacer, text)

# Hand fix specific m \theta which # Hand eral # Hand fix specific m \theta which # Hand eral # Hand fix specific m \theta which # Hand eral # Hand fix specific m \og-positional-encoding.md', 'w') as f:
    f.write(new_text)

print("Fixed!")
