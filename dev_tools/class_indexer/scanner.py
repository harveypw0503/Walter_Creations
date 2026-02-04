import os
from collections import defaultdict
from html_parser import parse_html
from css_parser import parse_css
from js_parser import parse_js

IGNORED_DIRS = {"node_modules", ".git", "__pycache__"}

def scan_project(root):
    index = defaultdict(lambda: defaultdict(list))
    id_index = defaultdict(lambda: defaultdict(list))
    descriptions = {}
    id_descriptions = {}
    compounds = []

    for root_dir, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]

        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in {".html", ".css", ".js"}:
                continue

            path = os.path.join(root_dir, file)

            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()

            if ext == ".html":
                class_results, comps, id_results = parse_html(lines, path)
                compounds.extend(comps)
                for cls, p, l in class_results:
                    index[cls]["html"].append((p, l))
                for item in id_results:
                    id_index[item["id"]]["html"].append(item)

            elif ext == ".css":
                class_results, class_descs, id_results, id_descs = parse_css(lines, path)
                for cls, p, l in class_results:
                    index[cls]["css"].append((p, l))
                descriptions.update(class_descs)
                for id_name, p, l in id_results:
                    id_index[id_name]["css"].append((p, l))
                id_descriptions.update(id_descs)

            elif ext == ".js":
                class_results, id_results = parse_js(lines, path)
                for cls, p, l in class_results:
                    index[cls]["js"].append((p, l))
                for id_name, p, l in id_results:
                    id_index[id_name]["js"].append((p, l))

    return index, descriptions, compounds, id_index, id_descriptions