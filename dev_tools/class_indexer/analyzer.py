from collections import Counter

def analyze(class_index, compounds, id_index):
    # Class analysis
    class_defined = set()
    class_used = set()
    class_counts = Counter()

    for cls, data in class_index.items():
        if "css" in data:
            class_defined.add(cls)
        if "html" in data or "js" in data:
            class_used.add(cls)

        for locations in data.values():
            class_counts[cls] += len(locations)

    dead_classes = sorted(class_defined - class_used)
    top_classes = class_counts.most_common(10)

    # ID analysis
    id_defined = set()
    id_used = set()
    id_counts = Counter()

    for id_name, data in id_index.items():
        if "css" in data:
            id_defined.add(id_name)
        if "html" in data or "js" in data:
            id_used.add(id_name)

        for locations in data.values():
            id_counts[id_name] += len(locations)

    dead_ids = sorted(id_defined - id_used)
    top_ids = id_counts.most_common(10)

    return {
        "dead_classes": dead_classes,
        "top_classes": top_classes,
        "compounds": compounds,
        "dead_ids": dead_ids,
        "top_ids": top_ids
    }