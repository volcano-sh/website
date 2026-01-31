import os
import re
import yaml

def parse_toml_simple(toml_str):
    """
    Very basic TOML parser for Hugo frontmatter.
    Handles strings, lists of strings, booleans, and dates (as strings).
    """
    data = {}
    for line in toml_str.splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        
        # Match key = value
        match = re.search(r'^([a-zA-Z0-9_\-]+)\s*=\s*(.*)', line)
        if match:
            key = match.group(1).strip()
            value_str = match.group(2).strip()
            
            # Handle String
            if value_str.startswith('"') and value_str.endswith('"'):
                data[key] = value_str[1:-1]
            # Handle List
            elif value_str.startswith('[') and value_str.endswith(']'):
                # Extract items
                items_str = value_str[1:-1]
                items = [item.strip().strip('"') for item in items_str.split(',') if item.strip()]
                data[key] = items
            # Handle Boolean
            elif value_str.lower() == 'true':
                data[key] = True
            elif value_str.lower() == 'false':
                data[key] = False
            # Handle Number/Date (keep as string or let yaml parse)
            else:
                 # Check if likely a date
                 data[key] = value_str
                 
    return data

def convert_frontmatter(content):
    # Regex to find TOML frontmatter
    match = re.search(r'^\+\+\+\n(.*?)\n\+\+\+\n(.*)', content, re.DOTALL)
    if not match:
        return content
    
    toml_fm = match.group(1)
    body = match.group(2)
    
    data = parse_toml_simple(toml_fm)
    
    # Docusaurus Authors
    if 'authors' in data and not isinstance(data['authors'], list):
         # If it's a single string, make it a list? Or if Hugo used 'author' (singular)
         pass 

    # Convert to YAML
    yaml_fm = yaml.dump(data, default_flow_style=False, sort_keys=False)
    
    return f"---\n{yaml_fm}---\n{body}"

def process_directory(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".md"):
                path = os.path.join(root, file)
                print(f"Processing {path}...")
                with open(path, 'r') as f:
                    content = f.read()
                
                new_content = convert_frontmatter(content)
                
                with open(path, 'w') as f:
                    f.write(new_content)

if __name__ == "__main__":
    process_directory("blog")
