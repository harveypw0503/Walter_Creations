import re

HTML_CLASS_RE = re.compile(r'class="([^"]+)"')
HTML_ID_RE = re.compile(r'id="([^"]+)"')

def parse_html(lines, file_path):
    class_results = []
    compounds = []
    id_results = []

    for line_num, line in enumerate(lines, start=1):
        classes = []
        ids = HTML_ID_RE.findall(line)

        class_match = HTML_CLASS_RE.findall(line)
        if class_match:
            classes = class_match[0].split()
            for cls in classes:
                class_results.append((cls, file_path, line_num))

            if len(classes) > 1:
                compounds.append((".".join(classes), file_path, line_num))

        for id_name in ids:
            id_results.append({
                "id": id_name,
                "file": file_path,
                "line": line_num,
                "classes": classes
            })

    return class_results, compounds, id_results