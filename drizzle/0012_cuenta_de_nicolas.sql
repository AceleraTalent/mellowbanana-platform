-- La cuenta de Nicolás, de dirección. Nace sin clave, como las del equipo (ver 0011): la
-- elige la primera vez que entra, con su usuario y la clave del equipo de antes.
INSERT INTO "usuarios" ("nombre", "usuario", "clave_hash", "es_admin", "avisos_vistos_hasta") VALUES
  ('Nicolás', 'nicolas', '', true, now())
ON CONFLICT ("usuario") DO NOTHING;
