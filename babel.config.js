module.exports = {
  plugins: [
    ["./babel/preserve-comment-header.plugin.js", { pattern: "$:/plugins" }],
    [
      "transform-async-to-promises",
      { hoist: false, inlineHelpers: false, externalHelpers: false }
    ]
  ],
  presets: ["@babel/preset-env", "@babel/preset-typescript"]
};
