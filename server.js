import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { body, validationResult } from "express-validator";
import pool from "./server/db.js";
import { requireAuth, signToken } from "./server/auth.js";
import { attachTags, currentMonth, getBudgetWarning, toInt, validateUserCategory, validateUserTags } from "./server/helpers.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);
const corsOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.length === 0 || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origen no permitido por CORS"));
  },
}));
app.use(express.json());
// Normaliza rutas que el proxy (Nginx) pueda recortar antes de llegar a Express.
// Añade "/api" internamente solo para rutas que sabemos son del API.
app.use((req, res, next) => {
  if (req.url.startsWith("/api") || req.url.startsWith("/health")) return next();

  const apiPrefixes = ["/auth", "/categorias", "/metodos_pago", "/etiquetas", "/presupuestos", "/gastos", "/reportes"];
  if (apiPrefixes.some((p) => req.url.startsWith(p))) {
    req.url = "/api" + req.url;
  }
  next();
});
app.use((req, res, next) => {
  if (req.url.startsWith("/equipo_01/api")) {
    req.url = req.url.replace("/equipo_01/api", "/api");
  }
  next();
});

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Datos invalidos", details: errors.array() });
  }
  next();
}

app.get(["/api/health", "/health"], (req, res) => {
  res.json({ ok: true });
});

app.post(
  "/api/auth/register",
  body("nombre").trim().notEmpty(),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  handleValidation,
  async (req, res) => {
    const { nombre, email, password } = req.body;

    try {
      const passwordHash = await bcrypt.hash(password, 12);
      const [result] = await pool.query(
        "INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)",
        [nombre, email, passwordHash]
      );
      const user = { id: result.insertId, nombre, email };
      res.status(201).json({ user, token: signToken(user) });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "El email ya esta registrado" });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

app.post(
  "/api/auth/login",
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
  handleValidation,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const [rows] = await pool.query("SELECT id, nombre, email, password_hash FROM usuarios WHERE email = ?", [email]);
      const user = rows[0];

      if (!user || !(await bcrypt.compare(password, user.password_hash || ""))) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }

      res.json({
        user: { id: user.id, nombre: user.nombre, email: user.email },
        token: signToken(user),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.get("/api/auth/me", requireAuth, async (req, res) => {
  const [rows] = await pool.query("SELECT id, nombre, email FROM usuarios WHERE id = ?", [req.user.id]);
  if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json(rows[0]);
});

app.use("/api", requireAuth);

app.get("/api/categorias", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, nombre, usuario_id FROM categorias WHERE usuario_id = ? OR usuario_id IS NULL ORDER BY nombre",
    [req.user.id]
  );
  res.json(rows);
});

app.post("/api/categorias", body("nombre").trim().notEmpty(), handleValidation, async (req, res) => {
  const [result] = await pool.query(
    "INSERT INTO categorias (nombre, usuario_id) VALUES (?, ?)",
    [req.body.nombre, req.user.id]
  );
  res.status(201).json({ id: result.insertId, nombre: req.body.nombre });
});

app.delete("/api/categorias/:id", async (req, res) => {
  const [result] = await pool.query("DELETE FROM categorias WHERE id = ? AND usuario_id = ?", [req.params.id, req.user.id]);
  res.json({ ok: result.affectedRows > 0 });
});

app.get("/api/metodos_pago", async (req, res) => {
  const [rows] = await pool.query("SELECT id, nombre FROM metodos_pago ORDER BY nombre");
  res.json(rows);
});

app.post("/api/metodos_pago", body("nombre").trim().notEmpty(), handleValidation, async (req, res) => {
  const [result] = await pool.query("INSERT INTO metodos_pago (nombre) VALUES (?)", [req.body.nombre]);
  res.status(201).json({ id: result.insertId, nombre: req.body.nombre });
});

app.put("/api/metodos_pago/:id", body("nombre").trim().notEmpty(), handleValidation, async (req, res) => {
  await pool.query("UPDATE metodos_pago SET nombre = ? WHERE id = ?", [req.body.nombre, req.params.id]);
  res.json({ ok: true });
});

app.delete("/api/metodos_pago/:id", async (req, res) => {
  await pool.query("DELETE FROM metodos_pago WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

app.get("/api/etiquetas", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, nombre, usuario_id FROM etiquetas WHERE usuario_id = ? OR usuario_id IS NULL ORDER BY nombre",
    [req.user.id]
  );
  res.json(rows);
});

app.post("/api/etiquetas", body("nombre").trim().notEmpty(), handleValidation, async (req, res) => {
  const [result] = await pool.query(
    "INSERT INTO etiquetas (nombre, usuario_id) VALUES (?, ?)",
    [req.body.nombre, req.user.id]
  );
  res.status(201).json({ id: result.insertId, nombre: req.body.nombre });
});

app.put("/api/etiquetas/:id", body("nombre").trim().notEmpty(), handleValidation, async (req, res) => {
  await pool.query("UPDATE etiquetas SET nombre = ? WHERE id = ? AND usuario_id = ?", [req.body.nombre, req.params.id, req.user.id]);
  res.json({ ok: true });
});

app.delete("/api/etiquetas/:id", async (req, res) => {
  await pool.query("DELETE FROM etiquetas WHERE id = ? AND usuario_id = ?", [req.params.id, req.user.id]);
  res.json({ ok: true });
});

app.get("/api/presupuestos", async (req, res) => {
  const mes = req.query.mes || currentMonth();
  const [rows] = await pool.query(
    `SELECT p.*, c.nombre AS categoria_nombre
     FROM presupuestos p
     LEFT JOIN categorias c ON c.id = p.categoria_id
     WHERE p.usuario_id = ? AND p.mes = ?
     ORDER BY c.nombre`,
    [req.user.id, mes]
  );
  res.json(rows);
});

app.post(
  "/api/presupuestos",
  body("categoria_id").isInt(),
  body("monto_limite").isFloat({ gt: 0 }),
  body("mes").matches(/^\d{4}-\d{2}$/),
  handleValidation,
  async (req, res) => {
    const [result] = await pool.query(
      "INSERT INTO presupuestos (usuario_id, categoria_id, monto_limite, mes) VALUES (?, ?, ?, ?)",
      [req.user.id, req.body.categoria_id, req.body.monto_limite, req.body.mes]
    );
    res.status(201).json({ id: result.insertId });
  }
);

app.put("/api/presupuestos/:id", body("monto_limite").isFloat({ gt: 0 }), handleValidation, async (req, res) => {
  await pool.query("UPDATE presupuestos SET monto_limite = ? WHERE id = ? AND usuario_id = ?", [req.body.monto_limite, req.params.id, req.user.id]);
  res.json({ ok: true });
});

app.delete("/api/presupuestos/:id", async (req, res) => {
  await pool.query("DELETE FROM presupuestos WHERE id = ? AND usuario_id = ?", [req.params.id, req.user.id]);
  res.json({ ok: true });
});

app.get("/api/gastos", async (req, res) => {
  const params = [req.user.id];
  const where = ["g.usuario_id = ?"];

  if (req.query.categoria) {
    where.push("g.categoria_id = ?");
    params.push(req.query.categoria);
  }
  if (req.query.desde) {
    where.push("g.fecha_hora >= ?");
    params.push(req.query.desde);
  }
  if (req.query.hasta) {
    where.push("g.fecha_hora <= ?");
    params.push(req.query.hasta);
  }
  if (req.query.q) {
    where.push("g.descripcion LIKE ?");
    params.push(`%${req.query.q}%`);
  }
  if (req.query.etiqueta) {
    where.push("EXISTS (SELECT 1 FROM gasto_etiquetas ge WHERE ge.gasto_id = g.id AND ge.etiqueta_id = ?)");
    params.push(req.query.etiqueta);
  }

  const [rows] = await pool.query(
    `SELECT g.*, c.nombre AS categoria_nombre, mp.nombre AS metodo_pago_nombre
     FROM gastos g
     INNER JOIN categorias c ON c.id = g.categoria_id
     LEFT JOIN metodos_pago mp ON mp.id = g.metodo_pago_id
     WHERE ${where.join(" AND ")}
     ORDER BY g.fecha_hora DESC`,
    params
  );

  res.json(await attachTags(pool, rows));
});

app.get("/api/gastos/:id", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT g.*, c.nombre AS categoria_nombre, mp.nombre AS metodo_pago_nombre
     FROM gastos g
     INNER JOIN categorias c ON c.id = g.categoria_id
     LEFT JOIN metodos_pago mp ON mp.id = g.metodo_pago_id
     WHERE g.id = ? AND g.usuario_id = ?`,
    [req.params.id, req.user.id]
  );

  if (!rows.length) return res.status(404).json({ error: "Gasto no encontrado" });
  const [gasto] = await attachTags(pool, rows);
  res.json(gasto);
});

app.post(
  "/api/gastos",
  body("monto").isFloat({ gt: 0 }),
  body("descripcion").trim().notEmpty(),
  body("categoria_id").isInt(),
  body("fecha_hora").notEmpty(),
  handleValidation,
  async (req, res) => {
    const etiquetas = Array.isArray(req.body.etiquetas) ? req.body.etiquetas.map(toInt).filter(Boolean) : [];
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      if (!(await validateUserCategory(conn, req.body.categoria_id, req.user.id))) {
        await conn.rollback();
        return res.status(400).json({ error: "Categoria invalida" });
      }
      if (!(await validateUserTags(conn, etiquetas, req.user.id))) {
        await conn.rollback();
        return res.status(400).json({ error: "Etiquetas invalidas" });
      }

      const [result] = await conn.query(
        `INSERT INTO gastos
         (monto, descripcion, categoria_id, usuario_id, metodo_pago_id, nota, es_recurrente, frecuencia, fecha_hora)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.body.monto,
          req.body.descripcion,
          req.body.categoria_id,
          req.user.id,
          req.body.metodo_pago_id || null,
          req.body.nota || null,
          req.body.es_recurrente ? 1 : 0,
          req.body.frecuencia || null,
          req.body.fecha_hora,
        ]
      );

      if (etiquetas.length) {
        await conn.query(
          "INSERT INTO gasto_etiquetas (gasto_id, etiqueta_id) VALUES ?",
          [etiquetas.map((id) => [result.insertId, id])]
        );
      }

      const warning = await getBudgetWarning(conn, req.user.id, req.body.categoria_id, req.body.fecha_hora);
      await conn.commit();
      res.status(201).json({ ok: true, id: result.insertId, ...warning });
    } catch (error) {
      await conn.rollback();
      res.status(500).json({ error: error.message });
    } finally {
      conn.release();
    }
  }
);

app.put(
  "/api/gastos/:id",
  body("monto").isFloat({ gt: 0 }),
  body("descripcion").trim().notEmpty(),
  body("categoria_id").isInt(),
  body("fecha_hora").notEmpty(),
  handleValidation,
  async (req, res) => {
  const etiquetas = Array.isArray(req.body.etiquetas) ? req.body.etiquetas.map(toInt).filter(Boolean) : [];
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [owned] = await conn.query("SELECT id FROM gastos WHERE id = ? AND usuario_id = ?", [req.params.id, req.user.id]);
    if (!owned.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Gasto no encontrado" });
    }
    if (!(await validateUserCategory(conn, req.body.categoria_id, req.user.id))) {
      await conn.rollback();
      return res.status(400).json({ error: "Categoria invalida" });
    }
    if (!(await validateUserTags(conn, etiquetas, req.user.id))) {
      await conn.rollback();
      return res.status(400).json({ error: "Etiquetas invalidas" });
    }

    await conn.query(
      `UPDATE gastos
       SET monto = ?, descripcion = ?, categoria_id = ?, metodo_pago_id = ?, nota = ?, es_recurrente = ?, frecuencia = ?, fecha_hora = ?
       WHERE id = ? AND usuario_id = ?`,
      [
        req.body.monto,
        req.body.descripcion,
        req.body.categoria_id,
        req.body.metodo_pago_id || null,
        req.body.nota || null,
        req.body.es_recurrente ? 1 : 0,
        req.body.frecuencia || null,
        req.body.fecha_hora,
        req.params.id,
        req.user.id,
      ]
    );

    await conn.query("DELETE FROM gasto_etiquetas WHERE gasto_id = ?", [req.params.id]);
    if (etiquetas.length) {
      await conn.query(
        "INSERT INTO gasto_etiquetas (gasto_id, etiqueta_id) VALUES ?",
        [etiquetas.map((id) => [req.params.id, id])]
      );
    }

    const warning = await getBudgetWarning(conn, req.user.id, req.body.categoria_id, req.body.fecha_hora);
    await conn.commit();
    res.json({ ok: true, ...warning });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

app.delete("/api/gastos/:id", async (req, res) => {
  const [result] = await pool.query("DELETE FROM gastos WHERE id = ? AND usuario_id = ?", [req.params.id, req.user.id]);
  res.json({ ok: result.affectedRows > 0 });
});

app.get("/api/reportes/total-mes", async (req, res) => {
  const mes = req.query.mes || currentMonth();
  const [rows] = await pool.query(
    "SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE usuario_id = ? AND DATE_FORMAT(fecha_hora, '%Y-%m') = ?",
    [req.user.id, mes]
  );
  res.json({ total: Number(rows[0].total) });
});

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}/api`);
});
