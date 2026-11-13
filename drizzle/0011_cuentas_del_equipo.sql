-- Las cuentas del equipo. Nacen sin clave (clave_hash vacío): cada persona elige la suya
-- la primera vez que entra, con su usuario y la clave del equipo de antes. Así ninguna
-- clave queda escrita en el repo. Si el usuario ya existe, no se toca.
INSERT INTO "usuarios" ("nombre", "usuario", "clave_hash", "es_admin", "avisos_vistos_hasta") VALUES
  ('Luciano', 'luciano', '', true, now()),
  ('Victor Gonzalez', 'victor', '', false, now()),
  ('Valentina Amaya', 'valentina', '', false, now()),
  ('Isabel Vallejo', 'isabel', '', false, now()),
  ('Lina Buenahora Rojas', 'lina', '', false, now()),
  ('Antonia Hernandez', 'antonia', '', false, now()),
  ('Carlos Huertas', 'carlos', '', false, now()),
  ('Mathew Rodriguez', 'mathew', '', false, now())
ON CONFLICT ("usuario") DO NOTHING;
