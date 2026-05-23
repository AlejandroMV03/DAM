from app.utils.schema import aplicar_migraciones

print("Conectando con Supabase...")
aplicar_migraciones()
print("¡Tablas creadas con éxito en la nube!")
