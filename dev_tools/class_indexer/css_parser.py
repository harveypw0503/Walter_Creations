import re

CSS_CLASS_RE = re.compile(r'\.([a-zA-Z_-][a-zA-Z0-9_-]*)\b')
CSS_ID_RE = re.compile(r'#([a-zA-Z_-][a-zA-Z0-9_-]*)\b')
CSS_COMMENT_RE = re.compile(r'/\*(.*?)\*/')

# Pattern to detect if we're in a property value context (after a colon)
PROPERTY_VALUE_RE = re.compile(r':\s*[^;{]*$')

def is_valid_class_or_id(name):
    """
    Filter out common CSS values that look like classes/IDs but aren't:
    - Pure numbers or starting with numbers (measurements like .5rem, #333)
    - Common measurement units
    - Hex color codes (3 or 6 digits)
    """
    # If it starts with a digit, it's likely a measurement or color
    if name and name[0].isdigit():
        return False
    
    # Check if it's a hex color (3 or 6 hex digits)
    if re.match(r'^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$', name):
        return False
    
    # Check if it's a measurement value (ends with common CSS units)
    if re.match(r'^\d+\.?\d*(rem|em|px|pt|%|vh|vw|s|ms|deg|rad|turn)?$', name):
        return False
    
    return True

def is_in_selector_context(line_before_match):
    """
    Check if we're in a selector context (before {) or in a value context (after :)
    """
    # Remove comments first
    line_before_match = CSS_COMMENT_RE.sub('', line_before_match)
    
    # Count braces and colons to determine context
    open_braces = line_before_match.count('{')
    close_braces = line_before_match.count('}')
    
    # If we have more open braces than closed, we're inside a rule (property value context)
    if open_braces > close_braces:
        # Check if there's a colon after the last open brace (property: value)
        last_brace_pos = line_before_match.rfind('{')
        after_brace = line_before_match[last_brace_pos:]
        if ':' in after_brace and ';' not in after_brace.split(':')[-1]:
            return False  # We're in a property value
    
    return True  # We're in a selector context

def parse_css(lines, file_path):
    class_results = []
    id_results = []
    class_descriptions = {}
    id_descriptions = {}

    last_comment = None

    for line_num, line in enumerate(lines, start=1):
        comment_match = CSS_COMMENT_RE.search(line)
        if comment_match:
            last_comment = comment_match.group(1).strip()

        # Parse classes
        for match in CSS_CLASS_RE.finditer(line):
            cls = match.group(1)
            if not is_valid_class_or_id(cls):
                continue
            
            # Check context - get everything before this match
            line_before = line[:match.start()]
            if not is_in_selector_context(line_before):
                continue
            
            class_results.append((cls, file_path, line_num))
            if last_comment and cls not in class_descriptions:
                class_descriptions[cls] = last_comment

        # Parse IDs
        for match in CSS_ID_RE.finditer(line):
            id_name = match.group(1)
            if not is_valid_class_or_id(id_name):
                continue
            
            # Check context - get everything before this match
            line_before = line[:match.start()]
            if not is_in_selector_context(line_before):
                continue
            
            id_results.append((id_name, file_path, line_num))
            if last_comment and id_name not in id_descriptions:
                id_descriptions[id_name] = last_comment

        if CSS_CLASS_RE.search(line) or CSS_ID_RE.search(line):
            last_comment = None

    return class_results, class_descriptions, id_results, id_descriptions