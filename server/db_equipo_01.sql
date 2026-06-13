-- ==========================================
-- BASE DE DATOS: Control de Gastos Personales
-- ==========================================

CREATE DATABASE IF NOT EXISTS db_equipo_01;
USE db_equipo_01;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS gasto_etiquetas;
DROP TABLE IF EXISTS gastos;
DROP TABLE IF EXISTS etiquetas;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS metodos_pago;
DROP TABLE IF EXISTS presupuestos;
DROP TABLE IF EXISTS usuarios;

SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================
-- USUARIOS
-- ==========================================
CREATE TABLE usuarios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- MÉTODOS DE PAGO
-- ==========================================
CREATE TABLE metodos_pago (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- CATEGORÍAS
-- ==========================================
CREATE TABLE categorias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  usuario_id INT UNSIGNED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (usuario_id, nombre),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- ETIQUETAS
-- ==========================================
CREATE TABLE etiquetas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  usuario_id INT UNSIGNED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (usuario_id, nombre),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- PRESUPUESTOS (NUEVO)
-- ==========================================
CREATE TABLE presupuestos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  categoria_id INT UNSIGNED,
  monto_limite DECIMAL(12,2) NOT NULL,
  mes CHAR(7) NOT NULL,
  UNIQUE (usuario_id, categoria_id, mes),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- GASTOS
-- ==========================================
CREATE TABLE gastos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  monto DECIMAL(12,2) NOT NULL,
  descripcion TEXT NOT NULL,
  categoria_id INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  metodo_pago_id INT UNSIGNED,
  nota TEXT,
  es_recurrente TINYINT(1) DEFAULT 0,
  frecuencia ENUM('diario','semanal','mensual','anual') NULL,
  fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- RELACIÓN GASTOS - ETIQUETAS
-- ==========================================
CREATE TABLE gasto_etiquetas (
  gasto_id INT UNSIGNED NOT NULL,
  etiqueta_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (gasto_id, etiqueta_id),
  FOREIGN KEY (gasto_id) REFERENCES gastos(id) ON DELETE CASCADE,
  FOREIGN KEY (etiqueta_id) REFERENCES etiquetas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- ÍNDICES
-- ==========================================
CREATE INDEX idx_gastos_categoria ON gastos(categoria_id);
CREATE INDEX idx_gastos_usuario ON gastos(usuario_id);
CREATE INDEX idx_gastos_fecha ON gastos(fecha_hora);

-- ==========================================
-- SEEDS
-- ==========================================
INSERT INTO metodos_pago (nombre) VALUES
  ('Efectivo'),
  ('Tarjeta'),
  ('Transferencia')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

INSERT INTO categorias (nombre, usuario_id) VALUES
  ('Alimentos', NULL),
  ('Transporte', NULL),
  ('Servicios', NULL),
  ('Salud', NULL),
  ('Entretenimiento', NULL);

INSERT INTO etiquetas (nombre, usuario_id) VALUES
  ('Necesario', NULL),
  ('Opcional', NULL),
  ('Trabajo', NULL),
  ('Casa', NULL);
