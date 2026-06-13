# Despliegue equipo_01

## 1. Preparar local

```bash
npm install
npm run build
```

## 2. Subir frontend

Desde CMD o PowerShell, en la raiz del proyecto:

```bash
scp -r dist\* equipo_01@2.25.174.243:/home/equipo_01/public/
```

## 3. Subir backend y SQL

```bash
scp -r server server.js package.json package-lock.json ecosystem.config.js db.sql .env.example equipo_01@2.25.174.243:/home/equipo_01/app/
```

## 4. Configurar servidor

```bash
ssh equipo_01@2.25.174.243
cd ~/app
cp .env.example .env
nano .env
```

Valores recomendados en `.env`:

```env
PORT=5000
MYSQL_HOST=localhost
MYSQL_USER=equipo_01
MYSQL_PASS=TU_PASSWORD_MYSQL
MYSQL_DB=db_equipo_01
JWT_SECRET=CAMBIA_ESTE_SECRETO_LARGO
CORS_ORIGIN=http://2.25.174.243
```

## 5. Importar base de datos

```bash
mysql -u equipo_01 -p db_equipo_01 < ~/app/db.sql
```

## 6. Instalar y arrancar API

```bash
npm install --omit=dev
pm2 start ecosystem.config.js
pm2 save
```

## 7. Verificar

Frontend:

```text
http://2.25.174.243/equipo_01/
```

API:

```text
http://2.25.174.243/equipo_01/api/health
```

Si `/equipo_01/api/health` no responde desde el navegador, falta configurar el proxy del servidor web para enviar `/equipo_01/api` hacia `http://localhost:5000/api`.
