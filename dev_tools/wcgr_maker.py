import tkinter as tk
from tkinter import filedialog, messagebox
import json
import os

def save_gradient():
    gradient_text = text_input.get("1.0", tk.END).strip()
    if not gradient_text:
        messagebox.showerror("Error", "Please paste your gradient JSON.")
        return
    try:
        gradient_data = json.loads(gradient_text)
    except json.JSONDecodeError as e:
        messagebox.showerror("Error", f"Invalid JSON:\n{e}")
        return

    # Make filename from gradient name
    name = gradient_data.get("name", "gradient")
    filename = name.lower().replace(" ", "_") + ".wcgr"

    # Ask where to save
    save_path = filedialog.asksaveasfilename(defaultextension=".wcgr",
                                             initialfile=filename,
                                             filetypes=[("WCGR files", "*.wcgr")])
    if not save_path:
        return

    # Save file
    try:
        with open(save_path, "w") as f:
            json.dump(gradient_data, f, indent=2)
        messagebox.showinfo("Saved", f"Gradient saved to {save_path}")
    except Exception as e:
        messagebox.showerror("Error", f"Failed to save:\n{e}")

# GUI setup
root = tk.Tk()
root.title("WCGR Gradient Saver")
root.geometry("600x500")

tk.Label(root, text="Paste your gradient JSON below:").pack(pady=5)
text_input = tk.Text(root, wrap="word")
text_input.pack(expand=True, fill="both", padx=10, pady=5)

save_btn = tk.Button(root, text="Save Gradient", command=save_gradient)
save_btn.pack(pady=10)

root.mainloop()