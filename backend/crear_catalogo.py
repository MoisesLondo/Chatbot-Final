import csv
from docxtpl import DocxTemplate

# Cargar el template
doc = DocxTemplate("temp.docx")

# Leer el CSV y mapear los campos
rows = []
with open("cat.csv", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        rows.append({
            "code": row["codigo"].strip(),
            "name": row["nombre"].strip(),
            "cat": row["categoria"].strip()
        })

# Renderizar el template con la tabla
context = {"products": rows}
doc.render(context)
doc.save("static/temp/catalogo_completo.docx")

