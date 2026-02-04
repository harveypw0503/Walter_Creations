import json

def export_json(index, analysis, id_index, output_path):
    data = {
        "classes": {},
        "ids": {},
        "stats": {
            "top_classes": analysis["top_classes"],
            "dead_classes": analysis["dead_classes"],
            "top_ids": analysis["top_ids"],
            "dead_ids": analysis["dead_ids"]
        },
        "compounds": analysis["compounds"]
    }

    for cls, info in index.items():
        data["classes"][cls] = {
            "usage": info
        }

    for id_name, info in id_index.items():
        # Convert dict items to serializable format
        serializable_info = {}
        for section, items in info.items():
            serializable_items = []
            for item in items:
                if isinstance(item, dict):
                    serializable_items.append(item)
                else:
                    # Convert tuple to dict for JSON
                    serializable_items.append({
                        "file": item[0],
                        "line": item[1]
                    })
            serializable_info[section] = serializable_items
        
        data["ids"][id_name] = {
            "usage": serializable_info
        }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)