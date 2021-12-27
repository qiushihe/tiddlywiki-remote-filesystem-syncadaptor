module.exports = {
  plugins: [
    ["./babel/preserve-comment-header.plugin.js", { pattern: "$:/plugins" }]
  ],
  presets: [
    "@babel/preset-env",
    "@babel/preset-typescript"
  ]
};
