from scanner import scan_project
from analyzer import analyze
from markdown_writer import write_markdown
from export_json import export_json
from tkinter import filedialog, messagebox, Tk, Button, Checkbutton, IntVar

def run_scan(export_json_var):
    folder = filedialog.askdirectory(title="Select Walter Creations Folder")
    if not folder:
        return

    output_md_path = filedialog.asksaveasfilename(
        title="Save Markdown File",
        defaultextension=".md",
        filetypes=[("Markdown", "*.md")]
    )
    if not output_md_path:
        return

    # Scan project
    index, descriptions, compounds, id_index, id_descriptions = scan_project(folder)

    # Analyze
    analysis = analyze(index, compounds, id_index)

    # Write Markdown
    write_markdown(index, descriptions, analysis, id_index, id_descriptions, output_md_path)

    # Only export JSON if checkbox is checked
    if export_json_var.get():
        output_json_path = filedialog.asksaveasfilename(
            title="Save JSON File",
            defaultextension=".json",
            filetypes=[("JSON", "*.json")]
        )
        if output_json_path:
            export_json(index, analysis, id_index, output_json_path)

    messagebox.showinfo("Done", "Class & ID index generated successfully!")

# --- GUI setup ---
root = Tk()
root.title("Walter Creations – Class & ID Indexer")

export_json_var = IntVar(value=0)  # default = 0 (unchecked)

btn_scan = Button(root, text="Scan Project", command=lambda: run_scan(export_json_var), width=30, height=2)
btn_scan.pack(padx=20, pady=10)

chk_json = Checkbutton(root, text="Export JSON (optional)", variable=export_json_var)
chk_json.pack(padx=20, pady=5)

root.mainloop()