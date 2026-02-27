module.exports = {
  apps : [{
    name   : "hostcore",
    script : "./server.js",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH
    }
  }]
}
