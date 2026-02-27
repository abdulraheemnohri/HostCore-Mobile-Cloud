module.exports = {
  apps : [{
    name   : "hostcore",
    script : "./server.js",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
}
