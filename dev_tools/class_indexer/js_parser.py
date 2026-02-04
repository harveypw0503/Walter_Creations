import re

JS_ID_RE = re.compile(
    r'getElementById\(["\']([^"\']+)["\']\)|querySelector\(["\']#([^"\']+)["\']'
)

def parse_js(lines, file_path):
    class_results = []
    id_results = []

    for line_num, line in enumerate(lines, start=1):
        # Classes (existing logic)
        if "classList" in line or "className" in line:
            parts = re.findall(r'["\']([^"\']+)["\']', line)
            for part in parts:
                for cls in part.split():
                    class_results.append((cls, file_path, line_num))

        # IDs
        matches = JS_ID_RE.findall(line)
        for match in matches:
            id_name = match[0] or match[1]
            id_results.append((id_name, file_path, line_num))

    return class_results, id_results