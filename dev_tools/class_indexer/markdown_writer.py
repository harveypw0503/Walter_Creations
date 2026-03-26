import os

def write_markdown(index, descriptions, analysis, id_index, id_descriptions, output_path):
    compounds = analysis["compounds"]
    dead_classes = analysis["dead_classes"]
    top_classes = analysis["top_classes"]
    dead_ids = analysis["dead_ids"]
    top_ids = analysis["top_ids"]

    def format_path(path, line):
        # Make clickable link
        return f"[{path}](file:///{path.replace(os.sep, '/')})#L{line}"

    with open(output_path, "w", encoding="utf-8") as md:
        md.write("# CSS Class & ID Index\n\n")

        # Top stats
        md.write("## 📊 Top 10 Most-Used Classes\n\n")
        for cls, count in top_classes:
            md.write(f"- `.{cls}` — {count} uses\n")
        md.write("\n")

        md.write("## 📊 Top 10 Most-Used IDs\n\n")
        for id_name, count in top_ids:
            md.write(f"- `#{id_name}` — {count} uses\n")
        md.write("\n")

        # Dead classes
        if dead_classes:
            md.write("## 🧹 Dead Classes (Defined but Unused)\n\n")
            for cls in dead_classes:
                md.write(f"- `.{cls}`\n")
            md.write("\n")

        # Dead IDs
        if dead_ids:
            md.write("## 🧹 Dead IDs (Defined but Unused)\n\n")
            for id_name in dead_ids:
                md.write(f"- `#{id_name}`\n")
            md.write("\n")

        # All classes
        md.write("---\n\n# CSS Classes\n\n")
        for cls in sorted(index.keys()):
            md.write(f"## `.{cls}`\n\n")

            # Description
            if cls in descriptions:
                md.write(f"**Description:** {descriptions[cls]}\n\n")

            for section in ("css", "html", "js"):
                if section in index[cls]:
                    md.write(f"**Used in {section.upper()}:**\n")
                    for path, line in index[cls][section]:
                        md.write(f"- {format_path(path, line)}\n")
                    md.write("\n")

            if "css" not in index[cls]:
                md.write("⚠️ **No CSS definition found**\n\n")

        # All IDs
        md.write("---\n\n# HTML IDs\n\n")
        for id_name in sorted(id_index.keys()):
            md.write(f"## `#{id_name}`\n\n")

            # Description
            if id_name in id_descriptions:
                md.write(f"**Description:** {id_descriptions[id_name]}\n\n")

            # Check if this ID is used with classes in HTML
            classes_with_id = set()
            if "html" in id_index[id_name]:
                for item in id_index[id_name]["html"]:
                    if isinstance(item, dict) and item.get("classes"):
                        for cls in item["classes"]:
                            classes_with_id.add(cls)

            if classes_with_id:
                md.write(f"**Used with classes:** {', '.join(f'`.{c}`' for c in sorted(classes_with_id))}\n\n")

            for section in ("css", "html", "js"):
                if section in id_index[id_name]:
                    md.write(f"**Used in {section.upper()}:**\n")
                    for item in id_index[id_name][section]:
                        if isinstance(item, dict):
                            # HTML usage with classes
                            path = item["file"]
                            line = item["line"]
                            classes = item.get("classes", [])
                            class_str = f" (with classes: {', '.join(f'.{c}' for c in classes)})" if classes else ""
                            md.write(f"- {format_path(path, line)}{class_str}\n")
                        else:
                            # CSS or JS usage (tuple format)
                            path, line = item
                            md.write(f"- {format_path(path, line)}\n")
                    md.write("\n")

            if "css" not in id_index[id_name]:
                md.write("⚠️ **No CSS definition found**\n\n")

        # Compound classes
        if compounds:
            md.write("---\n\n## 🔍 Compound Class Combinations\n\n")
            for comp, path, line in compounds:
                md.write(f"- `{comp}` — {format_path(path, line)}\n")