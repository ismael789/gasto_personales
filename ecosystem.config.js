export default {
  apps: [
    {
      name: "equipo_01-api",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
  ],
};
