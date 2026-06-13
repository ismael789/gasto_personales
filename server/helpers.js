export function toInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export async function attachTags(conn, gastos) {
  if (!gastos.length) return gastos;

  const ids = gastos.map((gasto) => gasto.id);
  const [rows] = await conn.query(
    `SELECT ge.gasto_id, e.id, e.nombre
     FROM gasto_etiquetas ge
     INNER JOIN etiquetas e ON e.id = ge.etiqueta_id
     WHERE ge.gasto_id IN (?)`,
    [ids]
  );

  const byGasto = new Map();
  rows.forEach((row) => {
    const lista = byGasto.get(row.gasto_id) || [];
    lista.push({ id: row.id, nombre: row.nombre });
    byGasto.set(row.gasto_id, lista);
  });

  return gastos.map((gasto) => ({
    ...gasto,
    etiquetas: byGasto.get(gasto.id) || [],
  }));
}

export async function validateUserCategory(conn, categoriaId, usuarioId) {
  const [rows] = await conn.query(
    "SELECT id FROM categorias WHERE id = ? AND (usuario_id = ? OR usuario_id IS NULL)",
    [categoriaId, usuarioId]
  );
  return rows.length > 0;
}

export async function validateUserTags(conn, tagIds, usuarioId) {
  if (!tagIds.length) return true;

  const [rows] = await conn.query(
    "SELECT id FROM etiquetas WHERE id IN (?) AND (usuario_id = ? OR usuario_id IS NULL)",
    [tagIds, usuarioId]
  );
  return rows.length === new Set(tagIds).size;
}

export async function getBudgetWarning(conn, usuarioId, categoriaId, fechaHora) {
  const mes = String(fechaHora || new Date().toISOString()).slice(0, 7);
  const [presupuestos] = await conn.query(
    `SELECT id, monto_limite
     FROM presupuestos
     WHERE usuario_id = ? AND categoria_id = ? AND mes = ?
     LIMIT 1`,
    [usuarioId, categoriaId, mes]
  );

  if (!presupuestos.length) return {};

  const limite = Number(presupuestos[0].monto_limite);
  const [totales] = await conn.query(
    `SELECT COALESCE(SUM(monto), 0) AS total
     FROM gastos
     WHERE usuario_id = ? AND categoria_id = ? AND DATE_FORMAT(fecha_hora, '%Y-%m') = ?`,
    [usuarioId, categoriaId, mes]
  );
  const total = Number(totales[0].total);

  return {
    aviso_presupuesto: total > limite,
    total_mes_categoria: total,
    limite,
  };
}
